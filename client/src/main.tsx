import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initOfflineMode } from "@/lib/offline";
import { initApiBase } from "@/lib/apiBase";
import { Router as WouterRouter } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import React from 'react';
import { Http as CapacitorHttp } from '@capacitor-community/http';

// Debug: Check environment variables at startup
console.log('[MAIN DEBUG] Environment variables:', {
  VITE_LOCAL_ONLY: (import.meta as any).env?.VITE_LOCAL_ONLY,
  VITE_FOURSQUARE_API_KEY: (import.meta as any).env?.VITE_FOURSQUARE_API_KEY ? 'SET' : 'NOT SET',
  VITE_GEMINI_API_KEY: (import.meta as any).env?.VITE_GEMINI_API_KEY ? 'SET' : 'NOT SET',
  capacitorExists: typeof (globalThis as any).Capacitor,
  allEnv: (import.meta as any).env
});

// --- File protocol (Electron offline) routing normalization ---
const isFileProtocol = typeof window !== 'undefined' && location.protocol === 'file:';
if (isFileProtocol) {
  try {
    // If we were opened via a direct filesystem path like /D:/.../index.html ensure we switch to hash routing (#/)
    if (location.pathname.endsWith('/index.html')) {
      history.replaceState(null, '', '#/');
      console.log('[offline-normalize] Replaced /index.html path with hash route #/');
    }
    if (!location.hash || location.hash === '#') {
      location.hash = '#/';
      console.log('[offline-normalize] Ensured hash route present (#/)');
    }
  } catch (e) {
    console.warn('[offline-normalize] failed', e);
  }
}

// Initialize offline mode (no-op unless VITE_LOCAL_ONLY=true)
initOfflineMode();

// Initialize API base redirect (no-op if no VITE_API_BASE_URL or if local-only)
initApiBase();

// Register protocol handler in browsers only when allowed by config (not in VITE_LOCAL_ONLY or mobile)
const isLocalOnly = import.meta.env.VITE_LOCAL_ONLY === 'true';
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.platform !== undefined;
if (!isFileProtocol && !isLocalOnly && !isCapacitor && typeof navigator !== 'undefined' && 'registerProtocolHandler' in navigator) {
  try {
    (navigator as any).registerProtocolHandler('web+wanderagent', `${window.location.origin}/open?url=%s`);
  } catch (e) {
    console.warn('protocol handler registration failed', e);
  }
}

// If running inside Electron, expose a handler via the preload bridge
if (typeof window !== 'undefined' && (window as any).electron?.onDeepLink) {
  (window as any).electron.onDeepLink((url: string) => {
    const encoded = encodeURIComponent(url);
    const navUrl = `${window.location.origin}/?deep=${encoded}`;
    window.location.href = navUrl;
  });
}

// PWA / Service worker registration (skip on file://)
if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && location.protocol !== 'file:') {
  try {
    const isMobile = typeof (globalThis as any).Capacitor !== 'undefined';
    const viteLocal = (import.meta as any).env?.VITE_LOCAL_ONLY;
    const isLocalOnlySW = viteLocal === true || viteLocal === 'true';
    if (!isMobile && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((e) => console.warn('SW register failed', e));
      if ('registerProtocolHandler' in navigator && !isLocalOnlySW) {
        try { (navigator as any).registerProtocolHandler('web+wander', `${location.origin}/open?url=%s`, 'WanderAgent'); } catch (e) { console.warn('registerProtocolHandler failed', e); }
      }
    }
  } catch (e) {
    console.warn('PWA registration skipped', e);
  }
}

// Render with hash router for file:// mode, normal otherwise
const Root = () => (
  isFileProtocol
    ? <WouterRouter hook={useHashLocation}><App /></WouterRouter>
    : <App />
);

createRoot(document.getElementById('root')!).render(<Root />);
