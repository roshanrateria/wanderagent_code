import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initOfflineMode } from "@/lib/offline";
import { initApiBase } from "@/lib/apiBase";

// Debug: Check environment variables at startup
console.log('[MAIN DEBUG] Environment variables:', {
  VITE_LOCAL_ONLY: (import.meta as any).env?.VITE_LOCAL_ONLY,
  VITE_FOURSQUARE_API_KEY: (import.meta as any).env?.VITE_FOURSQUARE_API_KEY ? 'SET' : 'NOT SET',
  VITE_GEMINI_API_KEY: (import.meta as any).env?.VITE_GEMINI_API_KEY ? 'SET' : 'NOT SET',
  capacitorExists: typeof (globalThis as any).Capacitor,
  allEnv: (import.meta as any).env
});

// Initialize offline mode (no-op unless VITE_LOCAL_ONLY=true)
initOfflineMode();

// Initialize API base redirect (no-op if no VITE_API_BASE_URL or if local-only)
initApiBase();

createRoot(document.getElementById("root")!).render(<App />);
