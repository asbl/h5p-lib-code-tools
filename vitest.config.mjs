import { dirname } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@scripts': path.resolve(__dirname, 'src/scripts'),
      '@services': path.resolve(__dirname, 'src/scripts/services'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
  },
});