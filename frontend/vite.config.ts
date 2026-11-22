import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const proxy = { "/api/v1": { target: process.env.RESCUERELAY_API_TARGET ?? "http://127.0.0.1:8000", changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { proxy },
  build: {
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.ts",
  },
});
