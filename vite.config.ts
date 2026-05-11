// Configuração Vite para Vercel (Node.js SSR)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStartPlugin } from '@tanstack/react-start/plugin'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
    }),
    tanstackStartPlugin(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  
  // Configuração SSR para Node.js (Vercel)
  ssr: {
    target: 'node',
    noExternal: ['@radix-ui'],
    external: ['@supabase/supabase-js'],
  },

  // Optimizações
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },

  // Server dev
  server: {
    middlewareMode: false,
  },
})

