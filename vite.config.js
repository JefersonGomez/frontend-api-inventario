import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // dos páginas: la app (index.html) y la landing estática (landing.html, se sirve en "/" a quien no tiene sesión)
  build: {
    rollupOptions: {
      input: { app: path.resolve(__dirname, "index.html"), landing: path.resolve(__dirname, "landing.html") },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})