"""Download an OpenStreetMap road extract around Marina Bay for outline rendering."""
import datetime
import json
import pathlib
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
coordinates = json.loads((ROOT / 'public/data/singapore.geojson').read_text())['features'][0]['geometry']['coordinates']
west = round(min(p[0] for p in coordinates) - .009, 6)
east = round(max(p[0] for p in coordinates) + .009, 6)
south = round(min(p[1] for p in coordinates) - .006, 6)
north = round(max(p[1] for p in coordinates) + .006, 6)
classes = 'motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service'
query = f'[out:json][timeout:60];way["highway"~"^({classes})$"]["tunnel"!="yes"]({south},{west},{north},{east});out geom;'
cache = ROOT / '.cache/osm/marina-bay-roads.json'
cache.parent.mkdir(parents=True, exist_ok=True)
if cache.exists():
    source = json.loads(cache.read_text())
else:
    error = None
    for endpoint in ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
        try:
            print(f'Fetching road geometry from {endpoint}', flush=True)
            request = urllib.request.Request(endpoint + '?' + urllib.parse.urlencode({'data': query}), headers={'User-Agent': 'SG-Grand-Prix-dashboard/1.0'})
            with urllib.request.urlopen(request, timeout=75) as response:
                source = json.load(response)
            if source.get('remark'):
                raise ValueError(source['remark'])
            cache.write_text(json.dumps(source, separators=(',', ':')))
            break
        except Exception as failure:
            error = failure
            print(f'Endpoint unavailable: {failure}', flush=True)
    else:
        endpoint = 'https://api.openstreetmap.org/api/0.6/map'
        print('Using the OpenStreetMap map API fallback', flush=True)
        xml_cache = cache.with_suffix('.osm')
        if not xml_cache.exists():
            request = urllib.request.Request(f'{endpoint}?bbox={west},{south},{east},{north}', headers={'User-Agent': 'SG-Grand-Prix-dashboard/1.0'})
            with urllib.request.urlopen(request, timeout=90) as response:
                xml_cache.write_bytes(response.read())
        root = ET.parse(xml_cache).getroot()
        nodes = {node.attrib['id']: {'lon': float(node.attrib['lon']), 'lat': float(node.attrib['lat'])} for node in root.findall('node')}
        ways = []
        for way in root.findall('way'):
            tags = {tag.attrib['k']: tag.attrib['v'] for tag in way.findall('tag')}
            if tags.get('highway') not in classes.split('|') or tags.get('tunnel') == 'yes':
                continue
            ways.append({'type': 'way', 'id': int(way.attrib['id']), 'tags': tags, 'geometry': [nodes[node.attrib['ref']] for node in way.findall('nd') if node.attrib['ref'] in nodes]})
        source = {'elements': ways, 'downloadSource': endpoint, 'downloadedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
        cache.write_text(json.dumps(source, separators=(',', ':')))


def clip_segment(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    start, end = 0., 1.
    for p, q in [(-dx, a[0] - west), (dx, east - a[0]), (-dy, a[1] - south), (dy, north - a[1])]:
        if p == 0:
            if q < 0:
                return None
            continue
        fraction = q / p
        if p < 0:
            start = max(start, fraction)
        else:
            end = min(end, fraction)
        if start > end:
            return None
    return [
        [round(a[0] + dx * start, 7), round(a[1] + dy * start, 7)],
        [round(a[0] + dx * end, 7), round(a[1] + dy * end, 7)],
    ]


features = []
for way in sorted(source['elements'], key=lambda item: item['id']):
    tags = way.get('tags', {})
    if way['type'] != 'way' or tags.get('location') == 'underground':
        continue
    geometry = [[p['lon'], p['lat']] for p in way.get('geometry', [])]
    parts, current = [], []
    for a, b in zip(geometry, geometry[1:]):
        clipped = clip_segment(a, b)
        if not clipped or clipped[0] == clipped[1]:
            if len(current) > 1:
                parts.append(current)
            current = []
            continue
        if current and current[-1] != clipped[0]:
            parts.append(current)
            current = []
        if not current:
            current.append(clipped[0])
        current.append(clipped[1])
    if len(current) > 1:
        parts.append(current)
    for index, part in enumerate(parts):
        features.append({
            'type': 'Feature', 'id': f"way/{way['id']}/{index}",
            'properties': {'osmId': way['id'], **{key: tags[key] for key in ['name', 'highway', 'width', 'lanes', 'oneway', 'bridge', 'layer', 'junction'] if key in tags}},
            'geometry': {'type': 'LineString', 'coordinates': part},
        })

if not features:
    raise ValueError('The road extract is empty.')
data = {
    'type': 'FeatureCollection', 'bbox': [west, south, east, north],
    'metadata': {
        'source': 'OpenStreetMap', 'attribution': '© OpenStreetMap contributors',
        'sourceUrl': 'https://www.openstreetmap.org/copyright',
        'license': 'ODbL 1.0', 'licenseUrl': 'https://opendatacommons.org/licenses/odbl/1-0/',
        'osmBaseTimestamp': source.get('osm3s', {}).get('timestamp_osm_base'),
        'downloadSource': source.get('downloadSource', 'https://overpass-api.de/api/interpreter'),
        'downloadedAt': source.get('downloadedAt'),
        'query': query,
        'note': 'Recorded road centerlines. Road-edge widths are estimated from width or lane tags and road class. Underground roads and footpaths are omitted. Circuit overlaps are masked by the renderer.',
    },
    'features': features,
}
target = ROOT / 'public/data/marina-bay-roads.geojson'
target.write_text(json.dumps(data, separators=(',', ':')) + '\n')
print(f'Saved {len(features)} road polylines, {target.stat().st_size:,} bytes, OSM snapshot {data["metadata"]["osmBaseTimestamp"]}', flush=True)
