import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [react()],
  preview: {
    host: "0.0.0.0",
    allowedHosts: [
      "https://teacher-portal-c7j5.onrender.com",
      "teacher-webpage.onrender.com",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "https://teacher-portal-c7j5.onrender.com",
      "https://teacher-webpage.onrender.com",
    ],
    proxy: {
      "/api": "http://localhost:5001",
      "/health": "http://localhost:5001",
    },
  },
});
