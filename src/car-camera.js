import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const ease = value => THREE.MathUtils.smootherstep(value, 0, 1);
const closeOffset = car => new THREE.Vector3(1.7, 1.8, -2.2).applyAxisAngle(UP, car.rotation.y);
const pullBack = offset => offset.clone().multiplyScalar(1.45).add(new THREE.Vector3(0, .7, 0));

export function createCarCamera(camera, controls, cars) {
  const damping = controls.enableDamping;
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let followedDriver, flight;
  const restoreControls = () => {
    controls.enabled = true;controls.enableDamping = damping;controls.maxDistance = 12;
  };
  return {
    frame(time, selectedDriver) {
      const destination = cars.get(selectedDriver);
      if (followedDriver !== selectedDriver) {
        if (reducedMotion?.matches) {
          flight = undefined;restoreControls();
          controls.target.copy(destination.position);camera.position.copy(destination.position).add(closeOffset(destination));
        } else {
          const source = cars.get(followedDriver);
          const startTarget = controls.target.clone();
          const startOffset = camera.position.clone().sub(startTarget);
          const distance = startTarget.distanceTo(destination.position);
          flight = {
            startedAt: time, source, sourceAnchor: source?.position.clone(), startTarget, startOffset,
            wideOffset: source ? pullBack(startOffset) : startOffset.clone(),
            depart: source ? .4 : 0, travel: THREE.MathUtils.clamp(.8 + distance / 40, .8, 1.5), arrive: .5,
            lift: Math.min(10, 2 + distance * .15),
          };
          // Clear leftover orbit damping while preserving the current camera pose.
          const startPosition = camera.position.clone();
          controls.enabled = false;controls.enableDamping = false;controls.autoRotate = false;
          controls.update();camera.position.copy(startPosition);controls.target.copy(startTarget);
          controls.maxDistance = Math.max(140, startOffset.length() * 2);
        }
        followedDriver = selectedDriver;
      }

      if (flight) {
        const elapsed = Math.max(0, time - flight.startedAt);
        const sourceTarget = flight.startTarget.clone();
        if (flight.source) sourceTarget.add(flight.source.position).sub(flight.sourceAnchor);
        const arrivalOffset = closeOffset(destination), arrivalWide = pullBack(arrivalOffset);
        let offset;
        if (elapsed < flight.depart) {
          controls.target.copy(sourceTarget);
          offset = flight.startOffset.clone().lerp(flight.wideOffset, ease(elapsed / flight.depart));
        } else if (elapsed < flight.depart + flight.travel) {
          const progress = ease((elapsed - flight.depart) / flight.travel);
          controls.target.copy(sourceTarget).lerp(destination.position, progress);
          offset = flight.wideOffset.clone().lerp(arrivalWide, progress);
          offset.y += Math.sin(Math.PI * progress) * flight.lift;
        } else {
          const progress = ease((elapsed - flight.depart - flight.travel) / flight.arrive);
          controls.target.copy(destination.position);
          offset = arrivalWide.lerp(arrivalOffset, progress);
          if (elapsed >= flight.depart + flight.travel + flight.arrive) { flight = undefined;restoreControls(); }
        }
        camera.position.copy(controls.target).add(offset);
      } else {
        camera.position.add(destination.position.clone().sub(controls.target));controls.target.copy(destination.position);
      }
      controls.update();
    },
    stop() { flight = undefined;followedDriver = undefined;restoreControls(); },
  };
}
