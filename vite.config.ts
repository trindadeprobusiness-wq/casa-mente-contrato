import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Code-splitting: separa as libs pesadas em chunks próprios para
        // que o carregamento inicial seja menor e melhor cacheado.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("/d3-")) return "charts";
          if (
            id.includes("jszip") ||
            id.includes("pdf-lib") ||
            id.includes("docx") ||
            id.includes("file-saver")
          ) {
            return "documents";
          }
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("/react/") ||
            id.includes("framer-motion")
          ) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
}));
