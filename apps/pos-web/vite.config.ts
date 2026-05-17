// apps/pos-web/vite.config.ts
// Phase 8: Added vite-plugin-pwa for service worker and offline support.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Service worker is generated in the dist folder
      workbox: {
        // Cache the app shell and static assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Large login illustration is loaded normally, not precached by the SW.
        globIgnores: ["**/assets/lecrion_3d-*.png"],
        // Runtime caching for API calls
        runtimeCaching: [
          {
            // Cache product catalog for offline use
            urlPattern: /\/api\/products(\?.*)?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-products",
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Cache categories
            urlPattern: /\/api\/categories(\?.*)?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-categories",
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Cache store settings
            urlPattern: /\/api\/stores\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-settings",
              expiration: { maxEntries: 5, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name: "Lecrion POS",
        short_name: "Lecrion",
        description: "Lecrion Point of Sale — Cashier App",
        theme_color: "#1e293b",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "landscape",
        start_url: "/kasir",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
