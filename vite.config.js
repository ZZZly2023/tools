import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true // 端口被占用时报错
  },
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist'
  }
}) 