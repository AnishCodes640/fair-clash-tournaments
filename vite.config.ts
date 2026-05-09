import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const cloudUrl = process.env.VITE_SUPABASE_URL || "https://smuduoexyrlgfigekyqv.supabase.co";
const cloudPublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWR1b2V4eXJsZ2ZpZ2VreXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODI4MjgsImV4cCI6MjA4OTA1ODgyOH0.aqqcBHsxb2uGLZRYeIExQd2CFQTIMEVGA3BRd4I0gpM";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(cloudUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(cloudPublishableKey),
  },
}));
