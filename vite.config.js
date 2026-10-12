import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const host = loadEnv(mode, process.cwd(), 'DASHBOARD_').DASHBOARD_PREVIEW_HOST?.trim();
  const allowedHosts = host ? [host] : [];
  return {
    base: './',
    server: { allowedHosts },
    preview: { allowedHosts },
  };
});
