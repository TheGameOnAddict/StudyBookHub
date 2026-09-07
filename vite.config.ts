import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/StudyBookHub/', // Ensures correct asset resolution on GitHub Pages
  build: {
    target: 'esnext',
  }
})
