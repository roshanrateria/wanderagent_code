export async function apiRequest(method: string, path: string, body?: any, sessionId?: string, extraHeaders?: Record<string,string>): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) headers['session-id'] = sessionId;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  return fetch(path, init);
}

// Install a global fetch shim for web builds to call a remote API base and propagate session-id
export const initApiBase = (): void => {
  try {
    const env: any = (import.meta as any).env || {};
    const isLocalOnly = env?.VITE_LOCAL_ONLY === true || env?.VITE_LOCAL_ONLY === 'true';
    const base = env?.VITE_API_BASE_URL as string | undefined;
    if (isLocalOnly || !base) return; // No-op for local-only or missing base

    const originalFetch = window.fetch.bind(window);

    const getSessionId = (): string => {
      try {
        const key = 'wa.sessionId';
        const existing = localStorage.getItem(key);
        if (existing) return existing;
        const sid = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? (globalThis.crypto as any).randomUUID()
          : Math.random().toString(36).slice(2);
        localStorage.setItem(key, sid);
        return sid;
      } catch {
        return Math.random().toString(36).slice(2);
      }
    };

    const ensureHeadersWithSession = (headers?: HeadersInit): Record<string, string> => {
      const merged: Record<string, string> = {};
      try {
        if (headers instanceof Headers) {
          for (const [k, v] of (headers as any).entries()) merged[k] = String(v);
        } else if (Array.isArray(headers)) {
          for (const [k, v] of headers as any) merged[String(k)] = String(v);
        } else if (headers && typeof headers === 'object') {
          Object.assign(merged, headers as Record<string, string>);
        }
      } catch {}
      merged['session-id'] = merged['session-id'] || getSessionId();
      return merged;
    };

    const toAbsoluteApiUrl = (inputUrl: string): string => {
      try {
        const u = new URL(inputUrl, location.origin);
        if (!u.pathname.startsWith('/api')) return inputUrl; // not our API
        const b = base.replace(/\/?$/, '');
        const path = u.pathname.replace(/^\//, '/');
        const abs = `${b}${path}${u.search}`;
        return abs;
      } catch {
        return inputUrl;
      }
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        if (typeof input === 'string' || input instanceof URL) {
          const urlStr = String(input);
          const abs = toAbsoluteApiUrl(urlStr);
          if (abs !== urlStr) {
            const headers = ensureHeadersWithSession(init?.headers);
            return originalFetch(abs, { ...(init || {}), headers });
          }
          return originalFetch(input as any, init);
        } else {
          const req = input as Request;
          const abs = toAbsoluteApiUrl(req.url);
            // Merge original request headers + init override headers to avoid dropping custom x-user-lat/lng
          const combinedInitHeaders: Record<string,string> = {};
          try {
            (req.headers as any).forEach((v: string, k: string) => { combinedInitHeaders[k] = v; });
          } catch {}
          if (init?.headers) {
            if (init.headers instanceof Headers) {
              (init.headers as any).forEach((v: string, k: string) => { combinedInitHeaders[k] = v; });
            } else if (Array.isArray(init.headers)) {
              for (const [k,v] of init.headers as any) combinedInitHeaders[String(k)] = String(v);
            } else if (typeof init.headers === 'object') {
              Object.assign(combinedInitHeaders, init.headers as any);
            }
          }
          if (abs !== req.url) {
            const headers = ensureHeadersWithSession(combinedInitHeaders);
            const newInit: RequestInit = {
              method: req.method,
              headers,
              body: req.method.toUpperCase() === 'GET' || req.method.toUpperCase() === 'HEAD' ? undefined : (init?.body ?? (req as any).body),
              credentials: (init?.credentials ?? (req as any).credentials) as RequestCredentials | undefined,
              mode: init?.mode ?? (req as any).mode,
              cache: init?.cache ?? (req as any).cache,
              redirect: init?.redirect ?? (req as any).redirect,
              referrer: init?.referrer ?? (req as any).referrer,
              referrerPolicy: init?.referrerPolicy ?? (req as any).referrerPolicy,
              integrity: init?.integrity ?? (req as any).integrity,
              keepalive: init?.keepalive ?? (req as any).keepalive,
              signal: init?.signal ?? (req as any).signal,
            };
            return originalFetch(abs, newInit);
          }
          return originalFetch(req as any, init);
        }
      } catch {
        return originalFetch(input as any, init);
      }
    };
  } catch {
    // ignore
  }
};

// Optional default export for consumers expecting a default
export default { initApiBase };
