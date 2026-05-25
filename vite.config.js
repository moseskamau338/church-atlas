import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// `base` is the public path on GitHub Pages. For project pages it must be
// `/<repo-name>/`. Override via env var so the deploy workflow can set it
// from `${{ github.event.repository.name }}` without code changes.
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,vue}'],
    },
  },
})
