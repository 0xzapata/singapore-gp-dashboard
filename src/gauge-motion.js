export function createGaugeMotion(response = .1) {
  let displayed = null;
  return {
    step(target, seconds, immediate = false) {
      if (target == null) { displayed = null;return null; }
      if (displayed === null || immediate) displayed = target;
      else displayed += (target - displayed) * -Math.expm1(-Math.max(0, seconds) / response);
      if (Math.abs(target - displayed) < .01) displayed = target;
      return displayed;
    },
  };
}
