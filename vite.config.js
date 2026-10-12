import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { allowedHosts: ['private-preview.invalid'] },
  preview: { allowedHosts: ['private-preview.invalid'] },
});
