import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Configuração essencial para cookies
        cookieDomainRewrite: {
          '*': 'localhost:5173',
        },
      },
      '/images': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Headers para cache de imagens
        headers: {
          'Cache-Control': 'public, max-age=31536000',
        },
      },
    },
  },
})
