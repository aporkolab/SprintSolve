import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // Fix crypto.getRandomValues issues
    pool: 'forks',
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: ['tests/e2e/**/*', '**/*.e2e.*'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
        'playwright-report/',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@/types': path.resolve(import.meta.dirname, './src/types'),
      '@/utils': path.resolve(import.meta.dirname, './src/utils'),
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/services': path.resolve(import.meta.dirname, './src/services'),
      '@/stores': path.resolve(import.meta.dirname, './src/stores'),
    },
  },
});
