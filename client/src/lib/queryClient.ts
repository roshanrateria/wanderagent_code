import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { routeApiCall } from './offline';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // On some mobile WebView/polyfills, Response.clone() may not isolate the body stream.
    // Avoid consuming the body on mobile to prevent "body stream already read" errors later.
    const isMobile = typeof (globalThis as any).Capacitor !== 'undefined';
    let msg = res.statusText || `HTTP ${res.status}`;
    if (!isMobile) {
      try {
        const clone = res.clone();
        const ct = clone.headers.get('content-type') || '';
        if (ct.toLowerCase().includes('application/json')) {
          const j = await clone.json();
          msg = (j && (j.message || j.error)) || JSON.stringify(j).slice(0, 200);
        } else {
          const t = await clone.text();
          msg = (t || '').slice(0, 200);
        }
      } catch (e: any) {
        // Fall back to status text
        msg = res.statusText || e?.message || msg;
      }
    }
    console.error('[api] throwIfResNotOk triggered', { status: res.status, snippet: msg });
    console.error(new Error().stack);
    throw new Error(`${res.status}: ${msg}`);
  }
}


export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  sessionId?: string,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (sessionId) {
    headers["session-id"] = sessionId;
  }

  // Use the routing function instead of direct fetch
  const res = await routeApiCall(method, url, data, sessionId);

  await throwIfResNotOk(res);

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  sessionId?: string;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, sessionId }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers["session-id"] = sessionId;
    }
    
    const url = queryKey.join("/") as string;

    // Always go through the router so mobile standalone works without a server
    const res = await routeApiCall('GET', url, undefined, sessionId);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);

    // On mobile, skip any validation that would read the body before callers.
    const isMobile = typeof (globalThis as any).Capacitor !== 'undefined';
    if (isMobile) {
      return await res.json();
    }

    // Guard: validate JSON content-type for API routes (web only)
    const ct = res.headers.get('content-type') || '';
    if (typeof url === 'string' && url.startsWith('/api') && !ct.toLowerCase().includes('application/json')) {
      // Read body only here on web to surface a helpful error
      const text = await res.text();
      const snippet = (text || '').slice(0, 200);
      throw new Error(`${res.status}: Expected JSON, got ${ct || 'unknown content-type'}${snippet ? ` - ${snippet}` : ''}`);
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
