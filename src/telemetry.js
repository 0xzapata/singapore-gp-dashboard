// SVG polar geometry adapted from Gauge UI, MIT. See public/licenses/gauge-ui.txt.
import { createGaugeMotion } from './gauge-motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const AMBER = '#ffad66';
const RED = '#e87970';
const MAX_SPEED = 360;
const polar = (radius, angle) => {
  const radians = (angle + 90) * Math.PI / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
};
const speedAngle = value => 45 + value / MAX_SPEED * 270;
function arc(radius, from, to) {
  const start = polar(radius, from), middle = polar(radius, (from + to) / 2), end = polar(radius, to);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${middle.x} ${middle.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}
function svgNode(tag, attributes, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function setMeter(node, value, unit) {
  if (value === null || value === undefined) {
    node.removeAttribute('aria-valuenow');node.setAttribute('aria-valuetext', 'No sample');
  } else {
    node.setAttribute('aria-valuenow', value);node.setAttribute('aria-valuetext', `${value}${unit}`);
  }
}

export function createTelemetry() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const speedMotion = createGaugeMotion(.11);
  const dial = document.getElementById('speed-dial');
  const gauge = document.getElementById('speed-gauge');
  dial.append(svgNode('path', { d: arc(74, 45, 315), class: 'gauge-track' }));
  const speedSegments = Array.from({ length: 36 }, (_, i) => {
    const color = i >= 30 ? RED : AMBER;
    const node = svgNode('path', { d: arc(74, 45 + i * 7.5 + .9, 45 + (i + 1) * 7.5 - .9), class: 'speed-segment', stroke: color });
    dial.append(node);return node;
  });
  for (let i = 0; i <= 36; i++) {
    const angle = 45 + i * 7.5, major = i % 6 === 0;
    const inner = polar(major ? 57 : 61, angle), outer = polar(65, angle);
    dial.append(svgNode('line', { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, class: major ? 'gauge-tick major' : 'gauge-tick' }));
    if (major) {
      const point = polar(48, angle);
      dial.append(svgNode('text', { x: point.x, y: point.y, class: 'gauge-label' }, i * 10));
    }
  }
  const needle = svgNode('path', { d: 'M -1.5 60 L 0 68 L 1.5 60 Z', class: 'gauge-needle' });
  dial.append(needle);
  const gearMeter = document.getElementById('gear-segments');
  const gears = Array.from({ length: 8 }, (_, i) => {
    const node = document.createElement('span');node.textContent = i + 1;node.setAttribute('aria-hidden', 'true');
    gearMeter.append(node);return node;
  });
  const pedals = ['throttle', 'brake'].map(name => {
    const meter = document.getElementById(name);
    const pedalDial = document.getElementById(`${name}-dial`);
    pedalDial.append(svgNode('path', { d: arc(46, 45, 315), class: 'gauge-track' }));
    const segments = Array.from({ length: 21 }, (_, i) => {
      const step = 270 / 21;
      const node = svgNode('path', { d: arc(46, 45 + i * step + 1.5, 45 + (i + 1) * step - 1.5), class: 'pedal-segment' });
      node.style.setProperty('--segment-color', `color-mix(in srgb, #e6e9ec ${100 - i * 5}%, #22e875)`);
      pedalDial.append(node);return node;
    });
    for (const value of [0, 50, 100]) {
      const angle = 45 + value * 2.7;
      const inner = polar(36, angle), outer = polar(40, angle), label = polar(30, angle);
      pedalDial.append(svgNode('line', { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, class: 'gauge-tick major' }));
      pedalDial.append(svgNode('text', { x: label.x, y: label.y, class: 'gauge-label' }, value));
    }
    const indicator = svgNode('path', { d: 'M -1.6 37 L 0 42 L 1.6 37 Z', class: 'gauge-needle' });
    pedalDial.append(indicator);
    pedalDial.append(svgNode('text', { x: 0, y: -9, class: 'pedal-gauge-label' }, name.toUpperCase()));
    pedalDial.append(svgNode('text', { x: 0, y: 11, class: 'pedal-gauge-value', id: `${name}-value` }, '—'));
    return { name, meter, segments, indicator, motion: createGaugeMotion(.075) };
  });

  function illuminate(node, fraction, idle) {
    node.classList.toggle('lit', fraction === 1);
    node.style.opacity = idle + fraction * (1 - idle);
  }
  function drawGauges(data, seconds) {
    const targetSpeed = data?.speed == null ? null : Math.max(0, Math.min(MAX_SPEED, data.speed));
    const speed = speedMotion.step(targetSpeed, seconds, reducedMotion.matches);
    const speedNumber = speed === null ? null : Math.round(speed);
    document.getElementById('speed').textContent = speedNumber ?? '—';
    setMeter(gauge, speedNumber, ' km/h');
    speedSegments.forEach((node, i) => illuminate(node, speed === null ? 0 : Math.max(0, Math.min(1, speed / 10 - i)), .16));
    needle.style.display = speed === null ? 'none' : '';
    needle.setAttribute('transform', `rotate(${speedAngle(speed ?? 0)})`);
    for (const { name, meter, segments, indicator, motion } of pedals) {
      const target = data?.[name] == null ? null : Math.max(0, Math.min(100, data[name]));
      const value = motion.step(target, seconds, reducedMotion.matches);
      const percent = value === null ? null : Math.round(value);
      document.getElementById(`${name}-value`).textContent = percent === null ? '—' : `${percent}%`;
      setMeter(meter, percent, '%');
      segments.forEach((node, i) => illuminate(node, value === null ? 0 : i === 0 ? 1 : Math.max(0, Math.min(1, value / 5 - i + 1)), .14));
      indicator.style.display = value === null ? 'none' : '';
      indicator.setAttribute('transform', `rotate(${45 + (value ?? 0) * 2.7})`);
    }
  }

  return {
    frame(data, seconds) { drawGauges(data, seconds); },
    update(data) {
      drawGauges(data, 0);
      const gear = data?.gear;
      document.getElementById('gear').textContent = gear === 0 ? 'N' : gear ?? '—';
      setMeter(gearMeter, gear, gear === 0 ? ' / neutral' : ' / 8');
      gears.forEach((node, i) => { node.classList.toggle('lit', gear != null && i < gear);node.classList.toggle('current', gear === i + 1); });
      const drs = document.getElementById('drs');
      const hasDrs = data?.drs != null;
      drs.classList.toggle('open', Boolean(data?.drs));
      drs.classList.toggle('unavailable', !hasDrs);
      drs.dataset.state = hasDrs ? (data.drs ? 'on' : 'off') : 'unavailable';
      const drsDescription = hasDrs ? (data.drs ? 'DRS on, rear wing open' : 'DRS off, rear wing closed') : 'No recorded DRS sample';
      drs.setAttribute('aria-label', drsDescription);drs.title = drsDescription;
    },
  };
}
