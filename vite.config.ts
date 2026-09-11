import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BASE_PATH = '/xb2/'

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
  plugins: [react(), tailwindcss(), inlineCssInJs()],
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
