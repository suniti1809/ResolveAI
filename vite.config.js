import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api calls to the FastAPI backend during development
      "/api": {
        target: "https://resolveai-xnzt.onrender.com/",
        changeOrigin: true,
      },
    },
  },
});
