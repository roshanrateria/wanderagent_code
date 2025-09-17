import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { userPreferencesInputSchema, locationInputSchema } from "@shared/schema";
import { TravelPlanningAgent } from "./services/langchain-agent";
import { randomUUID } from "crypto";
import { osrmService } from './services/osrm';
import type { InsertUserPreferences } from '@shared/schema';

// Simple in-memory cache for tips summaries to reduce LLM calls
const tipsSummaryCache = new Map<string, { summary: string; ts: number }>();
const TIPS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate or get session ID
  app.use('/api', (req, res, next) => {
    if (!req.headers['session-id']) {
      req.headers['session-id'] = randomUUID();
    }
    next();
  });

  // Save user preferences
  app.post("/api/preferences", async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const validatedData = userPreferencesInputSchema.parse(req.body);

      const preferences = await storage.createUserPreferences({
        sessionId,
        ...validatedData,
      });

      res.json({ 
        success: true, 
        preferences,
        sessionId 
      });
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Failed to save preferences" 
      });
    }
  });

  // Update user location
  app.post("/api/location", async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const validatedLocation = locationInputSchema.parse(req.body);

      const updatedPreferences = await storage.updateUserPreferences(sessionId, {
        location: validatedLocation
      });

      if (!updatedPreferences) {
        // Create a minimal placeholder preferences so we can persist location early
        const placeholder: InsertUserPreferences = {
          sessionId,
          interests: [],
          duration: 'single day',
          budget: 'medium',
          dietaryRestrictions: [],
          transportation: 'walking',
          location: validatedLocation,
        };
        await storage.createUserPreferences(placeholder);
      }

      res.json({ 
        success: true, 
        location: validatedLocation 
      });
    } catch (error: any) {
      console.error("Error updating location:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Failed to update location" 
      });
    }
  });

  // Generate itinerary using AI agent
  app.post("/api/generate-itinerary", async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const preferences = await storage.getUserPreferences(sessionId);

      if (!preferences || !preferences.location) {
        return res.status(400).json({
          success: false,
          message: "User preferences and location required"
        });
      }

      const isMultiDay = preferences.duration?.toLowerCase?.().includes('multiple days');

      // Initialize AI agent for discovery
      const agent = new TravelPlanningAgent({
        sessionId,
        userPreferences: {
          interests: preferences.interests,
          duration: preferences.duration,
          budget: preferences.budget,
          dietaryRestrictions: preferences.dietaryRestrictions,
          transportation: preferences.transportation,
          location: preferences.location
        },
        currentLocation: preferences.location,
        availablePlaces: []
      });

      // Discover once
      const discoverResult = await agent.executeTask('discover_places');
      if (!discoverResult.success) {
        return res.status(500).json(discoverResult);
      }

      if (isMultiDay) {
        // Call multi-day Gemini directly
        const { generateMultiDayItinerary } = await import('./services/gemini');
        const multiDay = await generateMultiDayItinerary({
          interests: preferences.interests,
          duration: preferences.duration,
          budget: preferences.budget,
          dietaryRestrictions: preferences.dietaryRestrictions,
          transportation: preferences.transportation,
          location: preferences.location,
          places: discoverResult.data.places || [],
        });

        // Flatten places for storage and compute simple totals
        const flatPlaces = multiDay.days.flatMap((d: any) => {
          const meals: any[] = [];
          if (d.meals?.lunch) meals.push(d.meals.lunch);
          if (d.meals?.dinner) meals.push(d.meals.dinner);
          return [...(d.places || []), ...meals].sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        // Map to ItineraryPlace by resolving coordinates
        const resolved = (discoverResult.data.places || []);
        const byId: Record<string, any> = Object.fromEntries(
          resolved.map((p: any) => [p.fsq_place_id, p])
        );

        const validPlaces = flatPlaces.map((place: any) => {
          const full = byId[place.fsqPlaceId];
          return {
            fsqPlaceId: place.fsqPlaceId,
            name: place.name,
            category: place.category,
            latitude: full?.latitude || 0,
            longitude: full?.longitude || 0,
            rating: full?.rating,
            priceLevel: full?.price,
            address: full?.location?.formatted_address,
            description: full?.description || place.reason,
            photoUrl: full?.photos?.[0] ? `${full.photos[0].prefix}300x200${full.photos[0].suffix}` : undefined,
            estimatedDuration: place.estimatedDuration,
            scheduledTime: place.scheduledTime,
            order: place.order,
            reason: place.reason,
          } as any;
        }).filter((p: any) => typeof p.longitude === 'number' && typeof p.latitude === 'number' && !isNaN(p.longitude) && !isNaN(p.latitude));

        // Augment multiDay days with coordinates
        const augmentedDays = multiDay.days.map((d: any) => ({
          ...d,
          places: (d.places || []).map((p: any) => {
            const full = byId[p.fsqPlaceId];
            return {
              ...p,
              latitude: full?.latitude,
              longitude: full?.longitude,
            };
          })
        }));
        (multiDay as any).days = augmentedDays;

        const coordinates: Array<[number, number]> = [
          [preferences.location.lng, preferences.location.lat],
          ...validPlaces.map((p: any) => [p.longitude as number, p.latitude as number] as [number, number])
        ];

        const profile = osrmService.getProfileFromTransportation(preferences.transportation);
        const optimizationResult = await osrmService.optimizeRoute(coordinates, profile);

        // Get full route with steps for instructions
        const routeResult = await osrmService.getRoute(coordinates, profile);
        const routeGeometry = routeResult.decodedGeometry || [];
        const osrmInstructions = routeResult.instructionsByLeg || [];

        const itineraryForStorage = validPlaces.map((place: any, index: number) => {
          const routeInfo = optimizationResult.routes.find((r: any) => r.from === index);
          return {
            ...place,
            travelTimeToNext: routeInfo?.duration,
            distanceToNext: routeInfo?.distance
          };
        });

        const optimizedRoutePath = optimizationResult.optimizedOrder.map((idx: number) => {
          const c = coordinates[idx];
          return { lat: c[1], lng: c[0] };
        });

        const itinerary = await storage.createItinerary({
          sessionId,
          places: itineraryForStorage,
          totalDuration: Math.round(optimizationResult.totalDuration),
          totalDistance: optimizationResult.totalDistance,
          optimizedRoute: optimizedRoutePath,
          routeGeometry,
          multiDay, // <-- persist multi-day
          // @ts-ignore store osrmInstructions in memory store
          osrmInstructions,
        } as any);

        return res.json({ success: true, itinerary, multiDay });
      }

      // Single day existing flow
      const generateResult = await agent.executeTask('generate_itinerary');
      if (!generateResult.success) {
        return res.status(500).json(generateResult);
      }

      const optimizeResult = await agent.executeTask('optimize_route');
      if (!optimizeResult.success) {
        return res.status(500).json(optimizeResult);
      }

      const allCoords: Array<[number, number]> = [
        [preferences.location.lng, preferences.location.lat],
        ...optimizeResult.data.itinerary.map((place: any) => [place.longitude as number, place.latitude as number] as [number, number])
      ];
      const routeResult = await osrmService.getRoute(allCoords, osrmService.getProfileFromTransportation(preferences.transportation));
      const routeGeometry = routeResult.decodedGeometry || [];
      const osrmInstructions = routeResult.instructionsByLeg || [];
      const optimizedRoutePath = (optimizeResult.data.optimizedRoute || []).map((idx: number) => {
        const c = allCoords[idx];
        return { lat: c[1], lng: c[0] };
      });

      const itinerary = await storage.createItinerary({
        sessionId,
        places: optimizeResult.data.itinerary,
        totalDuration: Math.round(optimizeResult.data.totalDuration),
        totalDistance: optimizeResult.data.totalDistance,
        optimizedRoute: optimizedRoutePath,
        routeGeometry,
        // @ts-ignore add osrmInstructions field
        osrmInstructions,
      } as any);

      res.json({
        success: true,
        itinerary,
        recommendations: generateResult.data.recommendations,
        routeGeometry,
        // @ts-ignore
        osrmInstructions,
      });

    } catch (error: any) {
      console.error("Error generating itinerary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate itinerary"
      });
    }
  });

  // Get current itinerary
  app.get("/api/itinerary", async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const itinerary = await storage.getItinerary(sessionId);

      if (!itinerary) {
        return res.status(404).json({
          success: false,
          message: "No itinerary found"
        });
      }

      res.json({
        success: true,
        itinerary
      });
    } catch (error: any) {
      console.error("Error getting itinerary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get itinerary"
      });
    }
  });

  // Update itinerary (for real-time adjustments)
  app.put("/api/itinerary", async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const { places, feedback, multiDay } = req.body;

      // If only multiDay is provided (no places), directly persist it without agent involvement
      if (!places && multiDay) {
        const updated = await storage.updateItinerary(sessionId, { multiDay } as any);
        if (!updated) {
          return res.status(404).json({ success: false, message: "Itinerary not found" });
        }
        return res.json({ success: true, itinerary: updated });
      }

      const preferences = await storage.getUserPreferences(sessionId);
      if (!preferences) {
        return res.status(404).json({
          success: false,
          message: "User preferences not found"
        });
      }

      // Initialize agent for adjustment
      const agent = new TravelPlanningAgent({
        sessionId,
        userPreferences: {
          interests: preferences.interests,
          duration: preferences.duration,
          budget: preferences.budget,
          dietaryRestrictions: preferences.dietaryRestrictions,
          transportation: preferences.transportation,
          location: preferences.location!
        },
        currentLocation: preferences.location!,
        availablePlaces: [],
        currentItinerary: places
      });

      const adjustResult = await agent.executeTask('adjust_itinerary');
      if (!adjustResult.success) {
        return res.status(500).json(adjustResult);
      }

      // Update stored itinerary; also persist multiDay if provided
      const updatedItinerary = await storage.updateItinerary(sessionId, {
        places: adjustResult.data.itinerary.places,
        totalDuration: adjustResult.data.itinerary.totalDuration,
        multiDay: multiDay ?? undefined,
      } as any);

      res.json({
        success: true,
        itinerary: updatedItinerary
      });

    } catch (error: any) {
      console.error("Error updating itinerary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update itinerary"
      });
    }
  });

  // Get session info
  app.get("/api/session", (req, res) => {
    const sessionId = req.headers['session-id'] as string;
    res.json({ sessionId });
  });

  // --- FLIGHT OPTIONS ENDPOINT ---
  app.post("/api/flight-options", async (req, res) => {
    try {
      const { startAirport, destinationCity, startDate, endDate } = req.body;
      if (!startAirport || !destinationCity || !startDate || !endDate) {
        return res.status(400).json({ error: 'startAirport, destinationCity, startDate, endDate are required' });
      }

      const norm = (v: any) => String(v ?? '').toLowerCase();
      const cityNorm = (s: string) => norm(s).replace(/[^a-z0-9]/g, '');
      const parseAirportCode = (val: any) => norm(val).replace(/[^a-z0-9]/g, '');

      const getField = (f: any, keys: string[]) => {
        for (const k of keys) {
          if (f && f[k] != null) return f[k];
        }
        return undefined;
      };

      const toISODate = (val: any): string | undefined => {
        if (val == null) return undefined;
        const s = String(val);
        const m = s.match(/\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return undefined;
      };

      const safeGet = (obj: any, path: Array<string | number>): any => {
        try { return path.reduce((acc, key) => (acc != null ? acc[key as any] : undefined), obj); } catch { return undefined; }
      };

      const parseDate = (f: any) => {
        const direct = getField(f, [
          'date','departure_date','depart_date','departDate',
          'departureTime','departure_time','depart_time','departTime',
          'depart_at','departure_at','outbound_date','start_date'
        ]);
        const d1 = toISODate(direct); if (d1) return d1;
        const d2 = toISODate(safeGet(f, ['departure','date'])) ||
                   toISODate(safeGet(f, ['departure','time'])) ||
                   toISODate(safeGet(f, ['departure','at'])) ||
                   toISODate(safeGet(f, ['segment','departure','at']));
        if (d2) return d2;
        const d3 = toISODate(safeGet(f, ['legs',0,'departure_time'])) ||
                   toISODate(safeGet(f, ['legs',0,'departureTime'])) ||
                   toISODate(safeGet(f, ['legs',0,'departure','at'])) ||
                   toISODate(safeGet(f, ['legs',0,'departure','time'])) ||
                   toISODate(safeGet(f, ['segments',0,'departure_time'])) ||
                   toISODate(safeGet(f, ['segments',0,'departureTime'])) ||
                   toISODate(safeGet(f, ['segments',0,'departure','at'])) ||
                   toISODate(safeGet(f, ['segments',0,'departure','time']));
        if (d3) return d3;
        const d4 = toISODate(safeGet(f, ['itineraries',0,'segments',0,'departure','at']));
        return d4;
      };

      const getOrigin = (f: any) => parseAirportCode(getField(f, ['from_airport','from','origin','departure_airport','src','source','origin_airport','originCity','origin_city']));
      const getDest = (f: any) => parseAirportCode(getField(f, ['to_airport','to','destination','arrival_airport','dst','dest','destination_airport','destinationCity','destination_city']));

      const parsePrice = (p: any) => {
        if (typeof p === 'number') return p;
        if (typeof p === 'string') { const num = p.replace(/[^0-9.]/g, ''); return parseFloat(num || '0'); }
        return 0;
      };
      const priceOf = (f: any) => parsePrice(getField(f, ['price','total_price','amount']));

      const runPy = async (from: string, to: string, d1: string, d2: string) => new Promise<any>((resolve, reject) => {
        (async () => {
          const { spawn } = await import('child_process');
          const py = spawn('python', ['a.py', from, to, d1, d2], { cwd: process.cwd() });
          let stdout = ''; let stderr = '';
          py.stdout.on('data', (data) => { stdout += data.toString(); });
          py.stderr.on('data', (data) => { stderr += data.toString(); });
          py.on('close', () => {
            try {
              const start = stdout.indexOf('{');
              const end = stdout.lastIndexOf('}') + 1;
              const jsonStr = stdout.substring(start, end);
              const parsed = JSON.parse(jsonStr);
              resolve({ parsed, stderr, stdout });
            } catch (e) {
              reject(new Error(`Failed to parse flight data: ${stderr || e}`));
            }
          });
        })();
      });

      const pickCheapestForLeg = (flights: any[], from: string, to: string, date: string) => {
        const fromKey = cityNorm(from); const toKey = cityNorm(to); const dateKey = String(date).slice(0,10);
        const candidates = flights.filter((f) => {
          const o = getOrigin(f); const d = getDest(f); const fd = parseDate(f);
          const originOk = o.includes(fromKey) || fromKey.includes(o) || o.includes(norm(from));
          const destOk = d.includes(toKey) || toKey.includes(d) || d.includes(norm(to));
          if (!originOk || !destOk) return false;
          return !fd || fd === dateKey; // require match if provided
        });
        const exactDate = candidates.filter((f) => parseDate(f) === dateKey);
        const list = exactDate.length ? exactDate : candidates;
        if (list.length === 0) {
          // fallback by direction only
          const dirOnly = flights.filter((f) => {
            const o = getOrigin(f); const d = getDest(f);
            return o && d && (o.includes(fromKey) || fromKey.includes(o)) && (d.includes(toKey) || toKey.includes(d));
          });
          return dirOnly.sort((a,b) => priceOf(a)-priceOf(b))[0] || flights[0];
        }
        return list.sort((a,b) => priceOf(a)-priceOf(b))[0];
      };

      // Call Python twice: outbound and return
      const outRes = await runPy(startAirport, destinationCity, startDate, startDate);
      const retRes = await runPy(destinationCity, startAirport, endDate, endDate);

      const outFlights: any[] = Array.isArray(outRes.parsed?.flights) ? outRes.parsed.flights : [];
      const retFlights: any[] = Array.isArray(retRes.parsed?.flights) ? retRes.parsed.flights : [];

      const outbound = pickCheapestForLeg(outFlights, startAirport, destinationCity, startDate);
      const inbound = pickCheapestForLeg(retFlights, destinationCity, startAirport, endDate);

      if (outbound && typeof outbound === 'object') {
        (outbound as any).leg = 'outbound';
        (outbound as any).departureDateISO = parseDate(outbound);
      }
      if (inbound && typeof inbound === 'object') {
        (inbound as any).leg = 'return';
        (inbound as any).departureDateISO = parseDate(inbound);
      }

      const flights = [outbound, inbound].filter(Boolean).slice(0,2);
      const totalPrice = flights.reduce((sum, f) => sum + priceOf(f), 0);
      return res.json({ flights, totalPrice });
    } catch (error: any) {
      console.error('flight-options error', error);
      res.status(500).json({ error: error.message || 'Failed to get flight options' });
    }
  });

  // --- FOURSQUARE PLACES ENDPOINT ---
  app.post("/api/foursquare-places", async (req, res) => {
    try {
      const { city, preferences } = req.body;
      const { getPlaces } = await import('./services/foursquare');
      const places = await getPlaces(city, preferences);
      res.json(places);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch places' });
    }
  });

  // --- GEMINI PLAN ENDPOINT ---
  app.post("/api/gemini-plan", async (req, res) => {
    try {
      const { flights, places, preferences, tripDetails } = req.body;
      const { getGeminiPlan } = await import('./services/gemini');
      const plan = await getGeminiPlan({ flights, places, preferences, tripDetails });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate plan' });
    }
  });

  // Optimize a single day's route and return geometry
  app.post('/api/optimize-day', async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const { places } = req.body as { places: Array<{ latitude: number; longitude: number }> };
      if (!Array.isArray(places) || places.length < 2) {
        return res.status(400).json({ error: 'At least 2 places are required' });
      }
      const preferences = await storage.getUserPreferences(sessionId);
      const profile = osrmService.getProfileFromTransportation(preferences?.transportation || 'walking');
      // Build coordinates, anchor first as start
      const coordinates: Array<[number, number]> = places.map((p) => [p.longitude, p.latitude]);
      const opt = await osrmService.optimizeRoute(coordinates, profile);
      // Build route geometry for optimized order
      const orderedCoords = opt.optimizedOrder.map((idx) => coordinates[idx]);
      const routeResult = await osrmService.getRoute(orderedCoords, profile);
      return res.json({
        optimizedOrder: opt.optimizedOrder,
        totalDistance: opt.totalDistance,
        totalDuration: opt.totalDuration,
        routeGeometry: routeResult.decodedGeometry || [],
        // @ts-ignore
        osrmInstructions: routeResult.instructionsByLeg || [],
      });
    } catch (e: any) {
      console.error('optimize-day error', e);
      return res.status(500).json({ error: 'Failed to optimize day' });
    }
  });

  // Optimize the full single-day itinerary: reorder places and rebuild route geometry
  app.post('/api/optimize-route', async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const prefs = await storage.getUserPreferences(sessionId);
      if (!prefs || !prefs.location) {
        return res.status(400).json({ success: false, message: 'User preferences with location are required' });
      }

      // Prefer places from request, else use stored itinerary
      const bodyPlaces = Array.isArray(req.body?.places) ? req.body.places : undefined;
      const stored = await storage.getItinerary(sessionId);
      const places = bodyPlaces && bodyPlaces.length > 0 ? bodyPlaces : stored?.places || [];
      if (!Array.isArray(places) || places.length < 2) {
        return res.status(400).json({ success: false, message: 'At least 2 places with coordinates are required to optimize' });
      }

      // Build coordinates: start at user location then all place coords
      const coords: Array<[number, number]> = [
        [prefs.location.lng, prefs.location.lat],
        ...places.map((p: any) => [Number(p.longitude), Number(p.latitude)] as [number, number])
      ];

      // Validate coords
      if (coords.some(([lng, lat]) => !isFinite(lng) || !isFinite(lat))) {
        return res.status(400).json({ success: false, message: 'Invalid coordinates provided' });
      }

      const profile = osrmService.getProfileFromTransportation(prefs.transportation || 'walking');

      // Use OSRM Trip to get optimized order with fixed start and end
      const coordString = coords.map(c => `${c[0]},${c[1]}`).join(';');
      const tripUrl = `https://router.project-osrm.org/trip/v1/${profile}/${coordString}?source=first&destination=last&roundtrip=false`;
      const tripResp = await fetch(tripUrl);
      if (!tripResp.ok) {
        return res.status(502).json({ success: false, message: `OSRM trip error: ${tripResp.status}` });
      }
      const tripData: any = await tripResp.json();
      if (!tripData?.trips || !tripData.trips[0] || !Array.isArray(tripData.waypoints)) {
        return res.status(500).json({ success: false, message: 'Invalid OSRM trip response' });
      }

      // waypoints are in input order; waypoint_index is order in trip
      const inputIndices = tripData.waypoints.map((_: any, i: number) => i);
      inputIndices.sort((a: number, b: number) => (tripData.waypoints[a].waypoint_index - tripData.waypoints[b].waypoint_index));

      // Convert optimized order of input indices to places order (exclude start index 0)
      const optimizedPlaceInputIdx = inputIndices.filter((idx: number) => idx !== 0);
      // Map input index back to place index (input idx 1 => place 0)
      const optimizedPlaceOrder = optimizedPlaceInputIdx.map((inputIdx: number) => inputIdx - 1);

      // Reorder places accordingly and normalize order fields
      const reorderedPlaces = optimizedPlaceOrder.map((pi: number, i: number) => ({
        ...places[pi],
        order: i + 1,
      }));

      // Build ordered coordinates for route geometry (start + reordered places)
      const orderedCoords: Array<[number, number]> = [coords[0], ...optimizedPlaceOrder.map((pi: number) => coords[pi + 1])];
      const routeResult = await osrmService.getRoute(orderedCoords, profile);
      const decodedGeometry = routeResult.decodedGeometry || [];
      const osrmInstructions = routeResult.instructionsByLeg || [];
      const totalDistanceKm = (routeResult.routes?.[0]?.distance || 0) / 1000;
      const totalDurationMin = (routeResult.routes?.[0]?.duration || 0) / 60;

      // Persist itinerary changes
      const updated = await storage.updateItinerary(sessionId, {
        places: reorderedPlaces as any,
        totalDistance: totalDistanceKm,
        totalDuration: Math.round(totalDurationMin),
        routeGeometry: decodedGeometry,
        // @ts-ignore
        osrmInstructions,
      } as any);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Itinerary not found' });
      }

      return res.json({ success: true, itinerary: updated, osrmInstructions });
    } catch (e: any) {
      console.error('optimize-route error', e);
      return res.status(500).json({ success: false, message: e?.message || 'Failed to optimize route' });
    }
  });

  // --- QUICK ACTIONS: Nearby needs (coffee/atm/restroom) ---
  app.get('/api/quick/:type', async (req, res) => {
    try {
      const sessionId = req.headers['session-id'] as string;
      const prefs = await storage.getUserPreferences(sessionId);
      const { type } = req.params; // coffee | atm | restroom
      // Prefer persisted location, else accept browser-provided lat/lng from headers or query
      let loc = prefs?.location as { lat: number; lng: number } | undefined;
      if (!loc) {
        const q: any = req.query || {};
        const hLat = Number((req.headers['x-user-lat'] as string) || (req.headers['x-lat'] as string) || '');
        const hLng = Number((req.headers['x-user-lng'] as string) || (req.headers['x-lng'] as string) || '');
        const qLat = Number(q.lat || '');
        const qLng = Number(q.lng || '');
        const lat = isFinite(hLat) ? hLat : (isFinite(qLat) ? qLat : NaN);
        const lng = isFinite(hLng) ? hLng : (isFinite(qLng) ? qLng : NaN);
        if (isFinite(lat) && isFinite(lng)) {
          loc = { lat, lng };
          // Best-effort persist for future calls
          storage.updateUserPreferences(sessionId, { location: loc } as any).catch(() => {});
        }
      }
      if (!loc) return res.status(400).json({ success: false, message: 'Location required' });

      const { foursquareService } = await import('./services/foursquare');
      const ll = `${loc.lat},${loc.lng}`;
      const mapping: Record<string, { query?: string; categories?: string }> = {
        coffee: { query: 'coffee' },
        atm: { query: 'atm' },
        restroom: { query: 'restroom toilet washroom bathroom wc' },
      };
      const m = mapping[type?.toLowerCase?.()] || { query: type };
      let results = await foursquareService.searchPlaces({ ll, radius: 2000, query: m.query, categories: m.categories, limit: 12, sort: 'distance' });
      results = (results || []).filter((r: any) => isFinite(r?.latitude) && isFinite(r?.longitude)).slice(0, 12);
      return res.json({ success: true, results });
    } catch (e: any) {
      console.error('quick action error', e);
      const status = Number(e?.status) || 500;
      const isRate = status === 429;
      const message = isRate
        ? 'Too many requests to Places API. Please wait a moment and try again.'
        : (e?.message?.slice?.(0, 200) || 'Failed to fetch nearby options');
      return res.status(status).json({ success: false, message, code: status });
    }
  });

  // --- TIPS SUMMARY ENDPOINT ---
  app.get('/api/places/:id/tips-summary', async (req, res) => {
    try {
      const { id } = req.params;
      const { foursquareService } = await import('./services/foursquare');
      const { summarizeTips } = await import('./services/gemini');
      // cache hit?
      const cached = tipsSummaryCache.get(id);
      const now = Date.now();
      if (cached && (now - cached.ts) < TIPS_TTL_MS) {
        return res.json({ success: true, summary: cached.summary, cached: true });
      }

      const tips = await foursquareService.getPlaceTips(id);
      const texts = tips.map(t => t.text).slice(0, 15);
      const details = await foursquareService.getPlaceDetails(id).catch(() => null);
      const name = (details as any)?.name || id;
      const summary = await summarizeTips(name, texts);
      tipsSummaryCache.set(id, { summary, ts: now });
      return res.json({ success: true, summary, cached: false });
    } catch (e: any) {
      console.error('tips-summary error', e);
      return res.status(500).json({ success: false, message: 'Failed to summarize tips' });
    }
  });

  // --- HOURS ENRICH ENDPOINT (for itinerary items) ---
  app.post('/api/enrich/hours', async (req, res) => {
    try {
      const { ids } = req.body as { ids: string[] };
      if (!Array.isArray(ids) || ids.length === 0) return res.json({ success: true, data: [] });
      const { foursquareService } = await import('./services/foursquare');
      const data = await Promise.all(ids.map(async (id) => {
        try {
          const d = await foursquareService.getPlaceDetails(id);
          return { id, hours: d.hours };
        } catch {
          return { id, hours: undefined };
        }
      }));
      return res.json({ success: true, data });
    } catch (e: any) {
      console.error('enrich hours error', e);
      return res.status(500).json({ success: false, message: 'Failed to enrich hours' });
    }
  });

  // Catch-all for unknown API routes to avoid falling through to Vite HTML
  app.all('/api/*', (_req, res) => {
    return res.status(404).json({ success: false, message: 'API route not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
