import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative assets also work at /2026Fall/ on GitHub Pages.
export default defineConfig({ plugins: [react()], base: './' })
