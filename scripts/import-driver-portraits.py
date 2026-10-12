"""Bundle Formula 1 headshots referenced by the historical OpenF1 driver records."""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import re
import struct
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
metadata = ROOT / '.cache/openf1/drivers-session_key_11388.json'
if metadata.exists():
    drivers = json.loads(metadata.read_text())
else:
    with urllib.request.urlopen('https://api.openf1.org/v1/drivers?session_key=11388', timeout=60) as response:
        drivers = json.load(response)

target = ROOT / 'assets/driver-portraits'
target.mkdir(parents=True, exist_ok=True)
def download(driver):
    code = driver['name_acronym']
    slug = f"{driver['first_name']}-{driver['last_name']}".lower().replace(' ', '-')
    profile_url = f'https://www.formula1.com/en/drivers/{slug}'
    with urllib.request.urlopen(profile_url, timeout=45) as response:
        profile = response.read().decode()
    key = re.search(r'/([a-z0-9]+)\.png\.transform', driver['headshot_url']).group(1)
    urls = re.findall(r'https://media\.formula1\.com/image/upload/[^"<>\s\\]+/common/f1/2026/[^"<>\s\\]+right\.webp', profile)
    url = next(url for url in urls if f'/{key}/' in url)
    url = re.sub(r'c_fill,w_\d+', 'c_fill,w_192,h_208,g_north', url).replace('/q_auto/', '/f_png/q_auto/')
    request = urllib.request.Request(url, headers={'User-Agent': 'SG-Grand-Prix-dashboard/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{code}: source did not return a PNG')
    width, height = struct.unpack('>II', data[16:24])
    (target / f'{code}.png').write_bytes(data)
    print(f'{code}: {width}x{height}, {len(data):,} bytes', flush=True)
    return {
        'code': code, 'name': driver['full_name'], 'file': f'{code}.png',
        'sourceUrl': url, 'width': width, 'height': height,
        'profileUrl': profile_url,
        'sha256': hashlib.sha256(data).hexdigest(),
    }


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    portraits = list(pool.map(download, drivers))

(ROOT / 'public/data/driver-portrait-sources.json').write_text(json.dumps({
    'source': 'Official 2026 Formula 1 driver profile portraits; roster from OpenF1 session 11388',
    'metadataUrl': 'https://api.openf1.org/v1/drivers?session_key=11388',
    'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'note': 'Driver photographs belong to their respective rights holders. They are not covered by the car model CC0 license.',
    'portraits': portraits,
}, indent=2) + '\n')
