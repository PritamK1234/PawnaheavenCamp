import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      "/api/payments/paytm/callback": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log(`[Vite Proxy] Paytm callback: ${req.method} ${req.url} Content-Type: ${req.headers["content-type"]}`);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log(`[Vite Proxy] Paytm callback response: ${proxyRes.statusCode} for ${req.url}`);
          });
          proxy.on("error", (err, req) => {
            console.error(`[Vite Proxy] Paytm callback error: ${err.message} for ${req.url}`);
          });
        },
      },
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
      "/attached_assets": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
      "/webhook": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        public: path.resolve(__dirname, "index.html"),
        owner: path.resolve(__dirname, "owner.html"),
      },
    },
  },
  define: {
    'import.meta.env.VITE_ADMIN_BASE': JSON.stringify('/admin'),
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
