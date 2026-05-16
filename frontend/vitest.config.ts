import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/components/**/*.{ts,tsx}'],
      exclude: ['src/components/**/*.test.tsx'],
    },
  },
});