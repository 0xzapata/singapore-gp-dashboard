import { createDriverPortrait, formatDriverGap } from './driver-profile.js';
import { placeDriverCard } from './driver-card-position.js';

export function createDriverCard(container) {
  const card = document.createElement('div');
  card.className = 'panel driver-tracking-card';card.hidden = true;
  card.setAttribute('role', 'group');card.setAttribute('aria-label', 'Selected driver');
  card.innerHTML = '<div class="driver-portrait"><span class="driver-initials" aria-hidden="true"></span><img alt="" decoding="async" /></div><div class="driver-card-details"><span class="driver-card-name"></span><span class="driver-card-team"></span><div class="driver-card-metrics"><span class="driver-card-position"></span><span class="driver-card-gap"></span></div></div>';
  container.append(card);
  const portrait = card.querySelector('img');
  const initials = card.querySelector('.driver-initials');
  const name = card.querySelector('.driver-card-name'), team = card.querySelector('.driver-card-team');
  const position = card.querySelector('.driver-card-position'), gap = card.querySelector('.driver-card-gap');
  const updatePortrait = createDriverPortrait(portrait, initials);
  const details = card.querySelector('.driver-card-details');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selectedCode, location;
  let topInset = 156;
  let bottomInset = 108;

  function write(node, value) { if (node.textContent !== value) node.textContent = value; }

  return {
    resize() {
      const bounds = container.getBoundingClientRect();
      topInset = Math.max(...['.scene-title', '.view-controls'].map(selector =>
        container.querySelector(selector).getBoundingClientRect().bottom - bounds.top
      )) + 12;
      bottomInset = bounds.bottom - container.querySelector('.scene-bottom').getBoundingClientRect().top + 12;
    },
    frame(driver, point, viewport, view, seconds) {
      if (driver.code !== selectedCode) {
        selectedCode = driver.code;card.dataset.driver = driver.code;
        card.style.setProperty('--team', driver.color);
        name.textContent = driver.name;team.textContent = driver.team;
        updatePortrait(driver);
      }
      write(position, driver.position === null ? 'P —' : `P${String(driver.position).padStart(2, '0')}`);
      write(gap, formatDriverGap(driver));
      gap.title = driver.position === 1 ? 'Race leader' : 'Gap to leader';
      const size = { width: card.offsetWidth, height: card.offsetHeight };
      const placement = view !== 'car' ? placeDriverCard(point, viewport, size, topInset, bottomInset, view === 'orbit') : null;
      card.hidden = !placement;
      if (!placement) { location = undefined;return; }
      card.classList.toggle('compact', placement.compact);
      details.setAttribute('aria-hidden', String(placement.compact));
      card.dataset.state = placement.compact ? 'offscreen' : 'tracking';
      const response = reducedMotion.matches || !location ? 1 : 1 - Math.exp(-seconds / .08);
      location = {
        x: Math.max(12, Math.min(viewport.width - size.width - 12, location ? location.x + (placement.x - location.x) * response : placement.x)),
        y: Math.max(topInset, Math.min(viewport.height - bottomInset - size.height, location ? location.y + (placement.y - location.y) * response : placement.y)),
      };
      card.style.transform = `translate3d(clamp(12px,${location.x}px,calc(${viewport.width - 12}px - 100%)),clamp(${topInset}px,${location.y}px,calc(${viewport.height - bottomInset}px - 100%)),0)`;
    },
    hide() { card.hidden = true;location = undefined; },
    dispose() { card.remove(); },
  };
}
