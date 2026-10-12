import * as THREE from 'three';

class CircuitCurve extends THREE.CatmullRomCurve3 {
  constructor(points) {
    super(points, true, 'centripetal');
    this.distances = [0];
    this.parameters = [0];
    let previous = this.getPoint(0), length = 0;
    const append = (parameter, point) => {
      length += previous.distanceTo(point);
      this.distances.push(length);this.parameters.push(parameter);previous = point;
    };
    const subdivide = (from, to, a, b, depth = 0) => {
      const span = to - from;
      const quarter = this.getPoint(from + span * .25);
      const middle = this.getPoint(from + span * .5);
      const threeQuarter = this.getPoint(from + span * .75);
      const error = Math.max(
        quarter.distanceTo(a.clone().lerp(b, .25)),
        middle.distanceTo(a.clone().lerp(b, .5)),
        threeQuarter.distanceTo(a.clone().lerp(b, .75)),
      );
      if (error > .00001 && depth < 16) {
        subdivide(from, from + span * .5, a, middle, depth + 1);
        subdivide(from + span * .5, to, middle, b, depth + 1);
      } else append(to, b);
    };
    for (let i = 0; i < points.length; i++) {
      const from = i / points.length, to = (i + 1) / points.length;
      subdivide(from, to, this.getPoint(from), this.getPoint(to));
    }
  }

  getLength() { return this.distances.at(-1); }

  getUtoTmapping(fraction, distance) {
    const target = Math.max(0, Math.min(this.getLength(), distance ?? fraction * this.getLength()));
    let low = 0, high = this.distances.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (this.distances[middle] < target) low = middle + 1;
      else high = middle;
    }
    if (low === 0) return 0;
    const blend = (target - this.distances[low - 1]) / (this.distances[low] - this.distances[low - 1]);
    return THREE.MathUtils.lerp(this.parameters[low - 1], this.parameters[low], blend);
  }

  getTangentAt(fraction, target = new THREE.Vector3()) {
    const before = this.getPointAt((fraction - .00001 + 1) % 1);
    const after = this.getPointAt((fraction + .00001) % 1);
    return target.copy(after).sub(before).normalize();
  }
}

export function createCircuitPath(coordinates) {
  const lngs = coordinates.map(point => point[0]), lats = coordinates.map(point => point[1]);
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const project = ([lng, lat], height = .13) => new THREE.Vector3((lng - centerLng) * 3000, height, -(lat - centerLat) * 3000);
  const signedArea = coordinates.slice(1).reduce((area, point, index) => area + coordinates[index][0] * point[1] - point[0] * coordinates[index][1], 0);
  const route = coordinates.slice(0, -1);
  const ordered = signedArea < 0 ? [route[0], ...route.slice(1).reverse()] : route;
  return { curve: new CircuitCurve(ordered.map(point => project(point))), project };
}
