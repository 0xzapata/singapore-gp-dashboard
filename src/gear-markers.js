import { gearChanges } from './speed-chart.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const gearLabel = gear => gear === 0 ? 'N' : String(gear);

export function createGearMarkers(canvas) {
  const stage = canvas.parentElement;
  const layer = document.getElementById('gear-markers');
  const leaders = layer.querySelector('svg');
  const tooltip = document.getElementById('gear-tooltip');
  let samples, markers = [], previousSize = '', active;

  function hideTooltip() {
    active?.button.removeAttribute('aria-describedby');active = undefined;tooltip.hidden = true;
  }
  function positionTooltip() {
    if (!active) return;
    const { width, height } = stage.getBoundingClientRect();
    tooltip.style.left = `${Math.max(2, Math.min(width - tooltip.offsetWidth - 2, active.left - tooltip.offsetWidth / 2 + active.size / 2))}px`;
    tooltip.style.top = `${Math.max(2, Math.min(height - tooltip.offsetHeight - 2, active.top + active.size + 5))}px`;
  }
  function showTooltip(marker) {
    active?.button.removeAttribute('aria-describedby');active = marker;
    tooltip.querySelector('strong').textContent = `GEAR ${gearLabel(marker.change.fromGear)} → ${gearLabel(marker.change.gear)}`;
    tooltip.querySelector('span').textContent = `+${marker.lapTime.toFixed(2)}s · ${marker.change.speed} KM/H`;
    tooltip.hidden = false;marker.button.setAttribute('aria-describedby', tooltip.id);positionTooltip();
  }
  stage.addEventListener('keydown', event => { if (event.key === 'Escape') { hideTooltip();document.activeElement?.blur(); } });
  document.addEventListener('pointerdown', event => { if (!stage.contains(event.target)) hideTooltip(); });

  function rebuild(state) {
    hideTooltip();layer.querySelectorAll('button').forEach(button => button.remove());leaders.replaceChildren();
    markers = gearChanges(state.lapSamples).map(change => {
      const button = document.createElement('button');button.type = 'button';button.className = 'gear-change';
      button.textContent = gearLabel(change.gear);button.dataset.gear = change.gear;
      const lapTime = change.at - state.selected.lapRecord.start;
      button.setAttribute('aria-label', `Gear ${gearLabel(change.fromGear)} to ${gearLabel(change.gear)}, ${lapTime.toFixed(2)} seconds into lap ${state.selected.lap}, ${change.speed} km/h`);
      const line = document.createElementNS(SVG_NS, 'line'), point = document.createElementNS(SVG_NS, 'circle');
      point.setAttribute('r', '1.3');leaders.append(line, point);
      const marker = { change, button, line, point, lapTime };
      button.addEventListener('pointerenter', () => showTooltip(marker));
      button.addEventListener('pointerleave', () => { if (document.activeElement !== button) hideTooltip(); });
      button.addEventListener('focus', () => showTooltip(marker));
      button.addEventListener('blur', hideTooltip);
      button.addEventListener('click', () => showTooltip(marker));
      layer.append(button);return marker;
    });
  }

  return {
    update(state, width, height) {
      const changed = samples !== state.lapSamples;
      if (changed) { samples = state.lapSamples;rebuild(state); }
      const sizeKey = `${width}:${height}`;
      if (!changed && previousSize === sizeKey) return;
      previousSize = sizeKey;leaders.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const size = width < 220 ? 10 : 13, placed = [];
      for (const marker of markers) {
        const x = 23 + marker.change.fraction * (width - 28), y = height - 6 - marker.change.speed / 340 * (height - 14);
        const left = Math.max(23, Math.min(width - size - 1, x - size / 2));
        const preferred = Math.max(1, Math.min(height - size - 1, y - size - 5));
        const candidates = [preferred];
        for (let top = 1; top <= height - size - 1; top += size + 2) candidates.push(top);
        candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
        const overlaps = top => placed.filter(box => left < box.left + size + 2 && left + size + 2 > box.left && top < box.top + size + 2 && top + size + 2 > box.top).length;
        let top = candidates.find(top => overlaps(top) === 0);
        if (top === undefined) top = candidates.reduce((best, next) => overlaps(next) < overlaps(best) ? next : best);
        Object.assign(marker, { left, top, size });placed.push({ left, top });
        Object.assign(marker.button.style, { left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` });
        marker.line.setAttribute('x1', x);marker.line.setAttribute('y1', y);
        marker.line.setAttribute('x2', left + size / 2);marker.line.setAttribute('y2', Math.max(top, Math.min(top + size, y)));
        marker.point.setAttribute('cx', x);marker.point.setAttribute('cy', y);
      }
      positionTooltip();
    },
  };
}
