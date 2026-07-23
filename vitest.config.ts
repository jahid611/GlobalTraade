import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // On ne teste que notre code source (pas node_modules ni les libs).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
  },
});
