// @ts-ignore — vite types resolved at build time
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: { mode: string }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
      protocol: "wss",
      clientPort: 443,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "react-router";
          if (id.includes("react-dom") || id.includes("/react/")) return "react-vendor";
          if (id.includes("framer-motion")) return "framer";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@elevenlabs") || id.includes("elevenlabs")) return "elevenlabs";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("embla-carousel")) return "embla";
          if (id.includes("@google/genai")) return "genai";
          if (id.includes("qrcode")) return "qrcode";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@stripe")) return "stripe";
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("micromark")) return "markdown";
          if (id.includes("date-fns")) return "date-fns";
        },
      },
    },
  },
}));
