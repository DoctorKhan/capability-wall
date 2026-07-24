import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: "client",
  base: "./",
  server: { port: 5173 },
  build: { outDir: "../dist", emptyOutDir: true },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
