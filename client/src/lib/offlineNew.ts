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
export async function routeApiCall(method: string, path: string, body?: any): Promise<Response> {
  // If not in mobile standalone mode, let the call go to the server
  if (!isMobileStandalone()) {
    return fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  // Mobile standalone mode - handle locally
  try {
    switch (path) {
      case '/api/session':
        if (method === 'GET') {
          const result = await standaloneApi.getSession();
          return createJsonResponse(result);
        }
        break;

      case '/api/preferences':
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
        break;

      case '/api/itinerary':
        if (method === 'GET') {
          const result = await standaloneApi.getItinerary();
          return createJsonResponse(result);
        } else if (method === 'PUT') {
          const result = await standaloneApi.updateItinerary(body.places);
          return createJsonResponse(result);
        }
        break;

      default:
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
