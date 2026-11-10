import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// mode "preview" builds a static, backend-less copy of the survey for design review.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: mode === "preview" ? "./" : "/",
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      // Only the preview build may pull in the invented demo rows; every other build (including
      // `vitest`, where mode is "test") resolves this specifier to a stub with no demo content
      // at all. main.tsx imports "virtual:demo-api" (never a relative path to demoApi.ts
      // directly), so the real demoApi.ts module never enters the production module graph.
      "virtual:demo-api": fileURLToPath(new URL(mode === "preview" ? "./src/admin/demoApi.ts" : "./src/admin/demoApi.production-stub.ts", import.meta.url)),
    },
  },
  build: { outDir: mode === "preview" ? "dist-preview" : "dist", emptyOutDir: true },
  server: { proxy: { "/api": "http://localhost:8787" } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
  },
}));
