// SIMPLIFIED OFFLINE ROUTER - NO FETCH INTERCEPTION
// Routes API calls to standalone implementations for mobile or passes through to server for web

import { standaloneApi, isMobileStandalone } from './standaloneApi';

// Helper to create JSON responses
function createJsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// API router that decides between standalone (mobile) or server (web)
export async function routeApiCall(method: string, path: string, body?: any, sessionId?: string): Promise<Response> {
  // If not in mobile standalone mode, let the call go to the server
  if (!isMobileStandalone()) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionId) {
      headers['session-id'] = sessionId;
    }
    
    return fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include"
    });
  }

  // Mobile standalone mode - handle locally
  try {
    // Parse path and query for quick endpoints
    const [purePath, queryString] = path.split('?');
    const qs = new URLSearchParams(queryString || '');

    // Only allow itinerary, preferences, location, and quick endpoints
    switch (purePath) {
      case '/api/session':
        if (method === 'GET') {
          const result = await standaloneApi.getSession();
          return createJsonResponse(result);
        }
        break;      case '/api/preferences':
        if (method === 'POST') {
          const result = await standaloneApi.savePreferences(body);
          return createJsonResponse(result);
        } else if (method === 'GET') {
          const result = await standaloneApi.getPreferences();
          return createJsonResponse(result);
        }
        break;

      case '/api/location':
        if (method === 'POST') {
          const result = await standaloneApi.saveLocation(body);
          return createJsonResponse(result);
        } else if (method === 'GET') {
          const result = await standaloneApi.getLocation();
          return createJsonResponse(result);
        }
        break;

      case '/api/generate-itinerary':
        if (method === 'POST') {
          const result = await standaloneApi.generateItinerary();
          return createJsonResponse(result);
        }
        break;      case '/api/itinerary':
        if (method === 'GET') {
          const result = await standaloneApi.getItinerary();
          return createJsonResponse(result);
        } else if (method === 'PUT') {
          if (body && Array.isArray(body.places)) {
            const result = await standaloneApi.updateItinerary(body.places);
            return createJsonResponse(result);
          }
          if (body && body.multiDay) {
            const result = await standaloneApi.saveMultiDay(body.multiDay);
            return createJsonResponse(result);
          }
          return createJsonResponse({ success: false, message: 'No changes provided' }, 400);
        }
        break;
      case '/api/optimize-route':
        if (method === 'POST') {
          const places = Array.isArray(body?.places) ? body.places : undefined;
          if (places && places.length >= 2) {
            const result = await standaloneApi.optimizeItinerary(places);
            return createJsonResponse(result);
          } else {
            // Fallback to stored itinerary if places not provided
            const current = await standaloneApi.getItinerary();
            const storedPlaces = current?.itinerary?.places || [];
            if (Array.isArray(storedPlaces) && storedPlaces.length >= 2) {
              const result = await standaloneApi.optimizeItinerary(storedPlaces as any);
              return createJsonResponse(result);
            }
            return createJsonResponse({ success: false, message: 'At least 2 places with coordinates are required to optimize' }, 400);
          }
        }
        break;
      default:
        // Handle quick endpoints, allow optional lat/lng or ll in query
        if (purePath.startsWith('/api/quick/')) {
          const type = purePath.split('/')[3] as 'coffee' | 'atm' | 'restroom';
          let llOverride: string | undefined;
          const ll = qs.get('ll');
          const lat = qs.get('lat');
          const lng = qs.get('lng');
          if (ll) llOverride = ll;
          else if (lat && lng) llOverride = `${lat},${lng}`;
          const result = await standaloneApi.getQuickPlaces(type, llOverride);
          return createJsonResponse(result);
        }
        // No flights or other server-only features
        return createJsonResponse({ success: false, message: 'Endpoint not available offline' }, 404);
    }
  } catch (error: any) {
    return createJsonResponse({ success: false, message: error.message }, 500);
  }

  return createJsonResponse({ success: false, message: 'Method not allowed' }, 405);
}

// Initialize function - no fetch interception, just exports the router
export function initOfflineMode() {
  // No-op - we use direct routing instead of fetch interception
  console.log('Offline mode initialized:', isMobileStandalone() ? 'Standalone Mobile' : 'Web Server');
}

// NOTE: In local native mode, external APIs (Foursquare, Gemini) are called directly
// via Capacitor Community HTTP plugin to avoid localhost proxy and ensure headers
// like X-Places-Api-Version are preserved.