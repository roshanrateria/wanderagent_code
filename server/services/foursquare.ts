import dotenv from "dotenv";
dotenv.config();

export interface FoursquarePlace {
  fsq_place_id: string;
  name: string;
  categories: Array<{
    fsq_category_id: string;
    name: string;
    short_name: string;
    plural_name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  location: {
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    formatted_address?: string;
  };
  latitude: number;
  longitude: number;
  distance?: number;
  rating?: number;
  price?: number;
  description?: string;
  website?: string;
  tel?: string;
  email?: string;
  photos?: Array<{
    prefix: string;
    suffix: string;
    width: number;
    height: number;
  }>;
  social_media?: any;
  placemaker_url?: string;
  hours?: { display?: string; open_now?: boolean };
}

export interface FoursquareSearchResponse {
  results: FoursquarePlace[];
  context: {
    geo_bounds: {
      circle: {
        center: {
          latitude: number;
          longitude: number;
        };
        radius: number;
      };
    };
  };
}

const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY || "KTPYB5EGQST4HPZERYDABLDWGZXKLKXW3VI200RJUYCLOWJ0";
const FOURSQUARE_API_VERSION = process.env.FOURSQUARE_API_VERSION || '2025-06-17';
const BASE_URL = "https://places-api.foursquare.com/places";

export class FoursquareService {
  private headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${FOURSQUARE_API_KEY}`,
    // API version header; overridable via env FOURSQUARE_API_VERSION
    'X-Places-Api-Version': FOURSQUARE_API_VERSION
  };

  private async fetchJson(url: string, init?: RequestInit, retries = 1): Promise<any> {
    const attempt = async (): Promise<any> => {
      const response = await fetch(url, { ...(init || {}), headers: { ...this.headers, ...(init?.headers || {}) } });

      const contentType = response.headers.get('content-type') || '';

      // Handle rate limiting with a friendly error and optional retry
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') || 1);
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000));
          return attempt();
        }
        let bodyText = '';
        try { bodyText = await response.text(); } catch {}
        const err = new Error(`Foursquare rate limit exceeded (429). ${bodyText?.slice(0, 200)}`);
        // @ts-ignore tag for upstream handling
        (err as any).status = 429;
        throw err;
      }

      // Non-OK responses: try to parse JSON error, else use text
      if (!response.ok) {
        let errorPayload: any = undefined;
        if (contentType.includes('application/json')) {
          try { errorPayload = await response.json(); } catch {}
        }
        if (!errorPayload) {
          try { errorPayload = { message: await response.text() }; } catch { errorPayload = { message: response.statusText }; }
        }
        const msg = typeof errorPayload === 'string' ? errorPayload : (errorPayload?.message || JSON.stringify(errorPayload));
        const err = new Error(`Foursquare API error: ${response.status} ${msg}`);
        // @ts-ignore tag for upstream handling
        (err as any).status = response.status;
        throw err;
      }

      // OK responses: ensure JSON
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        try { return JSON.parse(text); } catch {
          throw new Error(`Unexpected non-JSON response from Foursquare (content-type: ${contentType}). Body: ${text.slice(0, 200)}`);
        }
      }

      return response.json();
    };

    return attempt();
  }

  async searchPlaces(params: {
    ll: string; // lat,lng
    radius?: number;
    categories?: string;
    query?: string;
    limit?: number;
    sort?: 'relevance' | 'rating' | 'distance';
  }): Promise<FoursquarePlace[]> {
    try {
      const searchParams = new URLSearchParams({
        ll: params.ll,
        radius: (params.radius || 10000).toString(),
        limit: (params.limit || 50).toString(),
        sort: params.sort || 'relevance'
      });

      if (params.categories) {
        searchParams.append('fsq_category_ids', params.categories);
      }

      if (params.query) {
        searchParams.append('query', params.query);
      }

      const data: FoursquareSearchResponse = await this.fetchJson(`${BASE_URL}/search?${searchParams}`);
      
      return data.results.map((place: any) => {
        const lat = place.latitude ?? place?.geocodes?.main?.latitude ?? 0;
        const lng = place.longitude ?? place?.geocodes?.main?.longitude ?? 0;
        return { ...place, latitude: lat, longitude: lng } as FoursquarePlace;
      });
    } catch (error) {
      console.error('Error searching places:', error);
      throw new Error(`Failed to search places: ${error}`);
    }
  }

  async getPlaceDetails(placeId: string): Promise<FoursquarePlace> {
    try {
      const place = await this.fetchJson(`${BASE_URL}/${placeId}?fields=fsq_id,name,categories,location,timezone,geocodes,rating,price,description,website,tel,email,photos,social_media,placemaker_url,hours`);
      return {
        ...place,
        latitude: place.latitude || place.geocodes?.main?.latitude || 0,
        longitude: place.longitude || place.geocodes?.main?.longitude || 0,
        hours: place.hours ? { display: place.hours.display, open_now: place.hours.open_now } : undefined,
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      throw new Error(`Failed to get place details: ${error}`);
    }
  }

  async getPlaceTips(placeId: string): Promise<Array<{ text: string }>> {
    try {
      const data = await this.fetchJson(`${BASE_URL}/${placeId}/tips?limit=10`);
      const items = Array.isArray(data?.tips) ? data.tips : (Array.isArray(data?.results) ? data.results : []);
      return items.map((t: any) => ({ text: t.text || t.tip || '' })).filter((t: any) => t.text);
    } catch (error) {
      console.error('Error getting place tips:', error);
      return [];
    }
  }

  async searchByInterests(
    location: { lat: number; lng: number },
    interests: string[],
    radius: number = 10000
  ): Promise<FoursquarePlace[]> {
    const categoryMap: Record<string, string> = {
      'art': '4deefb944765f83613cdba6e,4bf58dd8d48988d181941735,4bf58dd8d48988d1e2931735',
      'culture': '4deefb944765f83613cdba6e,4bf58dd8d48988d181941735,4bf58dd8d48988d12d941735',
      'food': '4d4b7105d754a06374d81259,4d4b7105d754a06377d81259',
      'dining': '4d4b7105d754a06374d81259,4d4b7105d754a06377d81259',
      'history': '4deefb944765f83613cdba6e,4bf58dd8d48988d12d941735',
      'nature': '4d4b7105d754a06377d81259,4bf58dd8d48988d163941735',
      'parks': '4bf58dd8d48988d163941735',
      'shopping': '4d4b7105d754a06378d81259,4bf58dd8d48988d1f6941735',
      'entertainment': '4d4b7105d754a06376d81259,4bf58dd8d48988d1e1931735',
      'sports': '4f04af1f2fb6e1c99f3db0bb,4bf58dd8d48988d175941735',
      'fitness': '4bf58dd8d48988d175941735,4f04af1f2fb6e1c99f3db0bb',
      'religious': '4bf58dd8d48988d131941735,4eb1d4d54b900d56c88a45fc'
    };

    // Always include "must-see" famous categories
    const mustSee = [
      '4bf58dd8d48988d12d941735', // Landmark & Historical Place
      '4bf58dd8d48988d181941735', // Art Museum
      '4deefb944765f83613cdba6e', // Museum
      '4bf58dd8d48988d165941735', // Scenic Lookout / Viewpoint (close approx)
    ];

    const selected = interests
      .map(interest => categoryMap[interest.toLowerCase()])
      .filter(Boolean)
      .flatMap(s => s.split(','));

    const categories = Array.from(new Set([...selected, ...mustSee])).join(',');

    return this.searchPlaces({
      ll: `${location.lat},${location.lng}`,
      radius,
      categories,
      limit: 50,
      sort: 'rating'
    });
  }
}

export const foursquareService = new FoursquareService();

export async function getPlaces(city: string, preferences: any): Promise<FoursquarePlace[]> {
  // For demo: Use a fixed lat/lng for the city, or use a geocoding API in production
  // Here, let's use a simple mapping for major Indian cities
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    delhi: { lat: 28.6139, lng: 77.2090 },
    mumbai: { lat: 19.0760, lng: 72.8777 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    bengaluru: { lat: 12.9716, lng: 77.5946 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    hyderabad: { lat: 17.3850, lng: 78.4867 },
    goa: { lat: 15.2993, lng: 74.1240 },
    jaipur: { lat: 26.9124, lng: 75.7873 },
    pune: { lat: 18.5204, lng: 73.8567 },
    ahmedabad: { lat: 23.0225, lng: 72.5714 },
    lucknow: { lat: 26.8467, lng: 80.9462 },
    trivandrum: { lat: 8.5241, lng: 76.9366 },
    thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
    varanasi: { lat: 25.3176, lng: 82.9739 },
    visakhapatnam: { lat: 17.6868, lng: 83.2185 },
    amritsar: { lat: 31.6340, lng: 74.8723 },
    bhubaneswar: { lat: 20.2961, lng: 85.8245 },
    srinagar: { lat: 34.0837, lng: 74.7973 },
    guwahati: { lat: 26.1445, lng: 91.7362 },
    indore: { lat: 22.7196, lng: 75.8577 },
    nagpur: { lat: 21.1458, lng: 79.0882 },
    patna: { lat: 25.5941, lng: 85.1376 },
    madurai: { lat: 9.9252, lng: 78.1198 },
    rajkot: { lat: 22.3039, lng: 70.8022 },
    vadodara: { lat: 22.3072, lng: 73.1812 },
    surat: { lat: 21.1702, lng: 72.8311 },
    ranchi: { lat: 23.3441, lng: 85.3096 },
    jodhpur: { lat: 26.2389, lng: 73.0243 },
    dehradun: { lat: 30.3165, lng: 78.0322 },
    agartala: { lat: 23.8315, lng: 91.2868 },
    chandigarh: { lat: 30.7333, lng: 76.7794 },
    tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
    mangalore: { lat: 12.9141, lng: 74.8560 },
    aurangabad: { lat: 19.8762, lng: 75.3433 },
    udaipur: { lat: 24.5854, lng: 73.7125 },
    gaya: { lat: 24.7969, lng: 85.0078 },
    dibrugarh: { lat: 27.4728, lng: 94.9120 },
    dimapur: { lat: 25.9063, lng: 93.7276 },
    imphal: { lat: 24.8170, lng: 93.9368 },
    silchar: { lat: 24.8335, lng: 92.7789 },
    jammu: { lat: 32.7266, lng: 74.8570 },
    leh: { lat: 34.1526, lng: 77.5771 },
    portblair: { lat: 11.6234, lng: 92.7265 },
    bagdogra: { lat: 26.6811, lng: 88.3289 },
    kanpur: { lat: 26.4499, lng: 80.3319 },
    bareilly: { lat: 28.3670, lng: 79.4304 },
    belgaum: { lat: 15.8497, lng: 74.4977 },
    dharamshala: { lat: 32.2190, lng: 76.3234 },
    gwalior: { lat: 26.2183, lng: 78.1828 },
    hubli: { lat: 15.3647, lng: 75.1240 },
    jabalpur: { lat: 23.1815, lng: 79.9864 },
    kannur: { lat: 11.8745, lng: 75.3704 },
    kolhapur: { lat: 16.7050, lng: 74.2433 },
    mysore: { lat: 12.2958, lng: 76.6394 },
    pantnagar: { lat: 29.0222, lng: 79.4925 },
    shillong: { lat: 25.5788, lng: 91.8933 },
    tezpur: { lat: 26.6517, lng: 92.7926 },
    tuticorin: { lat: 8.7642, lng: 78.1348 },
    vijayawada: { lat: 16.5062, lng: 80.6480 }
  };
  const key = city.trim().toLowerCase().replace(/\s+/g, "");
  const coords = cityCoords[key] || cityCoords[city.trim().toLowerCase()] || cityCoords[city.trim().toLowerCase().replace(/\s+/g, "")];
  if (!coords) throw new Error(`Unknown city: ${city}`);
  const interests = preferences?.interests || [];
  return foursquareService.searchByInterests(coords, interests);
}
