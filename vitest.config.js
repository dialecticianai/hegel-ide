import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'e2e/**',
        'lib/app.js', // Integration, tested via e2e
        '*.config.js',
        'coverage/**'
      ]
    },
    globals: true,
    setupFiles: ['./test/setup.js']
  }
});
