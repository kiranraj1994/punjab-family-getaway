import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// mode "preview" builds a static, backend-less copy of the survey for design review.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: mode === "preview" ? "./" : "/",
  resolve: {
    alias: { "@shared": fileURLToPath(new URL("./shared", import.meta.url)) },
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
