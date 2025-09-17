// Client-side only helpers for on-device (no server) mode
// Reads API keys from Vite env (injected at build by npm run apk)

const FOURSQUARE_API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY as string | undefined;
const FOURSQUARE_API_VERSION = (import.meta.env.VITE_FOURSQUARE_API_VERSION as string | undefined) || '2025-06-17';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function isLocalMode(): boolean {
  const v = (import.meta as any).env?.VITE_LOCAL_ONLY;
  return v === true || v === 'true';
}

function assertEnv(name: string, value?: string): asserts value is string {
  if (!value) throw new Error(`${name} is missing. Add it to .env and rebuild APK.`);
}

// Small retry/backoff helper for transient API failures
async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }
function isRetryableStatus(status: number) { return status === 429 || status >= 500; }
async function withRetries<T>(op: () => Promise<T>, opts: { retries?: number; baseMs?: number } = {}): Promise<T> {
  const max = opts.retries ?? 2; // total attempts = max+1
  const base = opts.baseMs ?? 400;
  let lastErr: any;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await op();
    } catch (e: any) {
      lastErr = e;
      const status = Number((e?.status || e?.code || '').toString());
      const msg = (e?.message || '').toLowerCase();
      const maybe429 = msg.includes('429') || status === 429;
      const maybe5xx = msg.startsWith('5') || (status >= 500 && status < 600);
      if (attempt < max && (maybe429 || maybe5xx)) {
        const jitter = Math.random() * 100;
        await sleep(base * Math.pow(2, attempt) + jitter);
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

// --- FOURSQUARE ---
const FS_BASE = 'https://places-api.foursquare.com/places';

// Check if we're in Capacitor mobile environment
function isCapacitorMobile(): boolean {
  return typeof (globalThis as any).Capacitor !== 'undefined' && (globalThis as any).Capacitor.getPlatform() !== 'web';
}

async function fsFetch(path: string, init?: RequestInit): Promise<any> {
  assertEnv('VITE_FOURSQUARE_API_KEY', FOURSQUARE_API_KEY);
  const doFetch = async () => {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${FOURSQUARE_API_KEY!}`,
      'X-Places-Api-Version': FOURSQUARE_API_VERSION!,
      ...(init?.headers || {}),
    } as Record<string, string>;
    
    // Ensure no encoded commas in query params (Foursquare expects literal commas e.g. in ll="lat,lng")
    const finalPath = path.replace(/%2C/gi, ',');
    const url = `${FS_BASE}${finalPath}`;

    console.log('[Mobile Debug] Foursquare API call:', url);
    console.log('[Mobile Debug] API Key present:', !!FOURSQUARE_API_KEY);
    console.log('[Mobile Debug] API Version:', FOURSQUARE_API_VERSION);

    // Use Capacitor HTTP plugin for mobile to avoid CORS issues
    if (isCapacitorMobile()) {
      try {
        const { Http } = await import('@capacitor-community/http');
        console.log('[Mobile Debug] Using Capacitor HTTP for API call');
        
        const response = await Http.request({
          url,
          method: (init?.method as any) || 'GET',
          headers,
          data: init?.body ? (() => { try { return JSON.parse(init.body as string); } catch { return init.body; } })() : undefined,
        });
        
        const status = response.status ?? 0;
        const hdrs = response.headers || {};
        const ct = (hdrs['content-type'] || hdrs['Content-Type'] || '').toString().toLowerCase();
        console.log('[Mobile Debug] Capacitor HTTP response status:', status);
        console.log('[Mobile Debug] Response content-type:', ct || '[none]');

        // Preview body safely without forcing JSON parse
        const dataPreview = typeof response.data === 'string'
          ? response.data.slice(0, 300)
          : (() => { try { return JSON.stringify(response.data).slice(0, 300); } catch { return String(response.data).slice(0, 300); } })();
        console.log('[Mobile Debug] Response data preview:', dataPreview);
        
        if (status >= 400) {
          const msg = typeof response.data === 'string' ? response.data : (response.data?.message || JSON.stringify(response.data));
          const err: any = new Error(`Foursquare ${status}: ${msg}`);
          err.status = status;
          err.body = response.data;
          throw err;
        }
        
        // Parse JSON only when appropriate
        if (typeof response.data === 'string') {
          const s = response.data.trim();
          if (!ct.includes('application/json')) {
            if (s.startsWith('<')) {
              const err: any = new Error('Foursquare returned HTML instead of JSON');
              err.status = status;
              err.body = s.slice(0, 500);
              throw err;
            }
          }
          try {
            return s ? JSON.parse(s) : null;
          } catch (e: any) {
            const err: any = new Error(`Failed to parse Foursquare JSON: ${e?.message || e}`);
            err.status = status;
            err.body = s.slice(0, 500);
            throw err;
          }
        }
        
        return response.data;
      } catch (e: any) {
        console.error('[Mobile Debug] Capacitor HTTP failed:', e?.message || e);
        console.error('[Mobile Debug] Full error:', e);
        // Fall back to regular fetch if Capacitor HTTP fails
      }
    }

    // Regular fetch for web or fallback
    console.log('[Mobile Debug] Using regular fetch for API call');
    const res = await fetch(url, { ...init, headers });
    const ct = res.headers.get('content-type') || '';
    const bodyText = await res.text();
    
    console.log('[Mobile Debug] Fetch response:', res.status, res.statusText);
    console.log('[Mobile Debug] Response body preview:', bodyText.slice(0, 200));
    
    // Try JSON parse when content-type indicates JSON and not HTML
    let body: any = bodyText;
    if (ct.toLowerCase().includes('application/json')) {
      try { body = bodyText ? JSON.parse(bodyText) : null; } catch (e) {
        throw new Error(`Invalid JSON from Foursquare: ${(e as any)?.message || e}`);
      }
    } else if (bodyText.trim().startsWith('<')) {
      throw new Error(`Foursquare ${res.status}: Returned HTML instead of JSON`);
    }
    
    if (!res.ok) {
      const msg = typeof body === 'string' ? body : (body?.message || JSON.stringify(body));
      const err: any = new Error(`Foursquare ${res.status}: ${msg}`);
      err.status = res.status;
      throw err;
    }
    return body;
  };
  return withRetries(doFetch, { retries: 2, baseMs: 400 });
}

export async function searchFoursquarePlacesLocal(opts: { city?: string; ll?: string; query?: string; categories?: string; limit?: number; radius?: number; sort?: 'relevance'|'rating'|'distance' }) {
  console.log('[Mobile Debug] searchFoursquarePlacesLocal called with:', opts);
  
  const parts: string[] = [];
  if (opts.ll) {
    // Insert ll with literal comma
    parts.push(`ll=${encodeURIComponent(opts.ll).replace(/%2C/gi, ',')}`);
  } else if (opts.city) {
    const near = new URLSearchParams({ near: opts.city }).toString();
    parts.push(near);
  }
  if (opts.query) parts.push(new URLSearchParams({ query: opts.query }).toString());
  if (opts.categories) parts.push(`fsq_category_ids=${encodeURIComponent(opts.categories).replace(/%2C/gi, ',')}`);
  parts.push(`limit=${encodeURIComponent(String(opts.limit ?? 50))}`);
  if (opts.radius) parts.push(`radius=${encodeURIComponent(String(opts.radius))}`);
  if (opts.sort) parts.push(`sort=${encodeURIComponent(opts.sort)}`);

  const qs = parts.join('&');
  console.log('[Mobile Debug] Search params (final):', qs);
  
  const data = await fsFetch(`/search?${qs}`);
  
  console.log('[Mobile Debug] Foursquare search response data:', data);
  
  const results = Array.isArray(data?.results) ? data.results : [];
  console.log('[Mobile Debug] Extracted results count:', results.length);
  
  const mappedResults = results.map((place: any) => ({
    fsq_place_id: place.fsq_place_id || place.fsq_id || place.id,
    name: place.name,
    categories: place.categories || [],
    location: place.location || {},
    latitude: place.latitude ?? place?.geocodes?.main?.latitude ?? 0,
    longitude: place.longitude ?? place?.geocodes?.main?.longitude ?? 0,
    rating: place.rating,
    price: place.price,
    description: place.description,
    website: place.website,
    tel: place.tel,
    email: place.email,
    photos: place.photos,
  }));
  
  console.log('[Mobile Debug] Mapped results preview:', mappedResults.slice(0, 3));
  return mappedResults;
}

export async function quickSearchLocal(type: 'coffee'|'atm'|'restroom', ll: string) {
  const mapping: Record<string, { query?: string; categories?: string }> = {
    coffee: { query: 'coffee' },
    atm: { query: 'atm' },
    restroom: { query: 'restroom toilet washroom bathroom wc' },
  };
  const m = mapping[type] || { query: type };
  return searchFoursquarePlacesLocal({ ll, query: m.query, categories: m.categories, limit: 12, radius: 2000, sort: 'distance' });
}

// --- GEMINI ---
export async function generatePlanLocal(input: {
  interests?: string[];
  duration?: string;
  budget?: string;
  dietaryRestrictions?: string[];
  transportation?: string;
  location?: { lat: number; lng: number; address?: string };
  flights: any;
  places: any[];
  tripDetails: { startAirport: string; destinationCity: string; startDate: string; endDate: string };
}) {
  assertEnv('VITE_GEMINI_API_KEY', GEMINI_API_KEY);
  console.log('[Mobile Debug] generatePlanLocal called with places count:', input.places?.length || 0);
  
  const { GoogleGenAI } = await import('@google/genai');
  const ai: any = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

  const config = { temperature: 0.6, topK: 40, topP: 0.95, maxOutputTokens: 3072 };
  const model = 'gemini-2.0-flash-exp';

  const systemPrompt = `You are an expert trip planner. Create a concise single-day plan using the provided places.
Return ONLY valid JSON with this schema:
{
  "places": [
    {"fsqPlaceId":"string","name":"string","category":"string","estimatedDuration":60,"scheduledTime":"9:00 AM","order":1,"reason":"string"}
  ],
  "totalDuration": 480,
  "recommendations": ["tip1", "tip2"]
}`;
  const userContext = {
    interests: input.interests || [],
    duration: input.duration || 'single day',
    budget: input.budget || 'medium',
    dietaryRestrictions: input.dietaryRestrictions || [],
    transportation: input.transportation || 'walking',
    location: input.location || null,
    flights: input.flights,
    samplePlaces: input.places?.slice(0, 20) || [],
    destination: input.tripDetails.destinationCity,
    dates: { start: input.tripDetails.startDate, end: input.tripDetails.endDate },
  };

  console.log('[Mobile Debug] Calling Gemini with context:', JSON.stringify(userContext).slice(0, 500));

  const callModel = async () => {
    const response: any = await ai.models.generateContent({
      model,
      config,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nData: ${JSON.stringify(userContext)}` }],
        },
      ],
    });
    return response;
  };

  const response = await withRetries(callModel, { retries: 2, baseMs: 600 });

  let fullText = '';
  try {
    // non-stream result
    if (response?.response?.text) fullText = await response.response.text();
  } catch {}
  if (!fullText && typeof response?.text === 'function') {
    try { fullText = await response.text(); } catch {}
  }
  if (!fullText && typeof response === 'string') fullText = response;

  console.log('[Mobile Debug] Gemini response text:', fullText.slice(0, 500));

  fullText = (fullText || '').replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '').replace(/\s*```$/gm, '').trim();
  const match = fullText.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : fullText;
  
  const result = JSON.parse(json);
  console.log('[Mobile Debug] Gemini parsed result:', result);
  return result;
}

// --- FLIGHTS (local demo generator) ---
export async function getFlightOptionsLocal(details: { startAirport: string; destinationCity: string; startDate: string; endDate: string }) {
  // Generate deterministic demo flights so UI works without a server
  const seed = (details.startAirport + details.destinationCity + details.startDate).toLowerCase();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = (min: number, max: number) => min + (h = (h * 1664525 + 1013904223) >>> 0) % (max - min + 1);
  const flights = Array.from({ length: 5 }).map((_, i) => {
    const depHour = 6 + (rand(0, 10));
    const durMin = 60 * (2 + rand(0, 6));
    const price = 100 + rand(50, 400);
    return {
      id: `${i + 1}`,
      airline: ['SkyJet', 'AeroFly', 'Nimbus', 'BlueBird'][rand(0, 3)],
      from: details.startAirport.toUpperCase(),
      to: details.destinationCity,
      depart: `${depHour}:00`,
      arrive: `${(depHour + Math.floor(durMin / 60)) % 24}:${(durMin % 60).toString().padStart(2, '0')}`,
      durationMinutes: durMin,
      priceUSD: price,
      nonstop: rand(0, 1) === 1,
    };
  });
  return flights;
}