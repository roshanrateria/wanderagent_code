import { MobileApiService } from './MobileApiService';
import { Http } from '@capacitor-community/http';
import { Capacitor } from '@capacitor/core';


export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  price?: number;
  photos?: string[];
  hours?: string;
  phone?: string;
  website?: string;
  description?: string;
}

export interface SearchParams {
  query?: string;
  latitude: number;
  longitude: number;
  radius?: number;
  categories?: string[];
  limit?: number;
}

export class FoursquareService {
  private apiService: MobileApiService;
  private apiKey: string;
  private apiVersion: string;
  private readonly baseUrl = 'https://places-api.foursquare.com/places';

  constructor() {
    this.apiService = MobileApiService.getInstance();
    // Prefer Vite-injected envs for mobile build, fall back to process.env if present
    this.apiKey =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FOURSQUARE_API_KEY) ||
      (process.env as any)?.VITE_FOURSQUARE_API_KEY ||
      '';
    const rawVersion =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FOURSQUARE_API_VERSION) ||
      (process.env as any)?.VITE_FOURSQUARE_API_VERSION ||
      '2025-06-17';
    this.apiVersion = /^\d{8}$/.test(rawVersion)
      ? `${rawVersion.slice(0, 4)}-${rawVersion.slice(4, 6)}-${rawVersion.slice(6)}`
      : rawVersion;
  }

  /**
   * Platform-aware JSON request:
   * - Prefer Capacitor native Http plugin (bypasses WebView fetch/XHR interceptor)
   * - Fallback to MobileApiService.makeRequest(...) which is your existing network + cache layer
   *
   * Returns parsed JSON (object or array) in the same shape your code expects.
   */
  private async platformRequestJson(
    url: string,
    opts: { method?: string; headers?: Record<string, string>; body?: any } = {},
    cacheKey?: string
  ): Promise<any> {
    // Build method and headers
    const method = (opts.method || 'GET').toUpperCase();
    const headers = Object.assign({}, opts.headers || {});

    // Debug: log outgoing headers (without printing actual key in prod; useful in dev)
    console.log('[FSQ] platformRequestJson -> url:', url);
    console.log('[FSQ] platformRequestJson -> method:', method);
    const isNative = typeof Capacitor !== 'undefined' && (Capacitor.isNativePlatform?.() || ['android','ios'].includes(Capacitor.getPlatform?.() || ''));

    // Try Capacitor native HTTP plugin first on native
    try {
      if (isNative && typeof Http !== 'undefined' && (Http as any).request) {
        const requestConfig: any = { method, url, headers };
        if (method !== 'GET' && typeof opts.body !== 'undefined') {
          try { requestConfig.data = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body; } catch { requestConfig.data = opts.body; }
        }

        const r = await Http.request(requestConfig);
        const status = r.status ?? 0;
        console.log(`[FSQ][native-http] status=${status} url=${url}`);

        // If non-2xx, include error text for debugging
        if (status < 200 || status >= 300) {
          let dbg = '';
          try { dbg = typeof r.data === 'string' ? r.data : JSON.stringify(r.data); } catch { dbg = String(r.data); }
          const err = new Error(`[FSQ][native-http] HTTP ${status} - ${dbg}`);
          (err as any).status = status; (err as any).body = r.data;
          throw err;
        }

        // Return parsed JSON (if string, parse cautiously)
        if (typeof r.data === 'string') {
          const s = r.data.trim();
          const ct = String((r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '').toLowerCase();
          if (!ct.includes('application/json') && s.startsWith('<')) {
            const err: any = new Error('Got HTML from FSQ instead of JSON');
            err.status = status; err.body = s.slice(0, 400);
            throw err;
          }
          try { return s ? JSON.parse(s) : null; } catch (e) {
            const ex: any = new Error(`Invalid JSON from FSQ: ${(e as any)?.message || e}`);
            ex.status = status; ex.body = s.slice(0, 400);
            throw ex;
          }
        }
        return r.data;
      }
    } catch (nativeErr) {
      console.warn('[FSQ] Capacitor native Http.request failed, will use fallback fetch', nativeErr);
      // Fall through to fallback path
    }

    // Fallback: Use MobileApiService (may include caching)
    try {
      const resp = await this.apiService.makeRequest<any>(url, { headers }, cacheKey);
      return resp;
    } catch (fallbackErr) {
      console.error('[FSQ] fallback MobileApiService.makeRequest failed', fallbackErr);
      throw new Error('Network request failed (native + fallback).');
    }
  }

  public async searchPlaces(params: SearchParams): Promise<Place[]> {
    if (!this.apiKey) {
      throw new Error('Foursquare API key is not configured');
    }

    const url = new URL(`${this.baseUrl}/search`);
    // DO NOT ENCODE COMMA TO ENSURE PROPER LAT/LNG FORMAT
    url.searchParams.append('ll', `${params.latitude},${params.longitude}`);

    if (params.query) {
      url.searchParams.append('query', params.query);
    }

    if (params.radius) {
      url.searchParams.append('radius', params.radius.toString());
    }

    // Only append fsq_category_ids if IDs look like valid FSQ category ids (24 hex chars)
    if (params.categories?.length) {
      const fsqIds = params.categories.filter((id) => /^[0-9a-f]{24}$/i.test(id));
      if (fsqIds.length) {
        url.searchParams.append('fsq_category_ids', fsqIds.join(','));
      }
    }

    url.searchParams.append('limit', (params.limit || 20).toString());

    const cacheKey = `foursquare_search_${url.toString()}`;

    const headers: Record<string, string> = {
      // Required headers per Foursquare Places API
      accept: 'application/json',
      authorization: `Bearer ${this.apiKey}`,
      'X-Places-Api-Version': this.apiVersion,
    };

    // Helpful debug logs
    console.log('[FSQ] searchPlaces -> url:', url.toString());
    console.log('[FSQ] searchPlaces -> headers present:', {
      hasAuthorization: Boolean(headers.authorization),
      apiVersion: headers['X-Places-Api-Version'],
    });

    try {
      // Un-encode ALL commas in the final URL
      const urlStr = url.toString().replace(/%2C/gi, ',');
      console.log('[FSQ] searchPlaces -> final URL:', urlStr);
      const json = await this.platformRequestJson(urlStr, { method: 'GET', headers }, cacheKey);
      return this.parsePlacesResponse(json);
    } catch (error: any) {
      // Provide helpful debug output while keeping error message user-friendly
      console.error('[FSQ] Error searching places:', {
        message: error?.message,
        status: error?.status ?? 'unknown',
        body: error?.body ?? undefined,
      });
      throw new Error('Failed to search places. Please try again.');
    }
  }

  public async getPlaceDetails(placeId: string): Promise<Place | null> {
    if (!this.apiKey) {
      throw new Error('Foursquare API key is not configured');
    }

    const url = `${this.baseUrl}/${encodeURIComponent(placeId)}`;
    const cacheKey = `foursquare_place_${placeId}`;

    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${this.apiKey}`,
      'X-Places-Api-Version': this.apiVersion,
    };

    console.log('[FSQ] getPlaceDetails -> url:', url);

    try {
      const json = await this.platformRequestJson(url, { method: 'GET', headers }, cacheKey);
      return this.parsePlace(json);
    } catch (error: any) {
      console.error('[FSQ] Error getting place details:', {
        message: error?.message,
        status: error?.status ?? 'unknown',
        body: error?.body ?? undefined,
      });
      return null;
    }
  }

  public async getNearbyAttractions(latitude: number, longitude: number): Promise<Place[]> {
    return this.searchPlaces({
      latitude,
      longitude,
      limit: 10,
    });
  }

  public async getNearbyRestaurants(latitude: number, longitude: number): Promise<Place[]> {
    return this.searchPlaces({
      latitude,
      longitude,
      limit: 10,
    });
  }

  public async getNearbyHotels(latitude: number, longitude: number): Promise<Place[]> {
    return this.searchPlaces({
      latitude,
      longitude,
      limit: 10,
    });
  }

  private parsePlacesResponse(response: any): Place[] {
    if (!response) {
      return [];
    }

    // Foursquare's v3 returns an object with "results" array for /search
    const results = Array.isArray(response.results) ? response.results : Array.isArray(response) ? response : [];
    if (!results || !Array.isArray(results)) {
      return [];
    }

    return results.map((place: any) => this.parsePlace(place)).filter(Boolean) as Place[];
  }

  private parsePlace(place: any): Place | null {
    try {
      if (!place || !place.name) {
        return null;
      }

      // Note: Foursquare v3 uses geocodes.main.latitude/longitude
      const lat =
        place.latitude ??
        place.location?.lat ??
        place.geocodes?.main?.latitude ??
        (place.geocodes?.main?.lat ?? 0);
      const lng =
        place.longitude ??
        place.location?.lng ??
        place.geocodes?.main?.longitude ??
        (place.geocodes?.main?.lng ?? 0);

      const photos: string[] = Array.isArray(place.photos)
        ? place.photos.map((photo: any) => {
            // Many FSQ photo objects have prefix/suffix
            if (photo?.prefix && photo?.suffix) {
              return `${photo.prefix}300x300${photo.suffix}`;
            }
            // Some responses contain a single href/url in 'photo' or 'image'
            if (photo?.url) return photo.url;
            return '';
          }).filter(Boolean)
        : [];

      const location = place.location || place.location_display || {};

      return {
        id: place.fsq_place_id || place.fsq_id || place.id || '',
        name: place.name || '',
        category: place.categories?.[0]?.name || 'Unknown',
        address: this.formatAddress(location),
        latitude: Number(lat) || 0,
        longitude: Number(lng) || 0,
        rating: typeof place.rating !== 'undefined' ? place.rating : undefined,
        price: typeof place.price !== 'undefined' ? place.price : undefined,
        photos,
        hours: place.hours?.display || undefined,
        phone: place.tel || place.phone || undefined,
        website: place.website || undefined,
        description: place.description || undefined,
      };
    } catch (error) {
      console.error('Error parsing place:', error);
      return null;
    }
  }

  private formatAddress(location: any): string {
    if (!location) return '';

    const parts = [
      location.address,
      location.neighborhood,
      location.locality,
      location.region,
      location.postcode,
      location.country,
    ].filter(Boolean);

    return parts.join(', ');
  }
}
