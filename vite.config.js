import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// `base` is the public path on GitHub Pages. For project pages it must be
// `/<repo-name>/`. Override via env var so the deploy workflow can set it
// from `${{ github.event.repository.name }}` without code changes.
const base = process.env.VITE_BASE_PATH || '/'

// Surface the package.json version to the app as `__APP_VERSION__`. Bumped by
// release-please on every release PR merge, so the UI always shows the
// currently-deployed version.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
)

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
