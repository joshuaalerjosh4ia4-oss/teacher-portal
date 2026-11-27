
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  preview: {
    host: "0.0.0.0",
    allowedHosts: [
      "teacher-webpage.onrender.com",
      "teacher-portal-c7j5.onrender.com",
    ],
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,

    allowedHosts: [
      "teacher-webpage.onrender.com",
      "teacher-portal-c7j5.onrender.com",
    ],

    proxy: {
      "/api": "http://localhost:5001",
      "/health": "http://localhost:5001",
    },
  },
});
