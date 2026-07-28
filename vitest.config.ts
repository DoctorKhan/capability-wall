import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: ".",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // DOM-facing suites opt in per file with `// @vitest-environment jsdom`.
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["shared/**/*.ts", "client/src/**/*.ts"],
      exclude: ["client/src/vite-env.d.ts"],
      reporter: ["text", "html"],
    },
  },
});
