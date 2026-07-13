import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Set BASE_PATH when deploying under a subpath (e.g. /pdfeditor/ on GitHub Pages).
  base: process.env.BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
