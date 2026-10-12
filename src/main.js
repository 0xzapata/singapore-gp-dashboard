import './styles.css';
import { createRace, loadArchive, formatElapsed, formatLap, formatGap } from './race.js';
import { createCircuitScene } from './scene.js';
import { createCharts } from './charts.js';
import { createTelemetry } from './telemetry.js';
import { createLoadingScreen } from './loading.js';
import { createTelemetryProfile } from './driver-profile.js';
import { renderNews } from './news-feed.js';

const $ = id => document.getElementById(id);
const loading = createLoadingScreen();
renderNews();

$('about').addEventListener('click', () => $('sources-dialog').showModal());
$('close-dialog').addEventListener('click', () => $('sources-dialog').close());
$('sources-dialog').addEventListener('click', event => {
  if (event.target !== $('sources-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});

const singaporeClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
function updateClock() {
  $('clock').textContent = singaporeClock.format(new Date());
}
updateClock();setInterval(updateClock, 1000);

async function start() {
  loading.stage(.08, 'Loading recorded 2026 race data');
  const race = createRace(await loadArchive());
  loading.stage(.4, 'Preparing timing and telemetry');
  const charts = createCharts();
  const telemetry = createTelemetry();
  const updateProfile = createTelemetryProfile(race.archive.date, race.archive.year);
  const rows = new Map();
  let circuitScene, currentView = 'orbit';
  for (const driver of race.drivers) {
    const button = document.createElement('button');button.type = 'button';button.className = 'driver-row';
    button.style.setProperty('--team', driver.color);button.setAttribute('aria-label', `Select ${driver.name}`);
    button.innerHTML = '<span class="pos"></span><span class="team-bar"></span><span class="driver-code"><span></span><small></small></span><span class="gap"></span><span class="tyre"></span>';
    button.querySelector('.driver-code > span').textContent = driver.code;
    button.querySelector('small').textContent = driver.team.toUpperCase();
    button.addEventListener('click', () => { race.select(driver.code);updateDom(race.snapshot()); });
    $('timing').append(button);rows.set(driver.code, button);
  }

  function updateDom(state) {
    $('lap').textContent = state.lap;$('elapsed').textContent = formatElapsed(state.elapsed);
    $('play').innerHTML = state.playing ? 'Ⅱ <span>PAUSE</span>' : '▷ <span>PLAY</span>';
    $('play').setAttribute('aria-label', state.playing ? 'Pause historical replay' : 'Play historical replay');
    updateProfile(state.selected);
    for (const car of state.cars) {
      const row = rows.get(car.code);row.style.order = car.position ?? 99;
      row.classList.toggle('selected', car.code === state.selected.code);row.setAttribute('aria-pressed', String(car.code === state.selected.code));
      row.querySelector('.pos').textContent = car.position ? String(car.position).padStart(2, '0') : '—';
      row.querySelector('.gap').textContent = formatGap(car.gap, car.position);
      const tyre = row.querySelector('.tyre');tyre.textContent = car.tyre;tyre.title = car.compound;
      tyre.className = `tyre ${car.compound.toLowerCase()}`;
    }
    telemetry.update(state.telemetry);
    state.selected.lapRecord.sectors.forEach((value, i) => { $(`sector-${i + 1}`).textContent = value === null ? '—' : value.toFixed(3); });
    $('lap-time').textContent = formatLap(state.selected.lapRecord.duration);
    $('timeline').value = Math.round(state.progress * 1000);$('timeline').style.setProperty('--progress', `${state.progress * 100}%`);
    $('timeline-time').textContent = state.finished ? 'FINAL CLASSIFICATION' : `LAP ${state.lap} / ${race.archive.raceLaps}`;
  }

  $('play').addEventListener('click', () => updateDom(race.toggle()));
  $('restart').addEventListener('click', () => updateDom(race.restart()));
  document.querySelectorAll('[data-rate]').forEach(button => button.addEventListener('click', () => {
    race.setRate(Number(button.dataset.rate));
    document.querySelectorAll('[data-rate]').forEach(item => { item.classList.toggle('active', item === button);item.setAttribute('aria-pressed', String(item === button)); });
  }));
  $('timeline').addEventListener('input', event => updateDom(race.seek(Number(event.target.value) / 1000)));
  function setView(view) {
    currentView = view;
    circuitScene?.setView(view);
    document.querySelector('.circuit-panel').classList.toggle('car-view', view === 'car');
    for (const mode of ['orbit', 'top', 'car']) {
      $(`${mode}-view`).classList.toggle('active', view === mode);$(`${mode}-view`).setAttribute('aria-pressed', String(view === mode));
    }
  }
  $('orbit-view').addEventListener('click', () => setView('orbit'));
  $('top-view').addEventListener('click', () => setView('top'));
  $('car-view').addEventListener('click', () => setView('car'));
  $('reset-view').addEventListener('click', () => setView('orbit'));
  $('city-toggle').addEventListener('change', event => circuitScene?.setCity(event.target.checked));

  updateDom(race.snapshot());
  loading.stage(.6, 'Reconstructing Marina Bay');
  try {
    const [geo, streets] = await Promise.all(['singapore.geojson', 'marina-bay-roads.geojson'].map(async filename => {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${filename}`);
      if (!response.ok) throw new Error(`Map data returned ${response.status}`);
      return response.json();
    }));
    loading.stage(.75, 'Preparing the cars and holographic city');
    circuitScene = await createCircuitScene($('scene'), $('scene-hud'), geo.features[0].geometry.coordinates, race.drivers, streets);
    setView(currentView);
    circuitScene.setCity($('city-toggle').checked);
    $('render-status').textContent = `${circuitScene.pointCount.toLocaleString()} POINTS / WEBGL`;
  } catch (error) {
    console.error(error);$('render-status').textContent = '3D VIEW UNAVAILABLE';
    const message = document.createElement('div');message.className = 'scene-error';
    message.textContent = 'The 3D view could not initialize.';
    const detail = document.createElement('small');detail.textContent = 'Enable browser hardware acceleration and reload. Historical timing and telemetry remain available.';
    message.append(detail);$('scene').append(message);
  }

  let previous = performance.now(), lastDom = 0, lastChart = 0;
  function frame(now) {
    const dt = Math.max(0, (now - previous) / 1000);previous = now;
    const state = race.advance(document.hidden ? 0 : dt);
    telemetry.frame(state.telemetry, document.hidden ? 0 : dt);
    circuitScene?.frame(now / 1000, state);
    if (now - lastChart > 50) { charts.frame(now / 1000, state);lastChart = now; }
    if (now - lastDom > 120) { updateDom(state);lastDom = now; }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { previous = performance.now(); });
  document.querySelectorAll('.playback button, #timeline').forEach(control => { control.disabled = false; });
  loading.stage(.95, 'Focusing the circuit');
  requestAnimationFrame(frame);
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  loading.finish();
}

start().catch(error => {
  console.error(error);
  loading.fail('The race archive could not load. Retry to reconnect.');
  $('timeline-time').textContent = 'ARCHIVE UNAVAILABLE / RELOAD TO RETRY';
  $('render-status').textContent = 'HISTORICAL DATA UNAVAILABLE';
  const message = document.createElement('div');message.className = 'scene-error';
  message.textContent = 'The 2026 race archive could not load. Reload to retry.';$('scene').append(message);
});
