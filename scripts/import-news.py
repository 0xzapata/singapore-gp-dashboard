"""Bundle verified post-race Formula 1 headlines, with no runtime news API."""
import datetime
import html
import json
import pathlib
import re
import urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://www.formula1.com'
YEAR = 2026


class ArticleLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        href = dict(attrs).get('href', '')
        if tag == 'a' and href.startswith('/en/latest/article/') and 'singapore' in href.lower():
            if href not in self.links:
                self.links.append(href)


class ArticleMeta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('property') in ['og:title', 'og:description']:
            self.values[attrs['property']] = html.unescape(attrs['content'])


def download(path):
    request = urllib.request.Request(BASE + path, headers={'User-Agent': 'SG-Grand-Prix-Dashboard/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode()


hub = ArticleLinks()
hub.feed(download(f'/en/racing/{YEAR}/singapore'))
latest = ArticleLinks()
latest.feed(download('/en/latest'))
report = next(path for path in hub.links if 'verstappen-seals-commanding' in path)
paths = [report] + [path for path in latest.links if path != report]
articles = []
for path in paths:
    if len(articles) == 9:
        break
    if any(word in path for word in ['betting', 'bet-builder', 'predictions', 'official-grid', 'live-coverage']):
        continue
    content = download(path)
    meta = ArticleMeta()
    meta.feed(content)
    dates = re.findall(r'"datePublished"\s*:\s*"([^"]+)"', content)
    if not dates or dates[0][:10] != '2026-10-11' or dates[0] < '2026-10-11T13:40':
        continue
    articles.append({
        'title': meta.values['og:title'], 'description': meta.values.get('og:description', ''),
        'url': BASE + path, 'publishedAt': dates[0], 'source': 'Formula 1',
    })
if len(articles) < 3:
    raise ValueError('Not enough verified post-race articles to publish the news panel')
target = ROOT / 'src/data/singapore-news.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({
    'event': '2026 Singapore Grand Prix',
    'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'sourceUrl': BASE + f'/en/racing/{YEAR}/singapore', 'articles': articles,
}, indent=2, ensure_ascii=False) + '\n')
print(f'Bundled {len(articles)} verified Formula 1 articles in {target}')
