import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  build: {

    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Minify with esbuild (default, fast)
    minify: 'esbuild',
    // Emit sourcemaps for production debugging
    sourcemap: false,
    rollupOptions: {
      output: {
        // Route-level manual chunks — aligns with React.lazy() split points
        manualChunks: {
          // Core React runtime (always loaded)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Chart library (only loaded on dashboard/reports pages)
          'vendor-recharts': ['recharts'],
          // Icon set
          'vendor-icons': ['lucide-react'],
          // Real-time (only when authenticated)
          'vendor-socket': ['socket.io-client'],
          // i18n runtime
          'vendor-i18n': ['i18next', 'react-i18next'],
          // Animation library
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Warn on chunks > 500KB
    chunkSizeWarningLimit: 500,
  },
})
