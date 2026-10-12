import { speedChartCursor } from './speed-chart.js';
import { createGearMarkers } from './gear-markers.js';

const AMBER = '#ffad66';
function surface(canvas) {
  const ctx = canvas.getContext('2d');
  return () => {
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);ctx.clearRect(0, 0, width, height);
    return { ctx, w: width, h: height };
  };
}

export function createCharts() {
  const speedCanvas = document.getElementById('speed-chart');
  const speed = surface(speedCanvas);
  const markers = createGearMarkers(speedCanvas);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ring = surface(document.getElementById('lap-ring'));
  const sectors = surface(document.getElementById('sector-chart'));

  function drawSpeed(t, state) {
    const { ctx, w, h } = speed();
    const x = f => 23 + f * (w - 28), y = s => h - 6 - (s / 340) * (h - 14);
    ctx.font = '5px Plex, monospace';ctx.fillStyle = '#626d77';ctx.strokeStyle = '#ffffff0c';ctx.lineWidth = .6;
    for (const value of [100, 200, 300]) {
      ctx.fillText(String(value), 0, y(value) + 2);ctx.beginPath();ctx.moveTo(23, y(value));ctx.lineTo(w, y(value));ctx.stroke();
    }
    ctx.beginPath();
    let previous;
    for (const sample of state.lapSamples) {
      const px = x(sample.fraction), py = y(sample.speed);
      if (!previous || sample.at - previous.at > 2.5) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      previous = sample;
    }
    ctx.strokeStyle = '#bd8b62';ctx.lineWidth = .8;ctx.stroke();
    markers.update(state, w, h);
    const cursor = speedChartCursor(state.lapSamples, state.elapsed, state.selected.lapRecord, state.selected.finished);
    const position = x(cursor.fraction);ctx.strokeStyle = '#ffad6655';ctx.setLineDash([2, 3]);ctx.beginPath();ctx.moveTo(position, 0);ctx.lineTo(position, h);ctx.stroke();ctx.setLineDash([]);
    if (cursor.speed !== null) {
      const cy = y(cursor.speed), pulse = state.playing && !reducedMotion.matches ? (Math.sin(t * 4.8) + 1) / 2 : .4;
      const radius = 7 + pulse * 5;
      ctx.save();
      const glow = ctx.createRadialGradient(position, cy, 0, position, cy, radius);
      glow.addColorStop(0, '#ffad6680');glow.addColorStop(.4, '#ffad6630');glow.addColorStop(1, '#ffad6600');
      ctx.fillStyle = glow;ctx.beginPath();ctx.arc(position, cy, radius, 0, Math.PI * 2);ctx.fill();
      ctx.strokeStyle = `rgba(255,173,102,${.12 + pulse * .18})`;ctx.lineWidth = .7;
      ctx.beginPath();ctx.arc(position, cy, 4 + pulse * 3, 0, Math.PI * 2);ctx.stroke();
      ctx.shadowColor = AMBER;ctx.shadowBlur = 4 + pulse * 4;ctx.fillStyle = AMBER;
      ctx.beginPath();ctx.arc(position, cy, 2.2, 0, Math.PI * 2);ctx.fill();ctx.restore();
    }
  }

  function drawRing(state) {
    const { ctx, w, h } = ring();const r = Math.min(w, h) * .36;
    ctx.strokeStyle = '#ffffff16';ctx.lineWidth = .7;ctx.beginPath();ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);ctx.stroke();
    for (let i = 0; i < 62; i++) {
      const a = i / 62 * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = i / 62 <= state.progress ? AMBER : '#ffffff25';ctx.beginPath();ctx.moveTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);ctx.lineTo(w / 2 + Math.cos(a) * (r + 4), h / 2 + Math.sin(a) * (r + 4));ctx.stroke();
    }
    ctx.textAlign = 'center';ctx.fillStyle = AMBER;ctx.font = '11px Plex, monospace';ctx.fillText(`${Math.floor(state.progress * 100)}%`, w / 2, h / 2 + 3);ctx.textAlign = 'left';
  }

  function drawSectors(state) {
    const { ctx, w, h } = sectors();
    const durations = state.selected.lapRecord.sectors;
    if (!durations.every(value => value > 0)) return;
    const total = durations.reduce((sum, value) => sum + value, 0);
    const values = durations.map(value => value / total), colors = [AMBER, '#b9c8c4', '#898ba2'];let left = 0, boundary = 0;
    const lapElapsed = state.elapsed - state.selected.lapRecord.start;
    for (let i = 0; i < 3; i++) {
      const width = w * values[i] - 3;ctx.fillStyle = `${colors[i]}18`;ctx.fillRect(left, 4, width, h - 8);ctx.fillStyle = colors[i];ctx.fillRect(left, 4, width, 1);
      const active = !state.selected.finished && lapElapsed >= boundary && lapElapsed < boundary + durations[i];
      if (active) { ctx.fillStyle = `${colors[i]}50`;ctx.fillRect(left, 4, width, h - 8); }
      left += width + 3;boundary += durations[i];
    }
  }

  return { frame(t, state) { drawSpeed(t, state);drawRing(state);drawSectors(state); } };
}
