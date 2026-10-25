import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        name: "Recetas",
        short_name: "Recetas",
        description: "Recetario familiar: guarda recetas de TikTok para siempre",
        lang: "es",
        start_url: "/",
        display: "standalone",
        background_color: "#faf6ef",
        theme_color: "#c8502e",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/media/],
        runtimeCaching: [
          {
            urlPattern: /^\/media\/images\//,
            handler: "CacheFirst",
            options: {
              cacheName: "recetas-imagenes",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/media": "http://localhost:8000",
    },
  },
});
