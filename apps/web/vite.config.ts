import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const isPublicDemo = process.env.VITE_PUBLIC_DEMO === "true";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react()],
  build: isPublicDemo ? {
    // A separate output directory keeps the GitHub Pages demo build from overwriting the
    // regular `dist/` used by the local server and the Docker image. A separate HTML entry
    // keeps the private workspace bundle out of the public artifact.
    outDir: "public-demo-dist",
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./public-demo.html", import.meta.url)),
      },
    },
  } : undefined,
  server: {
    proxy: {
      "/api": process.env.WORKER_URL ?? "http://localhost:8787",
    },
  },
  resolve: {
    alias: {
      "@open-project-council/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
    },
  },
});
