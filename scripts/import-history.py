"""Fetch a completed Singapore Grand Prix into a static replay archive."""
import argparse
import concurrent.futures
import datetime
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache' / 'openf1'
CACHE.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--year', type=int, default=2026)
parser.add_argument('--session', type=int, default=11388)
args = parser.parse_args()
SESSION = args.session
BASE = 'https://api.openf1.org/v1/'


def fetch(endpoint, **query):
    query = {'session_key': SESSION, **query}
    path = CACHE / (endpoint + '-' + '-'.join(f'{k}_{v}' for k, v in query.items()) + '.json')
    if path.exists():
        return json.loads(path.read_text())
    url = BASE + endpoint + '?' + urllib.parse.urlencode(query)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                data = json.load(response)
            path.write_text(json.dumps(data, separators=(',', ':')))
            print(f'Fetched {endpoint}: {len(data)} records', flush=True)
            return data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            if attempt == 4:
                raise
            print(f'Retrying {endpoint}: {error}', flush=True)
            time.sleep(2 ** attempt)


def timestamp(value):
    return datetime.datetime.fromisoformat(value).timestamp()


session = fetch('sessions')[0]
if session['year'] != args.year or session['country_name'] != 'Singapore' or session['session_name'] != 'Race':
    raise ValueError('The requested session is not the selected Singapore Grand Prix')
if timestamp(session['date_end']) > datetime.datetime.now(datetime.timezone.utc).timestamp():
    raise ValueError('Import only after the race has concluded')
date = session['date_start'][:10]
with urllib.request.urlopen(f'https://api.jolpi.ca/ergast/f1/{args.year}/races.json?limit=100', timeout=45) as response:
    calendar = json.load(response)['MRData']['RaceTable']['Races']
event = next(race for race in calendar if race['date'] == date and race['Circuit']['circuitId'] == 'marina_bay')
classification_url = f"https://api.jolpi.ca/ergast/f1/{args.year}/{event['round']}/results.json?limit=100"
with urllib.request.urlopen(classification_url, timeout=45) as response:
    classification = json.load(response)['MRData']['RaceTable']['Races'][0]['Results']
official = {int(result['number']): result for result in classification}
winner_time = int(classification[0]['Time']['millis']) / 1000
race_laps = int(classification[0]['laps'])
drivers = fetch('drivers')
if {driver['driver_number'] for driver in drivers} != set(official):
    raise ValueError('Driver records do not match the published classification')
laps = fetch('laps')
positions = fetch('position')
intervals = fetch('intervals')
stints = fetch('stints')
results = fetch('session_result')
controls = fetch('race_control')
first_laps = [lap for lap in laps if lap['lap_number'] == 1 and lap['date_start']]
origin = min(timestamp(lap['date_start']) for lap in first_laps)


def offset(date):
    return round(timestamp(date) - origin, 3)


def driver_archive(driver):
    number = driver['driver_number']
    telemetry = fetch('car_data', driver_number=number)
    samples = []
    previous_second = None
    for sample in sorted(telemetry, key=lambda item: item['date']):
        at = offset(sample['date'])
        if at < 0:
            continue
        second = int(at)
        if second == previous_second:
            continue
        previous_second = second
        samples.append([at, sample.get('speed'), sample.get('n_gear'), sample.get('throttle'), sample.get('brake'), sample.get('drs')])
    driver_laps = []
    for lap in sorted((item for item in laps if item['driver_number'] == number), key=lambda item: item['lap_number']):
        if not lap['date_start']:
            continue
        driver_laps.append({
            'number': lap['lap_number'], 'start': offset(lap['date_start']),
            'duration': lap['lap_duration'],
            'sectors': [lap['duration_sector_1'], lap['duration_sector_2'], lap['duration_sector_3']],
            'pitOut': lap['is_pit_out_lap'],
        })
    result = next(item for item in results if item['driver_number'] == number)
    classified = official[number]
    completed_laps = int(classified['laps'])
    retired = bool(result['dnf']) or classified['status'] == 'Retired'
    result = {key: result.get(key) for key in ['position', 'number_of_laps', 'points', 'dnf', 'dns', 'dsq', 'duration', 'gap_to_leader']}
    result.update(position=int(classified['position']), number_of_laps=completed_laps,
                  points=float(classified['points']), dnf=retired)
    if retired:
        result['gap_to_leader'] = 'DNF'
    elif completed_laps < race_laps:
        behind = race_laps - completed_laps
        result['gap_to_leader'] = f"+{behind} LAP{'S' if behind != 1 else ''}"
    elif 'Time' in classified:
        result['duration'] = int(classified['Time']['millis']) / 1000
        result['gap_to_leader'] = round(result['duration'] - winner_time, 3)
    retired_at = max((sample[0] for sample in samples if sample[1] and sample[1] > 0), default=driver_laps[-1]['start']) if retired else None
    return {
        'number': number, 'code': driver['name_acronym'],
        'name': f"{driver['first_name']} {driver['last_name']}",
        'team': driver['team_name'], 'color': '#' + driver['team_colour'],
        'laps': driver_laps, 'telemetry': samples,
        'positions': sorted([[offset(item['date']), item['position']] for item in positions if item['driver_number'] == number]),
        'intervals': sorted([[offset(item['date']), item['gap_to_leader'], item['interval']] for item in intervals if item['driver_number'] == number]),
        'stints': [{ 'start': item['lap_start'], 'end': item['lap_end'], 'compound': item['compound'] } for item in stints if item['driver_number'] == number],
        'result': result, 'retiredAt': retired_at,
    }


with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    history_drivers = list(pool.map(driver_archive, drivers))
history_drivers.sort(key=lambda driver: driver['result']['position'])
duration = max(lap['start'] + lap['duration'] for driver in history_drivers for lap in driver['laps'] if lap['duration'])
for driver in history_drivers:
    driver['telemetry'] = [sample for sample in driver['telemetry'] if sample[0] <= duration]

archive = {
    'year': args.year, 'race': 'Singapore Grand Prix', 'sessionKey': SESSION,
    'date': date, 'start': datetime.datetime.fromtimestamp(origin, datetime.timezone.utc).isoformat(),
    'duration': round(duration, 3), 'raceLaps': race_laps, 'driverCount': len(history_drivers),
    'source': 'OpenF1', 'sourceUrl': 'https://openf1.org/',
    'classificationSourceUrl': classification_url,
    'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'sampleIntervalSeconds': 1,
    'drivers': history_drivers,
    'events': sorted([{'at': offset(item['date']), 'message': item['message'], 'flag': item['flag']} for item in controls if 0 <= offset(item['date']) <= duration], key=lambda item: item['at']),
}
target = ROOT / 'public' / 'data' / f'singapore-{args.year}.json'
target.write_text(json.dumps(archive, separators=(',', ':')))
print(f'Saved {target}: {target.stat().st_size:,} bytes, {len(history_drivers)} drivers, {duration:.3f} seconds', flush=True)
