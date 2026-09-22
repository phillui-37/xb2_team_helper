import { readdirSync } from "node:fs"
import { join } from "node:path"
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import { exportCatalog } from "./scripts/export-catalog.ts"

const BASE_PATH = "/xb2/"
const THEME_COLOR = "#123462"

function catalogJsonPlugin(): Plugin {
  return {
    name: "xb2-catalog-json",
    async buildStart() {
      const dbDir = join(process.cwd(), "src/db")
      for (const name of readdirSync(dbDir)) {
        if (name.endsWith(".sql"))
          this.addWatchFile(join(dbDir, name))
      }
      await exportCatalog()
    },
  }
}

function inlineCssInJs(): Plugin {
  return {
    name: "inline-css-in-js",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/g, "")
    },
    generateBundle(_options, bundle) {
      const cssAssets = Object.entries(bundle).filter(([, item]) =>
        item.type === "asset" && item.fileName.endsWith(".css"))
      const jsChunks = Object.values(bundle).filter(item =>
        item.type === "chunk" && item.isEntry)
      if (cssAssets.length === 0 || jsChunks.length === 0)
        return
      const cssText = cssAssets.map(([, item]) => String(item.source)).join("\n")
      const prelude = `(function(){var s=document.createElement("style");s.textContent=${JSON.stringify(cssText)};document.head.appendChild(s);})();\n`
      for (const chunk of jsChunks) {
        if (chunk.type === "chunk")
          chunk.code = prelude + chunk.code
      }
      for (const [fileName] of cssAssets)
        delete bundle[fileName]
    },
  }
}

const isWorker = (name: string) => /worker/i.test(name)

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    catalogJsonPlugin(),
    react(),
    tailwindcss(),
    inlineCssInJs(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        id: BASE_PATH,
        name: "Xenoblade 2 Team Helper",
        short_name: "XB2 Helper",
        description: "Xenoblade 2 team calculator",
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: "standalone",
        start_url: BASE_PATH,
        scope: BASE_PATH,
        lang: "en",
        icons: [
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "index.html",
      },
    }),
  ],
  worker: {
    format: "es",
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 80_000,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        entryFileNames: chunk => isWorker(chunk.name)
          ? "assets/[name]-[hash].js"
          : "assets/app-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
})
