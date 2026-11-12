import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? '/369/' : '/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    restoreMocks: true,
  },
})
