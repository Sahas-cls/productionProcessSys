import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: true,
    strictPort: true,
    hmr: {
      host: "192.168.137.1", // Your laptop's local IP
    },
    fs: {
      strict: false,
    },
    proxy: {},
    historyApiFallback: true, // Redirect all 404s to index.html
  },
});
