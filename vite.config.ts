import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages project site: https://<user>.github.io/typing-trainer/
// The coordinator adjusts `base` if the repo name differs.
export default defineConfig({
  base: '/typing-trainer/',
  plugins: [react(), tailwindcss()],
})
