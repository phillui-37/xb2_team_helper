import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE_PATH = '/xb2/'
const THEME_COLOR = '#123462'

function inlineCssInJs(): Plugin {
  return {
    name: 'inline-css-in-js',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/g, '')
    },
    generateBundle(_options, bundle) {
      const cssAssets = Object.entries(bundle).filter(([, item]) =>
        item.type === 'asset' && item.fileName.endsWith('.css'))
      const jsChunks = Object.values(bundle).filter(item =>
        item.type === 'chunk' && item.isEntry)
      if (cssAssets.length === 0 || jsChunks.length === 0)
        return
      const cssText = cssAssets.map(([, item]) => String(item.source)).join('\n')
      const prelude = `(function(){var s=document.createElement("style");s.textContent=${JSON.stringify(cssText)};document.head.appendChild(s);})();\n`
      for (const chunk of jsChunks) {
        if (chunk.type === 'chunk')
          chunk.code = prelude + chunk.code
      }
      for (const [fileName] of cssAssets)
        delete bundle[fileName]
    },
  }
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    inlineCssInJs(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE_PATH,
        name: 'Xenoblade 2 Team Helper',
        short_name: 'XB2 Helper',
        description: 'Xenoblade 2 team calculator',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        lang: 'en',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,html,ico,png,svg,webmanifest,wasm,data}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  worker: {
    format: 'es',
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 80_000,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        codeSplitting: false,
        entryFileNames: 'app.min.js',
        chunkFileNames: 'app.min.js',
        assetFileNames: asset => {
          const name = asset.names?.[0] ?? 'asset'
          if (name.endsWith('.wasm') || name.endsWith('.data'))
            return '[name][extname]'
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
