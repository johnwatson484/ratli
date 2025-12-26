import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/test/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [...configDefaults.exclude, 'coverage', '**/test/**'],
      clean: false
    }
  }
})
