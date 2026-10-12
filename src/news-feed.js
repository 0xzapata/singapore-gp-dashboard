import news from './data/singapore-news.json';

export function renderNews() {
  const list = document.getElementById('news-list');
  const dateFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  list.replaceChildren(...news.articles.map(article => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = article.url;link.target = '_blank';link.rel = 'noreferrer';link.title = article.description;
    const meta = document.createElement('span');meta.className = 'news-meta';
    const source = document.createElement('span');source.textContent = 'F1.COM';
    const date = document.createElement('time');date.dateTime = article.publishedAt;
    date.textContent = `${dateFormat.format(new Date(article.publishedAt)).toUpperCase()} SGT`;
    meta.append(source, date);
    const title = document.createElement('span');title.className = 'news-headline';title.textContent = article.title;
    const arrow = document.createElement('span');arrow.className = 'news-arrow';arrow.textContent = '↗';arrow.setAttribute('aria-hidden', 'true');
    link.append(meta, title, arrow);item.append(link);return item;
  }));
  document.getElementById('news-note').title = `News snapshot retrieved ${dateFormat.format(new Date(news.retrievedAt))} SGT`;
}
