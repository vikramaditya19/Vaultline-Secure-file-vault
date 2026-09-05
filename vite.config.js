import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Forward frontend /api requests to the FastAPI backend running on port 8000
        // Keep the /api prefix so backend routes mounted at /api/* match correctly.
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  }
})
