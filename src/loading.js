export function createLoadingScreen() {
  const loader = document.getElementById('page-loader');
  const dashboard = document.querySelector('.dashboard');
  const status = document.getElementById('loader-status');
  const progress = document.getElementById('loader-progress');
  const retry = document.getElementById('loader-retry');
  retry.addEventListener('click', () => location.reload());

  return {
    stage(value, message) {
      status.textContent = message;
      progress.style.setProperty('--progress', `${value * 100}%`);
      progress.setAttribute('aria-valuenow', Math.round(value * 100));
    },
    finish() {
      status.textContent = 'Marina Bay ready';
      progress.style.setProperty('--progress', '100%');progress.setAttribute('aria-valuenow', '100');
      dashboard.inert = false;dashboard.setAttribute('aria-busy', 'false');
      document.body.classList.remove('is-loading');loader.classList.add('complete');
      setTimeout(() => { loader.hidden = true; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320);
    },
    fail(message) {
      status.textContent = message;loader.classList.add('failed');retry.hidden = false;retry.focus();
      progress.setAttribute('aria-valuetext', 'Loading failed');
    },
  };
}
