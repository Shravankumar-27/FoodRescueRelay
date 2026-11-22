import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "RESCUERELAY_");
  const target = process.env.RESCUERELAY_API_TARGET ?? env.RESCUERELAY_API_TARGET ?? "http://127.0.0.1:8000";
  const proxy = { "/api/v1": { target, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { proxy },
    build: { chunkSizeWarningLimit: 800 },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/tests/setup.ts",
    },
  };
});
