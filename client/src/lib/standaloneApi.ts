// STANDALONE MOBILE API - NO FETCH INTERCEPTION
// Direct API implementations for mobile app without server dependencies

import { searchFoursquarePlacesLocal, quickSearchLocal, generatePlanLocal } from './localApi';

type LatLng = { lat: number; lng: number };

type Place = {
  fsqPlaceId: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  estimatedDuration?: number;
  scheduledTime?: string;
  order?: number;
  reason?: string;
  [k: string]: any;
};

type UserPreferences = {
  interests: string[];
  duration: string;
  budget?: string;
  groupSize?: number;
  transportMode?: string;
  travelStyle?: string;
  // keep compatibility
  dietaryRestrictions?: string[];
  transportation?: string;
};

type Itinerary = {
  places: Place[];
  totalDistance: number;
  totalDuration: number;
  routeGeometry?: Array<LatLng>;
  osrmInstructions?: string[][];
  multiDay?: any;
};

const STORAGE_KEYS = {
  session: 'wa.sessionId',
  preferences: 'wa.preferences',
  itinerary: 'wa.itinerary',
  location: 'wa.location',
};

// Environment detection
export const isMobileStandalone = () => {
  const isMobile = typeof (globalThis as any).Capacitor !== 'undefined';
  const isLocalOnly = (import.meta as any).env?.VITE_LOCAL_ONLY === 'true' || (import.meta as any).env?.VITE_LOCAL_ONLY === true;
  const result = isMobile && isLocalOnly;
  
  // Debug logging
  console.log('isMobileStandalone debug:', {
    isMobile,
    isLocalOnly,
    viteLocalOnly: (import.meta as any).env?.VITE_LOCAL_ONLY,
    viteLocalOnlyType: typeof (import.meta as any).env?.VITE_LOCAL_ONLY,
    result,
    capacitorExists: typeof (globalThis as any).Capacitor,
    allEnvVars: (import.meta as any).env
  });
  
  return result;
};

// Session management
function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.session);
  if (existing) return existing;
  
  const sessionId = (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : Math.random().toString(36).slice(2);
  localStorage.setItem(STORAGE_KEYS.session, sessionId);
  return sessionId;
}

// Haversine distance calculation
function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371; // km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple nearest-neighbor optimization as fallback
function optimizePlaces(places: Place[]): Place[] {
  if (places.length <= 2) return places;
  const optimized = [places[0]];
  const remaining = places.slice(1);
  while (remaining.length) {
    const current = optimized[optimized.length - 1];
    let bestIdx = 0;
    let best = Infinity;
    remaining.forEach((p, i) => {
      const d = calculateDistance({ lat: current.latitude, lng: current.longitude }, { lat: p.latitude, lng: p.longitude });
      if (d < best) { best = d; bestIdx = i; }
    });
    optimized.push(remaining.splice(bestIdx, 1)[0]);
  }
  return optimized.map((p, i) => ({ ...p, order: i + 1 }));
}

// ---------------- OSRM HELPERS (no server) ----------------
const OSRM_BASE = 'https://router.project-osrm.org';

type Profile = 'foot' | 'driving' | 'bicycle';
function toProfile(transport?: string): Profile {
  switch ((transport || '').toLowerCase()) {
    case 'driving': return 'driving';
    case 'cycling': return 'bicycle';
    default: return 'foot';
  }
}

async function osrmRouteGeojson(coords: LatLng[], profile: Profile): Promise<{ totalDistanceKm: number; totalDurationMin: number; geometry: LatLng[]; legDistancesKm: number[]; legDurationsMin: number[]; }> {
  if (coords.length < 2) return { totalDistanceKm: 0, totalDurationMin: 0, geometry: coords, legDistancesKm: [], legDurationsMin: [] };
  const coordStr = coords.map(c => `${c.lng},${c.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/${profile}/${coordStr}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data: any = await res.json();
  const route = data?.routes?.[0];
  const geometry: LatLng[] = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates.map((c: [number, number]) => ({ lat: c[1], lng: c[0] })) : [];
  const legs: any[] = Array.isArray(route?.legs) ? route.legs : [];
  const legDistancesKm = legs.map((l: any) => (l?.distance ?? 0) / 1000);
  const legDurationsMin = legs.map((l: any) => (l?.duration ?? 0) / 60);
  return {
    totalDistanceKm: (route?.distance ?? 0) / 1000,
    totalDurationMin: (route?.duration ?? 0) / 60,
    geometry,
    legDistancesKm,
    legDurationsMin,
  };
}

// ---------------- Core API ----------------

// Generate places near location using Foursquare, then plan with Gemini, then route with OSRM
export const standaloneApi = {
  // Session endpoint
  async getSession(): Promise<{ sessionId: string }> {
    return { sessionId: getOrCreateSessionId() };
  },

  // Preferences endpoint
  async savePreferences(preferences: UserPreferences): Promise<{ success: boolean; sessionId: string; preferences: UserPreferences }> {
    const sessionId = getOrCreateSessionId();
    localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
    return { success: true, sessionId, preferences };
  },

  async getPreferences(): Promise<{ success: boolean; preferences: UserPreferences | null }> {
    const stored = localStorage.getItem(STORAGE_KEYS.preferences);
    const preferences = stored ? JSON.parse(stored) : null;
    return { success: true, preferences };
  },

  // Location endpoint
  async saveLocation(location: LatLng): Promise<{ success: boolean; location: LatLng }> {
    localStorage.setItem(STORAGE_KEYS.location, JSON.stringify(location));
    return { success: true, location };
  },

  async getLocation(): Promise<{ success: boolean; location: LatLng | null }> {
    const stored = localStorage.getItem(STORAGE_KEYS.location);
    const location = stored ? JSON.parse(stored) : null;
    return { success: true, location };
  },

  // Itinerary generation (Foursquare + Gemini + OSRM)
  async generateItinerary(): Promise<{ success: boolean; itinerary: Itinerary }> {
    // Get stored preferences and location
    const { preferences } = await this.getPreferences();
    const { location } = await this.getLocation();
    if (!preferences || !location) throw new Error('Missing preferences or location data');

    const ll = `${location.lat},${location.lng}`;    // 1) Discover places from Foursquare with fallback search terms
    let fsqResults: any[] = [];
    try {
      const primaryInterest = (preferences.interests && preferences.interests[0]) ? preferences.interests[0] : 'attractions';
      
      // Try primary search first
      fsqResults = await searchFoursquarePlacesLocal({ ll, query: primaryInterest, limit: 20, radius: 4000, sort: 'relevance' });
      
      // If no results, try broader fallback searches
      if (fsqResults.length === 0) {
        console.log('[Mobile Debug] No results for primary search, trying fallbacks...');
        
        // Try category-based search for popular POI types
        const fallbackCategories = [
          '16000', // Landmarks and Outdoors
          '10000', // Arts & Entertainment
          '12000', // Food
          '13000', // Nightlife Spots
          '15000', // Recreation
          '17000', // Retail
          '18000', // Travel & Transport
        ];
        
        for (const category of fallbackCategories) {
          if (fsqResults.length > 0) break;
          try {
            console.log(`[Mobile Debug] Trying category search: ${category}`);
            fsqResults = await searchFoursquarePlacesLocal({ ll, categories: category, limit: 20, radius: 4000, sort: 'rating' });
          } catch (e) {
            console.warn(`[Mobile Debug] Category search failed for ${category}:`, e);
          }
        }
        
        // If still no results, try generic searches
        if (fsqResults.length === 0) {
          const genericTerms = ['restaurant', 'tourist', 'landmark', 'museum', 'park', 'shopping'];
          for (const term of genericTerms) {
            if (fsqResults.length > 0) break;
            try {
              console.log(`[Mobile Debug] Trying generic search: ${term}`);
              fsqResults = await searchFoursquarePlacesLocal({ ll, query: term, limit: 20, radius: 5000, sort: 'rating' });
            } catch (e) {
              console.warn(`[Mobile Debug] Generic search failed for ${term}:`, e);
            }
          }
        }
      }
      
      console.log(`[Mobile Debug] Final search results count: ${fsqResults.length}`);
    } catch (e) {
      console.error('[Mobile Debug] All Foursquare searches failed:', e);
      // If FS fails, continue with empty and Gemini will fallback or we will create naive list
      fsqResults = [];
    }

    // Map FS to simplified sample for LLM
    const samplePlaces = fsqResults.slice(0, 20).map((p: any, idx: number) => ({
      fsqPlaceId: p.fsq_place_id,
      name: p.name,
      category: p.categories?.[0]?.name || '',
      latitude: p.latitude,
      longitude: p.longitude,
      rating: p.rating,
      order: idx + 1,
      estimatedDuration: 45,
    }));

    // 2) Ask Gemini to assemble a single-day plan (if key present); fallback to top-rated otherwise
    let planned: { places: Array<{ fsqPlaceId: string; name: string; category?: string; estimatedDuration?: number; scheduledTime?: string; order?: number; reason?: string }>; totalDuration?: number; recommendations?: string[] } = { places: [] } as any;
    try {
      planned = await generatePlanLocal({
        interests: preferences.interests,
        duration: preferences.duration,
        budget: preferences.budget,
        dietaryRestrictions: preferences.dietaryRestrictions as any,
        transportation: (preferences.transportation || preferences.transportMode || 'walking') as any,
        location,
        flights: null,
        places: samplePlaces,
        tripDetails: { startAirport: '', destinationCity: '', startDate: '', endDate: '' }
      });
    } catch {
      // fallback below
    }

    let chosenPlaces: Place[] = [];
    if (planned && Array.isArray(planned.places) && planned.places.length) {
      // Resolve coordinates from FS results
      const byId = new Map<string, any>(fsqResults.map((r) => [String(r.fsq_place_id), r]));
      chosenPlaces = planned.places
        .map((p, i) => {
          const full = byId.get(String(p.fsqPlaceId));
          return full ? ({
            fsqPlaceId: String(p.fsqPlaceId),
            name: p.name || full.name,
            category: p.category || (full.categories?.[0]?.name || ''),
            latitude: Number(full.latitude),
            longitude: Number(full.longitude),
            rating: full.rating,
            estimatedDuration: Number(p.estimatedDuration ?? 45),
            scheduledTime: p.scheduledTime,
            order: Number(p.order ?? i + 1),
            reason: p.reason,
            address: full.location?.formatted_address,
            photos: full.photos,
            website: full.website,
            tel: full.tel,
          } as Place) : null;
        })
        .filter(Boolean) as Place[];
    }

    if (!chosenPlaces.length) {
      // Fallback: top 5 Foursquare results ordered by rating then distance
      const top = fsqResults
        .slice()
        .sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)))
        .slice(0, 5)
        .map((full: any, i: number) => ({
          fsqPlaceId: String(full.fsq_place_id),
          name: full.name,
          category: full.categories?.[0]?.name || '',
          latitude: Number(full.latitude),
          longitude: Number(full.longitude),
          rating: full.rating,
          estimatedDuration: 45,
          order: i + 1,
        } as Place));
      chosenPlaces = optimizePlaces(top);
    }

    // 3) Compute route with OSRM
    const profile = toProfile(preferences.transportation || preferences.transportMode || 'walking');
    const via: LatLng[] = [location, ...chosenPlaces.map((p) => ({ lat: p.latitude, lng: p.longitude }))];
    const route = await osrmRouteGeojson(via, profile);

    // apply leg metrics to places
    const placesWithLegs = chosenPlaces.map((p, idx) => ({
      ...p,
      travelTimeToNext: route.legDurationsMin[idx] ?? undefined,
      distanceToNext: route.legDistancesKm[idx] ?? undefined,
      order: idx + 1,
    }));

    const itinerary: Itinerary = {
      places: placesWithLegs,
      totalDistance: Math.round(route.totalDistanceKm * 10) / 10,
      totalDuration: Math.round(route.totalDurationMin),
      routeGeometry: route.geometry,
      recommendations: (planned as any)?.recommendations || [],
    } as any;

    // Save generated itinerary
    localStorage.setItem(STORAGE_KEYS.itinerary, JSON.stringify(itinerary));
    return { success: true, itinerary };
  },

  // Get itinerary
  async getItinerary(): Promise<{ success: boolean; itinerary: Itinerary | null }> {
    const stored = localStorage.getItem(STORAGE_KEYS.itinerary);
    const itinerary = stored ? JSON.parse(stored) : null;
    return { success: true, itinerary };
  },

  // Persist only multiDay metadata on itinerary (no place changes)
  async saveMultiDay(multiDay: any): Promise<{ success: boolean; itinerary: Itinerary }> {
    const stored = localStorage.getItem(STORAGE_KEYS.itinerary);
    const existing: Itinerary | null = stored ? JSON.parse(stored) : null;
    const itinerary: Itinerary = {
      places: existing?.places || [],
      totalDistance: existing?.totalDistance || 0,
      totalDuration: existing?.totalDuration || 0,
      routeGeometry: existing?.routeGeometry || [],
      osrmInstructions: existing?.osrmInstructions,
      multiDay,
    } as any;
    localStorage.setItem(STORAGE_KEYS.itinerary, JSON.stringify(itinerary));
    return { success: true, itinerary };
  },

  // Update itinerary (recompute totals and geometry)
  async updateItinerary(places: Place[]): Promise<{ success: boolean; itinerary: Itinerary }> {
    const { location } = await this.getLocation();
    const { preferences } = await this.getPreferences();
    if (!location) throw new Error('No location set');
    const profile = toProfile(preferences?.transportation || preferences?.transportMode || 'walking');

    const normalized = places.map((p, i) => ({ ...p, order: i + 1 })) as Place[];
    const via: LatLng[] = [location, ...normalized.map((p) => ({ lat: p.latitude, lng: p.longitude }))];
    const route = await osrmRouteGeojson(via, profile);

    const withLegs = normalized.map((p, idx) => ({
      ...p,
      travelTimeToNext: route.legDurationsMin[idx] ?? p.travelTimeToNext,
      distanceToNext: route.legDistancesKm[idx] ?? p.distanceToNext,
    }));

    const itinerary: Itinerary = {
      places: withLegs,
      totalDistance: Math.round(route.totalDistanceKm * 10) / 10,
      totalDuration: Math.round(route.totalDurationMin),
      routeGeometry: route.geometry,
    };
    localStorage.setItem(STORAGE_KEYS.itinerary, JSON.stringify(itinerary));
    return { success: true, itinerary };
  },

  // Route optimization API used by Optimize button
  async optimizeItinerary(places: Place[]): Promise<{ success: boolean; itinerary: Itinerary }> {
    const { location } = await this.getLocation();
    const { preferences } = await this.getPreferences();
    if (!location) throw new Error('No location set');
    const optimized = optimizePlaces(places);
    return this.updateItinerary(optimized);
  },
  // Quick places (coffee, ATM, restroom) via Foursquare
  async getQuickPlaces(type: 'coffee' | 'atm' | 'restroom', llOverride?: string): Promise<{ success: boolean; results: any[] }> {
    console.log('[Standalone Debug] getQuickPlaces called with type:', type, 'llOverride:', llOverride);
    
    let ll = llOverride;
    if (!ll) {
      const { location } = await this.getLocation();
      console.log('[Standalone Debug] Retrieved location:', location);
      if (location) ll = `${location.lat},${location.lng}`;
    }
    console.log('[Standalone Debug] Using ll:', ll);
    
    if (!ll) return { success: true, results: [] };
    
    try {
      const results = await quickSearchLocal(type, ll);
      console.log('[Standalone Debug] quickSearchLocal returned:', results?.length || 0, 'results');
      return { success: true, results };
    } catch (error: any) {
      console.error('[Standalone Debug] Error in getQuickPlaces:', error);
      throw error;
    }
  }
};
