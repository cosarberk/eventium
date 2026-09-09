/**
 * @fileoverview Vite configuration for Eventium frontend application.
 * Configures React plugin, Tailwind CSS v4, path aliases, and dev server proxy.
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Backend origin the dev server proxies to. */
const DEV_API_TARGET = process.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:4000";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: DEV_API_TARGET,
        changeOrigin: true,
      },
      "/graphql": {
        target: DEV_API_TARGET,
        changeOrigin: true,
      },
      "/socket.io": {
        target: DEV_API_TARGET,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    // Publishing source maps ships readable application source to every
    // visitor; keep them for local builds only.
    sourcemap: mode !== "production",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing libraries out of the app bundle so a
        // deploy invalidates only the application chunk.
        manualChunks: {
          react: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
          charts: ["recharts"],
          ui: ["@radix-ui/themes", "framer-motion"],
          grid: ["react-grid-layout", "react-resizable"],
        },
      },
    },
  },
}));
