import { formatGap } from './race.js';
import { DRIVER_BIOGRAPHIES, driverAgeAt } from './driver-biographies.js';

const TEAM_LOGOS = {
  Mercedes: 'mercedes', Ferrari: 'ferrari', McLaren: 'mclaren',
  'Aston Martin': 'astonmartin', Alpine: 'alpine', 'Haas F1 Team': 'haasf1team',
  Williams: 'williams', 'Red Bull Racing': 'redbullracing',
  'Racing Bulls': 'racingbulls', 'Kick Sauber': 'kicksauber',
  Audi: 'audi', Cadillac: 'cadillac',
};

export function createDriverPortrait(image, initials) {
  const base = import.meta.env.VITE_DRIVER_PORTRAITS_URL?.replace(/\/+$/, '');
  let selectedCode;
  image.addEventListener('load', () => { if (image.naturalWidth) image.classList.add('ready'); });
  image.addEventListener('error', () => image.classList.remove('ready'));
  return driver => {
    if (driver.code === selectedCode) return;
    selectedCode = driver.code;
    initials.textContent = driver.name.split(' ').map(part => part[0]).filter((_, i, parts) => i === 0 || i === parts.length - 1).join('');
    image.classList.remove('ready');
    if (base) image.src = `${base}/${driver.code}.png`;
    else image.removeAttribute('src');
    if (image.complete && image.naturalWidth) image.classList.add('ready');
  };
}

export function formatDriverGap(driver) {
  const text = formatGap(driver.gap, driver.position);
  return typeof driver.gap === 'number' && driver.position !== 1 ? `${text}s` : text;
}

export function createTelemetryProfile(raceDate, year) {
  const card = document.getElementById('telemetry-profile');
  const updatePortrait = createDriverPortrait(card.querySelector('.telemetry-portrait img'), card.querySelector('.driver-initials'));
  const name = card.querySelector('.telemetry-driver-name');
  const position = card.querySelector('.telemetry-driver-position');
  const gap = card.querySelector('.telemetry-driver-gap');
  const age = card.querySelector('.telemetry-driver-age');
  const description = card.querySelector('.telemetry-driver-description');
  const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${raceDate}T00:00:00Z`));
  const logo = card.querySelector('.telemetry-team-logo img');
  const badge = card.querySelector('.telemetry-team-logo');
  logo.addEventListener('load', () => badge.classList.add('ready'));
  logo.addEventListener('error', () => badge.classList.remove('ready'));
  let selectedCode;
  return driver => {
    if (driver.code !== selectedCode) {
      selectedCode = driver.code;card.dataset.driver = driver.code;
      card.style.setProperty('--team', driver.color);
      card.setAttribute('aria-label', `${driver.name}, ${driver.team}`);
      name.textContent = driver.name;
      const biography = DRIVER_BIOGRAPHIES[driver.code];
      const years = driverAgeAt(biography.born, raceDate);
      age.textContent = `AGE ${years}`;
      age.title = `Age at the ${dateLabel} Singapore Grand Prix`;
      age.setAttribute('aria-label', `${years} years old at the ${dateLabel} Singapore Grand Prix`);
      description.textContent = biography.description;
      updatePortrait(driver);
      const slug = TEAM_LOGOS[driver.team];
      badge.classList.remove('ready');badge.title = driver.team;
      badge.querySelector('span').textContent = driver.team[0];
      logo.alt = `${driver.team} logo`;
      logo.src = `https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/common/f1/${year}/${slug}/${year}${slug}logowhite.webp`;
      if (logo.complete && logo.naturalWidth) badge.classList.add('ready');
    }
    position.textContent = driver.position === null ? 'P —' : `P${String(driver.position).padStart(2, '0')}`;
    gap.textContent = formatDriverGap(driver);
    gap.title = driver.position === 1 ? 'Race leader' : 'Gap to leader';
  };
}
