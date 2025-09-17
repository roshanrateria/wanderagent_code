var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/foursquare.ts
var foursquare_exports = {};
__export(foursquare_exports, {
  FoursquareService: () => FoursquareService,
  foursquareService: () => foursquareService,
  getPlaces: () => getPlaces
});
import dotenv from "dotenv";
async function getPlaces(city, preferences) {
  const cityCoords = {
    delhi: { lat: 28.6139, lng: 77.209 },
    mumbai: { lat: 19.076, lng: 72.8777 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    bengaluru: { lat: 12.9716, lng: 77.5946 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    hyderabad: { lat: 17.385, lng: 78.4867 },
    goa: { lat: 15.2993, lng: 74.124 },
    jaipur: { lat: 26.9124, lng: 75.7873 },
    pune: { lat: 18.5204, lng: 73.8567 },
    ahmedabad: { lat: 23.0225, lng: 72.5714 },
    lucknow: { lat: 26.8467, lng: 80.9462 },
    trivandrum: { lat: 8.5241, lng: 76.9366 },
    thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
    varanasi: { lat: 25.3176, lng: 82.9739 },
    visakhapatnam: { lat: 17.6868, lng: 83.2185 },
    amritsar: { lat: 31.634, lng: 74.8723 },
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
    mangalore: { lat: 12.9141, lng: 74.856 },
    aurangabad: { lat: 19.8762, lng: 75.3433 },
    udaipur: { lat: 24.5854, lng: 73.7125 },
    gaya: { lat: 24.7969, lng: 85.0078 },
    dibrugarh: { lat: 27.4728, lng: 94.912 },
    dimapur: { lat: 25.9063, lng: 93.7276 },
    imphal: { lat: 24.817, lng: 93.9368 },
    silchar: { lat: 24.8335, lng: 92.7789 },
    jammu: { lat: 32.7266, lng: 74.857 },
    leh: { lat: 34.1526, lng: 77.5771 },
    portblair: { lat: 11.6234, lng: 92.7265 },
    bagdogra: { lat: 26.6811, lng: 88.3289 },
    kanpur: { lat: 26.4499, lng: 80.3319 },
    bareilly: { lat: 28.367, lng: 79.4304 },
    belgaum: { lat: 15.8497, lng: 74.4977 },
    dharamshala: { lat: 32.219, lng: 76.3234 },
    gwalior: { lat: 26.2183, lng: 78.1828 },
    hubli: { lat: 15.3647, lng: 75.124 },
    jabalpur: { lat: 23.1815, lng: 79.9864 },
    kannur: { lat: 11.8745, lng: 75.3704 },
    kolhapur: { lat: 16.705, lng: 74.2433 },
    mysore: { lat: 12.2958, lng: 76.6394 },
    pantnagar: { lat: 29.0222, lng: 79.4925 },
    shillong: { lat: 25.5788, lng: 91.8933 },
    tezpur: { lat: 26.6517, lng: 92.7926 },
    tuticorin: { lat: 8.7642, lng: 78.1348 },
    vijayawada: { lat: 16.5062, lng: 80.648 }
  };
  const key = city.trim().toLowerCase().replace(/\s+/g, "");
  const coords = cityCoords[key] || cityCoords[city.trim().toLowerCase()] || cityCoords[city.trim().toLowerCase().replace(/\s+/g, "")];
  if (!coords) throw new Error(`Unknown city: ${city}`);
  const interests = preferences?.interests || [];
  return foursquareService.searchByInterests(coords, interests);
}
var FOURSQUARE_API_KEY, FOURSQUARE_API_VERSION, BASE_URL, FoursquareService, foursquareService;
var init_foursquare = __esm({
  "server/services/foursquare.ts"() {
    "use strict";
    dotenv.config();
    FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY || "KTPYB5EGQST4HPZERYDABLDWGZXKLKXW3VI200RJUYCLOWJ0";
    FOURSQUARE_API_VERSION = process.env.FOURSQUARE_API_VERSION || "2025-06-17";
    BASE_URL = "https://places-api.foursquare.com/places";
    FoursquareService = class {
      headers = {
        "Accept": "application/json",
        "Authorization": `Bearer ${FOURSQUARE_API_KEY}`,
        // API version header; overridable via env FOURSQUARE_API_VERSION
        "X-Places-Api-Version": FOURSQUARE_API_VERSION
      };
      async fetchJson(url, init, retries = 1) {
        const attempt = async () => {
          const response = await fetch(url, { ...init || {}, headers: { ...this.headers, ...init?.headers || {} } });
          const contentType = response.headers.get("content-type") || "";
          if (response.status === 429) {
            const retryAfter = Number(response.headers.get("retry-after") || 1);
            if (retries > 0) {
              await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1e3));
              return attempt();
            }
            let bodyText = "";
            try {
              bodyText = await response.text();
            } catch {
            }
            const err = new Error(`Foursquare rate limit exceeded (429). ${bodyText?.slice(0, 200)}`);
            err.status = 429;
            throw err;
          }
          if (!response.ok) {
            let errorPayload = void 0;
            if (contentType.includes("application/json")) {
              try {
                errorPayload = await response.json();
              } catch {
              }
            }
            if (!errorPayload) {
              try {
                errorPayload = { message: await response.text() };
              } catch {
                errorPayload = { message: response.statusText };
              }
            }
            const msg = typeof errorPayload === "string" ? errorPayload : errorPayload?.message || JSON.stringify(errorPayload);
            const err = new Error(`Foursquare API error: ${response.status} ${msg}`);
            err.status = response.status;
            throw err;
          }
          if (!contentType.includes("application/json")) {
            const text2 = await response.text();
            try {
              return JSON.parse(text2);
            } catch {
              throw new Error(`Unexpected non-JSON response from Foursquare (content-type: ${contentType}). Body: ${text2.slice(0, 200)}`);
            }
          }
          return response.json();
        };
        return attempt();
      }
      async searchPlaces(params) {
        try {
          const searchParams = new URLSearchParams({
            ll: params.ll,
            radius: (params.radius || 1e4).toString(),
            limit: (params.limit || 50).toString(),
            sort: params.sort || "relevance"
          });
          if (params.categories) {
            searchParams.append("fsq_category_ids", params.categories);
          }
          if (params.query) {
            searchParams.append("query", params.query);
          }
          const data = await this.fetchJson(`${BASE_URL}/search?${searchParams}`);
          return data.results.map((place) => {
            const lat = place.latitude ?? place?.geocodes?.main?.latitude ?? 0;
            const lng = place.longitude ?? place?.geocodes?.main?.longitude ?? 0;
            return { ...place, latitude: lat, longitude: lng };
          });
        } catch (error) {
          console.error("Error searching places:", error);
          throw new Error(`Failed to search places: ${error}`);
        }
      }
      async getPlaceDetails(placeId) {
        try {
          const place = await this.fetchJson(`${BASE_URL}/${placeId}?fields=fsq_id,name,categories,location,timezone,geocodes,rating,price,description,website,tel,email,photos,social_media,placemaker_url,hours`);
          return {
            ...place,
            latitude: place.latitude || place.geocodes?.main?.latitude || 0,
            longitude: place.longitude || place.geocodes?.main?.longitude || 0,
            hours: place.hours ? { display: place.hours.display, open_now: place.hours.open_now } : void 0
          };
        } catch (error) {
          console.error("Error getting place details:", error);
          throw new Error(`Failed to get place details: ${error}`);
        }
      }
      async getPlaceTips(placeId) {
        try {
          const data = await this.fetchJson(`${BASE_URL}/${placeId}/tips?limit=10`);
          const items = Array.isArray(data?.tips) ? data.tips : Array.isArray(data?.results) ? data.results : [];
          return items.map((t) => ({ text: t.text || t.tip || "" })).filter((t) => t.text);
        } catch (error) {
          console.error("Error getting place tips:", error);
          return [];
        }
      }
      async searchByInterests(location, interests, radius = 1e4) {
        const categoryMap = {
          "art": "4deefb944765f83613cdba6e,4bf58dd8d48988d181941735,4bf58dd8d48988d1e2931735",
          "culture": "4deefb944765f83613cdba6e,4bf58dd8d48988d181941735,4bf58dd8d48988d12d941735",
          "food": "4d4b7105d754a06374d81259,4d4b7105d754a06377d81259",
          "dining": "4d4b7105d754a06374d81259,4d4b7105d754a06377d81259",
          "history": "4deefb944765f83613cdba6e,4bf58dd8d48988d12d941735",
          "nature": "4d4b7105d754a06377d81259,4bf58dd8d48988d163941735",
          "parks": "4bf58dd8d48988d163941735",
          "shopping": "4d4b7105d754a06378d81259,4bf58dd8d48988d1f6941735",
          "entertainment": "4d4b7105d754a06376d81259,4bf58dd8d48988d1e1931735",
          "sports": "4f04af1f2fb6e1c99f3db0bb,4bf58dd8d48988d175941735",
          "fitness": "4bf58dd8d48988d175941735,4f04af1f2fb6e1c99f3db0bb",
          "religious": "4bf58dd8d48988d131941735,4eb1d4d54b900d56c88a45fc"
        };
        const mustSee = [
          "4bf58dd8d48988d12d941735",
          // Landmark & Historical Place
          "4bf58dd8d48988d181941735",
          // Art Museum
          "4deefb944765f83613cdba6e",
          // Museum
          "4bf58dd8d48988d165941735"
          // Scenic Lookout / Viewpoint (close approx)
        ];
        const selected = interests.map((interest) => categoryMap[interest.toLowerCase()]).filter(Boolean).flatMap((s) => s.split(","));
        const categories = Array.from(/* @__PURE__ */ new Set([...selected, ...mustSee])).join(",");
        return this.searchPlaces({
          ll: `${location.lat},${location.lng}`,
          radius,
          categories,
          limit: 50,
          sort: "rating"
        });
      }
    };
    foursquareService = new FoursquareService();
  }
});

// server/services/gemini.ts
var gemini_exports = {};
__export(gemini_exports, {
  generateItinerary: () => generateItinerary,
  generateMultiDayItinerary: () => generateMultiDayItinerary,
  getGeminiPlan: () => getGeminiPlan,
  optimizeItinerary: () => optimizeItinerary,
  summarizeTips: () => summarizeTips
});
import dotenv2 from "dotenv";
import { GoogleGenAI } from "@google/genai";
async function generateItinerary(request) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ""
    });
    const config = {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 3072
    };
    const model = "gemini-2.0-flash-exp";
    const durationLower = request.duration.toLowerCase();
    const recommendedStops = durationLower.includes("2-3") ? "3-4" : durationLower.includes("half") ? "4-6" : "6-10";
    const systemPrompt = `You are an expert travel itinerary planner. Based on user preferences and available places, create an optimized single-day itinerary.

User Preferences:
- Interests: ${request.interests.join(", ")}
- Duration: ${request.duration}
- Budget: ${request.budget}  
- Dietary Restrictions: ${request.dietaryRestrictions.join(", ")}
- Transportation: ${request.transportation}
- Location: ${request.location.address || `${request.location.lat}, ${request.location.lng}`}

Available Places: ${JSON.stringify(request.places)}

IMPORTANT: You MUST respond with ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks.

Create an optimized itinerary that:
1. Includes ${recommendedStops} total stops for the day
2. Includes exactly one lunch stop (~1-2 PM) and one dinner stop (~7-8 PM), categorized as "Restaurant"
3. Prioritizes famous landmarks and top-rated attractions first, matching user interests
4. Fits within the time duration and minimizes travel time
5. Respects budget constraints and dietary restrictions for meal stops
6. Uses realistic scheduled times from morning to evening without overlaps

Respond with ONLY this exact JSON structure (no markdown, no explanations):
{
  "places": [
    {
      "fsqPlaceId": "string",
      "name": "string", 
      "category": "string",
      "estimatedDuration": 60,
      "scheduledTime": "9:00 AM",
      "order": 1,
      "reason": "string explaining why this place fits user preferences"
    }
  ],
  "totalDuration": 480,
  "recommendations": ["helpful tip 1", "helpful tip 2"]
}`;
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt
          }
        ]
      }
    ];
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents
    });
    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }
    console.log("Raw AI response:", fullText);
    if (!fullText || fullText.trim().length === 0) {
      throw new Error("Empty response from AI - please try again");
    }
    let jsonText = fullText.trim();
    jsonText = jsonText.replace(/^```json\s*/gm, "").replace(/^```\s*/gm, "");
    jsonText = jsonText.replace(/\s*```$/gm, "");
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    jsonText = jsonText.trim();
    if (!jsonText || jsonText.length === 0) {
      throw new Error("No valid JSON found in AI response");
    }
    const parsedResponse = JSON.parse(jsonText);
    return parsedResponse;
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error(`Failed to generate itinerary: ${error}`);
  }
}
async function generateMultiDayItinerary(request) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ""
    });
    const config = {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 6144
    };
    const model = "gemini-2.0-flash-exp";
    let days = request.days || 0;
    let dates = [];
    if (!days && request.startDate && request.endDate) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const msPerDay = 24 * 60 * 60 * 1e3;
      const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
      days = diff;
      for (let i = 0; i < diff; i++) {
        const d = new Date(start.getTime() + i * msPerDay);
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    if (!days) days = 3;
    const systemPrompt = `You are an expert travel planner. Create a comprehensive multi-day itinerary.

User Preferences:
- Interests: ${request.interests.join(", ")}
- Budget: ${request.budget}
- Dietary Restrictions: ${request.dietaryRestrictions.join(", ")}
- Transportation: ${request.transportation}
- Location: ${request.location.address || `${request.location.lat}, ${request.location.lng}`}
- Number of days: ${days}
- Dates (if provided): ${JSON.stringify(dates)}

Available Places (with ratings/prices if any): ${JSON.stringify(request.places)}

Rules:
1) Plan ${days} full days. Each day must have: morning attractions, lunch (~1 PM), afternoon attractions, dinner (~7-8 PM). Lunch and dinner must be real restaurants from the available places when possible and respect dietary restrictions; otherwise choose popular restaurants in the city.
2) Include famous landmarks and iconic attractions every day, prioritized by rating/popularity. Mix with user-interest-specific places.
3) Minimize backtracking and keep travel time reasonable.
4) Provide clear scheduled times and durations for each place, ordered sequentially. No time overlaps.
5) Use items from Available Places whenever possible. Use their fsqPlaceId so we can map geocoordinates.
6) Respond with ONLY valid JSON in the exact schema below.

Required JSON schema:
{
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "string",
      "places": [
        {"fsqPlaceId":"string","name":"string","category":"string","estimatedDuration":60,"scheduledTime":"9:00 AM","order":1,"reason":"string"}
      ],
      "meals": {
        "lunch": {"fsqPlaceId":"string","name":"string","category":"Restaurant","estimatedDuration":60,"scheduledTime":"1:00 PM","order":3,"reason":"string"},
        "dinner": {"fsqPlaceId":"string","name":"string","category":"Restaurant","estimatedDuration":90,"scheduledTime":"7:30 PM","order":6,"reason":"string"}
      }
    }
  ],
  "recommendations": ["tip 1", "tip 2"],
  "summary": "overall summary"
}`;
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] }
    ];
    const response = await ai.models.generateContentStream({ model, config, contents });
    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) fullText += chunk.text;
    }
    console.log("Raw Multi-day AI response:", fullText);
    if (!fullText || fullText.trim().length === 0) {
      throw new Error("Empty response from AI - please try again");
    }
    let jsonText = fullText.trim();
    jsonText = jsonText.replace(/^```json\s*/gm, "").replace(/^```\s*/gm, "");
    jsonText = jsonText.replace(/\s*```$/gm, "");
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];
    jsonText = jsonText.trim();
    if (!jsonText) throw new Error("No valid JSON found in AI response");
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error("Error generating multi-day itinerary:", error);
    throw new Error(`Failed to generate multi-day itinerary: ${error}`);
  }
}
async function optimizeItinerary(currentItinerary, userFeedback) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ""
    });
    const config = {
      temperature: 0.5,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    };
    const model = "gemini-2.0-flash-exp";
    const prompt = `You are an expert travel itinerary optimizer. 

Current Itinerary: ${JSON.stringify(currentItinerary)}

User Feedback: ${userFeedback}

Based on the feedback, optimize the itinerary while maintaining the same structure. 
Return ONLY a JSON object with the same structure as the original itinerary.`;
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      }
    ];
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents
    });
    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }
    console.log("Raw optimization AI response:", fullText);
    if (!fullText || fullText.trim().length === 0) {
      throw new Error("Empty response from AI - please try again");
    }
    let jsonText = fullText.trim();
    jsonText = jsonText.replace(/^```json\s*/gm, "").replace(/^```\s*/gm, "");
    jsonText = jsonText.replace(/\s*```$/gm, "");
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    jsonText = jsonText.trim();
    if (!jsonText || jsonText.length === 0) {
      throw new Error("No valid JSON found in AI optimization response");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error optimizing itinerary:", error);
    throw new Error(`Failed to optimize itinerary: ${error}`);
  }
}
async function getGeminiPlan({ flights, places: places2, preferences, tripDetails }) {
  const request = {
    interests: preferences?.interests || [],
    duration: preferences?.duration || "",
    budget: preferences?.budget || "",
    dietaryRestrictions: preferences?.dietaryRestrictions || [],
    transportation: preferences?.transportation || "",
    location: { lat: 0, lng: 0, address: tripDetails?.destinationCity || "" },
    places: places2 || []
  };
  const isMultiDay = Boolean(tripDetails?.startDate && tripDetails?.endDate) || request.duration?.toLowerCase?.().includes("multiple days");
  if (isMultiDay) {
    return await generateMultiDayItinerary({
      ...request,
      startDate: tripDetails?.startDate,
      endDate: tripDetails?.endDate
    });
  }
  return await generateItinerary(request);
}
async function summarizeTips(placeName, tips) {
  try {
    if (!tips || tips.length === 0) return "";
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const config = { temperature: 0.3, topK: 40, topP: 0.9, maxOutputTokens: 256 };
    const model = "gemini-2.0-flash-exp";
    const prompt = `You will receive several short user tips about a place. Write a single, ultra-concise highlight summary for travelers in under 280 characters. Avoid repetition, no markdown, no preface. Place: ${placeName}

Tips:
${tips.map((t, i) => `- ${t}`).join("\n")}`;
    const contents = [{ role: "user", parts: [{ text: prompt }] }];
    const response = await ai.models.generateContentStream({ model, config, contents });
    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) fullText += chunk.text;
    }
    const text2 = (fullText || "").trim();
    return text2.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim().slice(0, 280);
  } catch (err) {
    console.error("summarizeTips error", err);
    return "";
  }
}
var init_gemini = __esm({
  "server/services/gemini.ts"() {
    "use strict";
    dotenv2.config();
  }
});

// server/index.ts
import dotenv3 from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  userPreferences;
  itineraries;
  places;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.userPreferences = /* @__PURE__ */ new Map();
    this.itineraries = /* @__PURE__ */ new Map();
    this.places = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(userData) {
    const id = randomUUID();
    const user = { ...userData, id };
    this.users.set(id, user);
    return user;
  }
  async getUserPreferences(sessionId) {
    return Array.from(this.userPreferences.values()).find(
      (prefs) => prefs.sessionId === sessionId
    );
  }
  async createUserPreferences(preferences) {
    const id = randomUUID();
    const userPrefs = {
      id,
      sessionId: preferences.sessionId,
      interests: preferences.interests,
      duration: preferences.duration,
      budget: preferences.budget,
      dietaryRestrictions: preferences.dietaryRestrictions,
      transportation: preferences.transportation,
      location: preferences.location || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.userPreferences.set(id, userPrefs);
    return userPrefs;
  }
  async updateUserPreferences(sessionId, preferences) {
    const existing = await this.getUserPreferences(sessionId);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...preferences
    };
    this.userPreferences.set(existing.id, updated);
    return updated;
  }
  async getItinerary(sessionId) {
    return Array.from(this.itineraries.values()).find(
      (itinerary) => itinerary.sessionId === sessionId
    );
  }
  async createItinerary(itinerary) {
    const id = randomUUID();
    const newItinerary = {
      id,
      sessionId: itinerary.sessionId,
      places: itinerary.places,
      totalDuration: itinerary.totalDuration,
      totalDistance: itinerary.totalDistance,
      optimizedRoute: itinerary.optimizedRoute || null,
      routeGeometry: itinerary.routeGeometry || null,
      // <-- Add geometry
      // @ts-ignore store osrmInstructions if provided
      osrmInstructions: itinerary.osrmInstructions || null,
      multiDay: itinerary.multiDay || null,
      // <-- store multi-day
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.itineraries.set(id, newItinerary);
    return newItinerary;
  }
  async updateItinerary(sessionId, itinerary) {
    const existing = await this.getItinerary(sessionId);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      places: itinerary.places || existing.places,
      totalDuration: itinerary.totalDuration || existing.totalDuration,
      totalDistance: itinerary.totalDistance || existing.totalDistance,
      optimizedRoute: itinerary.optimizedRoute || existing.optimizedRoute,
      routeGeometry: itinerary.routeGeometry || existing.routeGeometry,
      // <-- Add geometry
      // @ts-ignore
      osrmInstructions: itinerary.osrmInstructions ?? existing.osrmInstructions ?? null,
      multiDay: itinerary.multiDay ?? existing.multiDay,
      // <-- update multi-day
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.itineraries.set(existing.id, updated);
    return updated;
  }
  async getPlace(fsqPlaceId) {
    return Array.from(this.places.values()).find(
      (place) => place.fsqPlaceId === fsqPlaceId
    );
  }
  async createPlace(place) {
    const id = randomUUID();
    const newPlace = {
      id,
      fsqPlaceId: place.fsqPlaceId,
      name: place.name,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating || null,
      priceLevel: place.priceLevel || null,
      address: place.address || null,
      description: place.description || null,
      photoUrl: place.photoUrl || null,
      website: place.website || null,
      phone: place.phone || null,
      openingHours: place.openingHours || null,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    this.places.set(id, newPlace);
    return newPlace;
  }
  async updatePlace(fsqPlaceId, place) {
    const existing = await this.getPlace(fsqPlaceId);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...place,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    this.places.set(existing.id, updated);
    return updated;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  interests: json("interests").$type().notNull(),
  duration: text("duration").notNull(),
  budget: text("budget").notNull(),
  dietaryRestrictions: json("dietary_restrictions").$type().notNull(),
  transportation: text("transportation").notNull(),
  location: json("location").$type(),
  createdAt: timestamp("created_at").defaultNow()
});
var itineraries = pgTable("itineraries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  places: json("places").$type().notNull(),
  totalDuration: integer("total_duration").notNull(),
  // in minutes
  totalDistance: real("total_distance").notNull(),
  // in kilometers
  optimizedRoute: json("optimized_route").$type(),
  routeGeometry: json("route_geometry").$type(),
  // <-- Add geometry
  osrmInstructions: json("osrm_instructions").$type(),
  // <-- Persist OSRM turn-by-turn
  multiDay: json("multi_day").$type(),
  // <-- Persist multi-day structure for editing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var places = pgTable("places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fsqPlaceId: text("fsq_place_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  rating: real("rating"),
  priceLevel: integer("price_level"),
  address: text("address"),
  description: text("description"),
  photoUrl: text("photo_url"),
  website: text("website"),
  phone: text("phone"),
  openingHours: json("opening_hours"),
  lastUpdated: timestamp("last_updated").defaultNow()
});
var insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true
}).extend({
  interests: z.array(z.string()),
  dietaryRestrictions: z.array(z.string()),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }).optional()
});
var insertItinerarySchema = createInsertSchema(itineraries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  places: z.array(z.any()),
  optimizedRoute: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).optional(),
  routeGeometry: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).optional(),
  // <-- Add geometry to zod schema
  osrmInstructions: z.array(z.array(z.string())).optional(),
  // <-- Persist OSRM turn-by-turn
  multiDay: z.any().optional()
  // <-- Allow multi-day
});
var insertPlaceSchema = createInsertSchema(places).omit({
  id: true,
  lastUpdated: true
}).extend({
  openingHours: z.any().optional()
});
var userPreferencesInputSchema = z.object({
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
  duration: z.string().min(1, "Please select duration"),
  budget: z.string().min(1, "Please select budget"),
  dietaryRestrictions: z.array(z.string()),
  transportation: z.string().min(1, "Please select transportation"),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }).optional()
});
var locationInputSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional()
});

// server/services/langchain-agent.ts
init_foursquare();

// server/services/osrm.ts
import polyline from "@mapbox/polyline";
var OSRM_BASE_URL = "https://router.project-osrm.org";
function metersToText(meters) {
  if (!isFinite(meters)) return "";
  if (meters < 1e3) return `${Math.round(meters)} m`;
  return `${(meters / 1e3).toFixed(1)} km`;
}
function stepToText(step) {
  const t = step.maneuver?.type || "";
  const m = step.maneuver?.modifier || "";
  const road = step.name || "road";
  const dist = metersToText(step.distance);
  const withDist = dist ? ` for ${dist}` : "";
  switch (t) {
    case "depart":
      return `Head ${m || "out"} on ${road}${withDist}`;
    case "arrive":
      return `Arrive at destination on ${road}`;
    case "turn":
      return `Turn ${m || ""} onto ${road}${withDist}`.replace(/\s+/g, " ").trim();
    case "continue":
      return `Continue on ${road}${withDist}`;
    case "fork":
      return `Keep ${m || "to the indicated side"} onto ${road}${withDist}`.replace(/\s+/g, " ").trim();
    case "merge":
      return `Merge ${m ? m + " " : ""}onto ${road}${withDist}`.replace(/\s+/g, " ").trim();
    case "roundabout":
      return `Take the roundabout onto ${road}${withDist}`;
    case "new name":
      return `Continue onto ${road}${withDist}`;
    case "end of road":
      return `At the end of the road, turn ${m || ""} onto ${road}${withDist}`.replace(/\s+/g, " ").trim();
    case "use lane":
      return `Use the ${m || ""} lane${withDist}`.replace(/\s+/g, " ").trim();
    case "on ramp":
      return `Take the ramp ${m || ""} onto ${road}${withDist}`.replace(/\s+/g, " ").trim();
    case "off ramp":
      return `Take the exit ${m || ""} onto ${road}${withDist}`.replace(/\s+/g, " ").trim();
    case "uturn":
      return `Make a U-turn onto ${road}${withDist}`;
    default:
      return `${t || "Proceed"} on ${road}${withDist}`.trim();
  }
}
var OSRMService = class {
  async getRoute(coordinates, profile = "foot") {
    try {
      const coordString = coordinates.map((coord) => `${coord[0]},${coord[1]}`).join(";");
      const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordString}?overview=full&geometries=polyline&steps=true`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      const result = await response.json();
      if (result.routes && result.routes[0]?.geometry) {
        const decoded = polyline.decode(result.routes[0].geometry).map((point) => ({ lat: point[0], lng: point[1] }));
        result.decodedGeometry = decoded;
      }
      const legs = result.routes?.[0]?.legs;
      if (Array.isArray(legs)) {
        result.instructionsByLeg = legs.map(
          (leg) => (leg.steps || []).map((s) => stepToText(s))
        );
      } else {
        result.instructionsByLeg = [];
      }
      return result;
    } catch (error) {
      console.error("Error getting route:", error);
      throw new Error(`Failed to get route: ${error}`);
    }
  }
  async optimizeRoute(coordinates, profile = "foot") {
    try {
      const coordString = coordinates.map((coord) => `${coord[0]},${coord[1]}`).join(";");
      const url = `${OSRM_BASE_URL}/trip/v1/${profile}/${coordString}?source=first&destination=last&roundtrip=false`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.trips || data.trips.length === 0) {
        throw new Error("No trips found in OSRM response");
      }
      const trip = data.trips[0];
      const optimizedOrder = data.waypoints.map((wp) => wp.waypoint_index);
      const routes = [];
      for (let i = 0; i < coordinates.length - 1; i++) {
        const segmentCoords = [coordinates[i], coordinates[i + 1]];
        const segmentRoute = await this.getRoute(segmentCoords, profile);
        if (segmentRoute.routes && segmentRoute.routes.length > 0) {
          routes.push({
            from: i,
            to: i + 1,
            distance: segmentRoute.routes[0].distance / 1e3,
            // convert to km
            duration: segmentRoute.routes[0].duration / 60
            // convert to minutes
          });
        }
      }
      return {
        optimizedOrder,
        totalDistance: trip.distance / 1e3,
        // convert to km
        totalDuration: trip.duration / 60,
        // convert to minutes
        routes
      };
    } catch (error) {
      console.error("Error optimizing route:", error);
      throw new Error(`Failed to optimize route: ${error}`);
    }
  }
  async calculateTravelTime(from, to, profile = "foot") {
    try {
      const route = await this.getRoute([from, to], profile);
      if (!route.routes || route.routes.length === 0) {
        throw new Error("No route found");
      }
      return {
        distance: route.routes[0].distance / 1e3,
        // convert to km
        duration: route.routes[0].duration / 60
        // convert to minutes
      };
    } catch (error) {
      console.error("Error calculating travel time:", error);
      return { distance: 0, duration: 0 };
    }
  }
  getProfileFromTransportation(transportation) {
    switch (transportation.toLowerCase()) {
      case "driving":
        return "driving";
      case "cycling":
        return "bicycle";
      case "walking":
      default:
        return "foot";
    }
  }
};
var osrmService = new OSRMService();

// server/services/langchain-agent.ts
init_gemini();
var TravelPlanningAgent = class {
  context;
  constructor(context) {
    this.context = context;
  }
  async executeTask(task) {
    try {
      switch (task) {
        case "discover_places":
          return await this.discoverPlaces();
        case "generate_itinerary":
          return await this.generateItinerary();
        case "optimize_route":
          return await this.optimizeRoute();
        case "adjust_itinerary":
          return await this.adjustItinerary();
        default:
          return {
            success: false,
            message: `Unknown task: ${task}`,
            status: "error"
          };
      }
    } catch (error) {
      console.error(`Error executing task ${task}:`, error);
      return {
        success: false,
        message: `Failed to execute ${task}: ${error}`,
        status: "error"
      };
    }
  }
  async discoverPlaces() {
    try {
      console.log("\u{1F50D} Discovering places based on user interests...");
      const places2 = await foursquareService.searchByInterests(
        this.context.currentLocation,
        this.context.userPreferences.interests,
        this.getRadiusFromDuration(this.context.userPreferences.duration)
      );
      const filteredPlaces = this.filterPlacesByPreferences(places2);
      this.context.availablePlaces = filteredPlaces;
      return {
        success: true,
        data: { places: filteredPlaces, count: filteredPlaces.length },
        message: `Found ${filteredPlaces.length} places matching your interests`,
        status: "searching"
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to discover places: ${error}`,
        status: "error"
      };
    }
  }
  async generateItinerary() {
    try {
      console.log("\u{1F9E0} Generating optimized itinerary with AI...");
      if (!this.context.availablePlaces || this.context.availablePlaces.length === 0) {
        await this.discoverPlaces();
      }
      const aiItinerary = await generateItinerary({
        interests: this.context.userPreferences.interests,
        duration: this.context.userPreferences.duration,
        budget: this.context.userPreferences.budget,
        dietaryRestrictions: this.context.userPreferences.dietaryRestrictions,
        transportation: this.context.userPreferences.transportation,
        location: this.context.currentLocation,
        places: this.context.availablePlaces
      });
      const itineraryPlaces = aiItinerary.places.map((place, index) => {
        const fullPlace = this.context.availablePlaces.find((p) => p.fsq_place_id === place.fsqPlaceId);
        return {
          fsqPlaceId: place.fsqPlaceId,
          name: place.name,
          category: place.category || (fullPlace?.categories?.[0]?.name ?? "Point of Interest"),
          latitude: fullPlace?.latitude || 0,
          longitude: fullPlace?.longitude || 0,
          rating: fullPlace?.rating,
          priceLevel: fullPlace?.price,
          address: fullPlace?.location?.formatted_address,
          description: fullPlace?.description || place.reason,
          photoUrl: this.getPhotoUrl(fullPlace?.photos),
          website: fullPlace?.website,
          tel: fullPlace?.tel,
          social_media: fullPlace?.social_media,
          placemaker_url: fullPlace?.placemaker_url,
          estimatedDuration: place.estimatedDuration,
          scheduledTime: place.scheduledTime,
          order: place.order,
          reason: place.reason
          // AI recommendation
        };
      });
      this.context.currentItinerary = itineraryPlaces;
      return {
        success: true,
        data: {
          itinerary: itineraryPlaces,
          totalDuration: aiItinerary.totalDuration,
          recommendations: aiItinerary.recommendations
        },
        message: "Itinerary generated successfully",
        status: "optimizing"
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate itinerary: ${error}`,
        status: "error"
      };
    }
  }
  async optimizeRoute() {
    try {
      console.log("\u{1F6E3}\uFE0F Optimizing route with OSRM...");
      if (!this.context.currentItinerary || this.context.currentItinerary.length === 0) {
        throw new Error("No itinerary to optimize");
      }
      const validPlaces = this.context.currentItinerary.filter(
        (place) => typeof place.longitude === "number" && typeof place.latitude === "number" && !isNaN(place.longitude) && !isNaN(place.latitude) && place.longitude !== 0 && place.latitude !== 0
      );
      const coordinates = [
        [this.context.currentLocation.lng, this.context.currentLocation.lat],
        ...validPlaces.map((place) => [place.longitude, place.latitude])
      ];
      console.log("OSRM coordinates:", coordinates);
      if (coordinates.length < 2) {
        throw new Error("Not enough valid locations for route optimization");
      }
      const profile = osrmService.getProfileFromTransportation(this.context.userPreferences.transportation);
      const optimizationResult = await osrmService.optimizeRoute(coordinates, profile);
      const optimizedItinerary = validPlaces.map((place, index) => {
        const routeInfo = optimizationResult.routes.find((r) => r.from === index);
        return {
          ...place,
          travelTimeToNext: routeInfo?.duration,
          distanceToNext: routeInfo?.distance
        };
      });
      return {
        success: true,
        data: {
          itinerary: optimizedItinerary,
          totalDistance: optimizationResult.totalDistance,
          totalDuration: optimizationResult.totalDuration,
          optimizedRoute: optimizationResult.optimizedOrder
        },
        message: "Route optimized successfully",
        status: "complete"
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to optimize route: ${error}`,
        status: "error"
      };
    }
  }
  async adjustItinerary(feedback) {
    try {
      console.log("\u{1F504} Adjusting itinerary based on feedback...");
      if (!this.context.currentItinerary) {
        throw new Error("No current itinerary to adjust");
      }
      const adjustedItinerary = await optimizeItinerary(
        this.context.currentItinerary,
        feedback || "Optimize for better experience"
      );
      return {
        success: true,
        data: { itinerary: adjustedItinerary },
        message: "Itinerary adjusted successfully",
        status: "complete"
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to adjust itinerary: ${error}`,
        status: "error"
      };
    }
  }
  filterPlacesByPreferences(places2) {
    return places2.filter((place) => {
      if (this.context.userPreferences.budget && place.price) {
        const budgetLevel = this.getBudgetLevel(this.context.userPreferences.budget);
        if (place.price > budgetLevel) return false;
      }
      if (this.context.userPreferences.dietaryRestrictions.length > 0) {
        const isRestaurant = place.categories?.some(
          (cat) => cat.name.toLowerCase().includes("restaurant") || cat.name.toLowerCase().includes("food")
        );
        if (isRestaurant) {
        }
      }
      return true;
    });
  }
  getBudgetLevel(budget) {
    switch (budget.toLowerCase()) {
      case "budget-friendly":
        return 1;
      case "moderate":
        return 2;
      case "premium":
        return 3;
      case "luxury":
        return 4;
      default:
        return 4;
    }
  }
  getRadiusFromDuration(duration) {
    switch (duration.toLowerCase()) {
      case "2-3 hours":
        return 5e3;
      case "half day (4-6 hours)":
        return 1e4;
      case "full day (8+ hours)":
        return 2e4;
      case "multiple days":
        return 5e4;
      default:
        return 1e4;
    }
  }
  getPhotoUrl(photos) {
    if (!photos || photos.length === 0) return void 0;
    const photo = photos[0];
    return `${photo.prefix}300x200${photo.suffix}`;
  }
};

// server/routes.ts
import { randomUUID as randomUUID2 } from "crypto";
var tipsSummaryCache = /* @__PURE__ */ new Map();
var TIPS_TTL_MS = 6 * 60 * 60 * 1e3;
async function registerRoutes(app2) {
  app2.use("/api", (req, res, next) => {
    if (!req.headers["session-id"]) {
      req.headers["session-id"] = randomUUID2();
    }
    next();
  });
  app2.post("/api/preferences", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const validatedData = userPreferencesInputSchema.parse(req.body);
      const preferences = await storage.createUserPreferences({
        sessionId,
        ...validatedData
      });
      res.json({
        success: true,
        preferences,
        sessionId
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to save preferences"
      });
    }
  });
  app2.post("/api/location", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const validatedLocation = locationInputSchema.parse(req.body);
      const updatedPreferences = await storage.updateUserPreferences(sessionId, {
        location: validatedLocation
      });
      if (!updatedPreferences) {
        const placeholder = {
          sessionId,
          interests: [],
          duration: "single day",
          budget: "medium",
          dietaryRestrictions: [],
          transportation: "walking",
          location: validatedLocation
        };
        await storage.createUserPreferences(placeholder);
      }
      res.json({
        success: true,
        location: validatedLocation
      });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update location"
      });
    }
  });
  app2.post("/api/generate-itinerary", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const preferences = await storage.getUserPreferences(sessionId);
      if (!preferences || !preferences.location) {
        return res.status(400).json({
          success: false,
          message: "User preferences and location required"
        });
      }
      const isMultiDay = preferences.duration?.toLowerCase?.().includes("multiple days");
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
      const discoverResult = await agent.executeTask("discover_places");
      if (!discoverResult.success) {
        return res.status(500).json(discoverResult);
      }
      if (isMultiDay) {
        const { generateMultiDayItinerary: generateMultiDayItinerary2 } = await Promise.resolve().then(() => (init_gemini(), gemini_exports));
        const multiDay = await generateMultiDayItinerary2({
          interests: preferences.interests,
          duration: preferences.duration,
          budget: preferences.budget,
          dietaryRestrictions: preferences.dietaryRestrictions,
          transportation: preferences.transportation,
          location: preferences.location,
          places: discoverResult.data.places || []
        });
        const flatPlaces = multiDay.days.flatMap((d) => {
          const meals = [];
          if (d.meals?.lunch) meals.push(d.meals.lunch);
          if (d.meals?.dinner) meals.push(d.meals.dinner);
          return [...d.places || [], ...meals].sort((a, b) => (a.order || 0) - (b.order || 0));
        });
        const resolved = discoverResult.data.places || [];
        const byId = Object.fromEntries(
          resolved.map((p) => [p.fsq_place_id, p])
        );
        const validPlaces = flatPlaces.map((place) => {
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
            photoUrl: full?.photos?.[0] ? `${full.photos[0].prefix}300x200${full.photos[0].suffix}` : void 0,
            estimatedDuration: place.estimatedDuration,
            scheduledTime: place.scheduledTime,
            order: place.order,
            reason: place.reason
          };
        }).filter((p) => typeof p.longitude === "number" && typeof p.latitude === "number" && !isNaN(p.longitude) && !isNaN(p.latitude));
        const augmentedDays = multiDay.days.map((d) => ({
          ...d,
          places: (d.places || []).map((p) => {
            const full = byId[p.fsqPlaceId];
            return {
              ...p,
              latitude: full?.latitude,
              longitude: full?.longitude
            };
          })
        }));
        multiDay.days = augmentedDays;
        const coordinates = [
          [preferences.location.lng, preferences.location.lat],
          ...validPlaces.map((p) => [p.longitude, p.latitude])
        ];
        const profile = osrmService.getProfileFromTransportation(preferences.transportation);
        const optimizationResult = await osrmService.optimizeRoute(coordinates, profile);
        const routeResult2 = await osrmService.getRoute(coordinates, profile);
        const routeGeometry2 = routeResult2.decodedGeometry || [];
        const osrmInstructions2 = routeResult2.instructionsByLeg || [];
        const itineraryForStorage = validPlaces.map((place, index) => {
          const routeInfo = optimizationResult.routes.find((r) => r.from === index);
          return {
            ...place,
            travelTimeToNext: routeInfo?.duration,
            distanceToNext: routeInfo?.distance
          };
        });
        const optimizedRoutePath2 = optimizationResult.optimizedOrder.map((idx) => {
          const c = coordinates[idx];
          return { lat: c[1], lng: c[0] };
        });
        const itinerary2 = await storage.createItinerary({
          sessionId,
          places: itineraryForStorage,
          totalDuration: Math.round(optimizationResult.totalDuration),
          totalDistance: optimizationResult.totalDistance,
          optimizedRoute: optimizedRoutePath2,
          routeGeometry: routeGeometry2,
          multiDay,
          // <-- persist multi-day
          // @ts-ignore store osrmInstructions in memory store
          osrmInstructions: osrmInstructions2
        });
        return res.json({ success: true, itinerary: itinerary2, multiDay });
      }
      const generateResult = await agent.executeTask("generate_itinerary");
      if (!generateResult.success) {
        return res.status(500).json(generateResult);
      }
      const optimizeResult = await agent.executeTask("optimize_route");
      if (!optimizeResult.success) {
        return res.status(500).json(optimizeResult);
      }
      const allCoords = [
        [preferences.location.lng, preferences.location.lat],
        ...optimizeResult.data.itinerary.map((place) => [place.longitude, place.latitude])
      ];
      const routeResult = await osrmService.getRoute(allCoords, osrmService.getProfileFromTransportation(preferences.transportation));
      const routeGeometry = routeResult.decodedGeometry || [];
      const osrmInstructions = routeResult.instructionsByLeg || [];
      const optimizedRoutePath = (optimizeResult.data.optimizedRoute || []).map((idx) => {
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
        osrmInstructions
      });
      res.json({
        success: true,
        itinerary,
        recommendations: generateResult.data.recommendations,
        routeGeometry,
        // @ts-ignore
        osrmInstructions
      });
    } catch (error) {
      console.error("Error generating itinerary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate itinerary"
      });
    }
  });
  app2.get("/api/itinerary", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
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
    } catch (error) {
      console.error("Error getting itinerary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get itinerary"
      });
    }
  });
  app2.put("/api/itinerary", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const { places: places2, feedback, multiDay } = req.body;
      if (!places2 && multiDay) {
        const updated = await storage.updateItinerary(sessionId, { multiDay });
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
        availablePlaces: [],
        currentItinerary: places2
      });
      const adjustResult = await agent.executeTask("adjust_itinerary");
      if (!adjustResult.success) {
        return res.status(500).json(adjustResult);
      }
      const updatedItinerary = await storage.updateItinerary(sessionId, {
        places: adjustResult.data.itinerary.places,
        totalDuration: adjustResult.data.itinerary.totalDuration,
        multiDay: multiDay ?? void 0
      });
      res.json({
        success: true,
        itinerary: updatedItinerary
      });
    } catch (error) {
      console.error("Error updating itinerary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update itinerary"
      });
    }
  });
  app2.get("/api/session", (req, res) => {
    const sessionId = req.headers["session-id"];
    res.json({ sessionId });
  });
  app2.post("/api/flight-options", async (req, res) => {
    try {
      const { startAirport, destinationCity, startDate, endDate } = req.body;
      if (!startAirport || !destinationCity || !startDate || !endDate) {
        return res.status(400).json({ error: "startAirport, destinationCity, startDate, endDate are required" });
      }
      const norm = (v) => String(v ?? "").toLowerCase();
      const cityNorm = (s) => norm(s).replace(/[^a-z0-9]/g, "");
      const parseAirportCode = (val) => norm(val).replace(/[^a-z0-9]/g, "");
      const getField = (f, keys) => {
        for (const k of keys) {
          if (f && f[k] != null) return f[k];
        }
        return void 0;
      };
      const toISODate = (val) => {
        if (val == null) return void 0;
        const s = String(val);
        const m = s.match(/\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return void 0;
      };
      const safeGet = (obj, path3) => {
        try {
          return path3.reduce((acc, key) => acc != null ? acc[key] : void 0, obj);
        } catch {
          return void 0;
        }
      };
      const parseDate = (f) => {
        const direct = getField(f, [
          "date",
          "departure_date",
          "depart_date",
          "departDate",
          "departureTime",
          "departure_time",
          "depart_time",
          "departTime",
          "depart_at",
          "departure_at",
          "outbound_date",
          "start_date"
        ]);
        const d1 = toISODate(direct);
        if (d1) return d1;
        const d2 = toISODate(safeGet(f, ["departure", "date"])) || toISODate(safeGet(f, ["departure", "time"])) || toISODate(safeGet(f, ["departure", "at"])) || toISODate(safeGet(f, ["segment", "departure", "at"]));
        if (d2) return d2;
        const d3 = toISODate(safeGet(f, ["legs", 0, "departure_time"])) || toISODate(safeGet(f, ["legs", 0, "departureTime"])) || toISODate(safeGet(f, ["legs", 0, "departure", "at"])) || toISODate(safeGet(f, ["legs", 0, "departure", "time"])) || toISODate(safeGet(f, ["segments", 0, "departure_time"])) || toISODate(safeGet(f, ["segments", 0, "departureTime"])) || toISODate(safeGet(f, ["segments", 0, "departure", "at"])) || toISODate(safeGet(f, ["segments", 0, "departure", "time"]));
        if (d3) return d3;
        const d4 = toISODate(safeGet(f, ["itineraries", 0, "segments", 0, "departure", "at"]));
        return d4;
      };
      const getOrigin = (f) => parseAirportCode(getField(f, ["from_airport", "from", "origin", "departure_airport", "src", "source", "origin_airport", "originCity", "origin_city"]));
      const getDest = (f) => parseAirportCode(getField(f, ["to_airport", "to", "destination", "arrival_airport", "dst", "dest", "destination_airport", "destinationCity", "destination_city"]));
      const parsePrice = (p) => {
        if (typeof p === "number") return p;
        if (typeof p === "string") {
          const num = p.replace(/[^0-9.]/g, "");
          return parseFloat(num || "0");
        }
        return 0;
      };
      const priceOf = (f) => parsePrice(getField(f, ["price", "total_price", "amount"]));
      const runPy = async (from, to, d1, d2) => new Promise((resolve, reject) => {
        (async () => {
          const { spawn } = await import("child_process");
          const py = spawn("python", ["a.py", from, to, d1, d2], { cwd: process.cwd() });
          let stdout = "";
          let stderr = "";
          py.stdout.on("data", (data) => {
            stdout += data.toString();
          });
          py.stderr.on("data", (data) => {
            stderr += data.toString();
          });
          py.on("close", () => {
            try {
              const start = stdout.indexOf("{");
              const end = stdout.lastIndexOf("}") + 1;
              const jsonStr = stdout.substring(start, end);
              const parsed = JSON.parse(jsonStr);
              resolve({ parsed, stderr, stdout });
            } catch (e) {
              reject(new Error(`Failed to parse flight data: ${stderr || e}`));
            }
          });
        })();
      });
      const pickCheapestForLeg = (flights2, from, to, date) => {
        const fromKey = cityNorm(from);
        const toKey = cityNorm(to);
        const dateKey = String(date).slice(0, 10);
        const candidates = flights2.filter((f) => {
          const o = getOrigin(f);
          const d = getDest(f);
          const fd = parseDate(f);
          const originOk = o.includes(fromKey) || fromKey.includes(o) || o.includes(norm(from));
          const destOk = d.includes(toKey) || toKey.includes(d) || d.includes(norm(to));
          if (!originOk || !destOk) return false;
          return !fd || fd === dateKey;
        });
        const exactDate = candidates.filter((f) => parseDate(f) === dateKey);
        const list = exactDate.length ? exactDate : candidates;
        if (list.length === 0) {
          const dirOnly = flights2.filter((f) => {
            const o = getOrigin(f);
            const d = getDest(f);
            return o && d && (o.includes(fromKey) || fromKey.includes(o)) && (d.includes(toKey) || toKey.includes(d));
          });
          return dirOnly.sort((a, b) => priceOf(a) - priceOf(b))[0] || flights2[0];
        }
        return list.sort((a, b) => priceOf(a) - priceOf(b))[0];
      };
      const outRes = await runPy(startAirport, destinationCity, startDate, startDate);
      const retRes = await runPy(destinationCity, startAirport, endDate, endDate);
      const outFlights = Array.isArray(outRes.parsed?.flights) ? outRes.parsed.flights : [];
      const retFlights = Array.isArray(retRes.parsed?.flights) ? retRes.parsed.flights : [];
      const outbound = pickCheapestForLeg(outFlights, startAirport, destinationCity, startDate);
      const inbound = pickCheapestForLeg(retFlights, destinationCity, startAirport, endDate);
      if (outbound && typeof outbound === "object") {
        outbound.leg = "outbound";
        outbound.departureDateISO = parseDate(outbound);
      }
      if (inbound && typeof inbound === "object") {
        inbound.leg = "return";
        inbound.departureDateISO = parseDate(inbound);
      }
      const flights = [outbound, inbound].filter(Boolean).slice(0, 2);
      const totalPrice = flights.reduce((sum, f) => sum + priceOf(f), 0);
      return res.json({ flights, totalPrice });
    } catch (error) {
      console.error("flight-options error", error);
      res.status(500).json({ error: error.message || "Failed to get flight options" });
    }
  });
  app2.post("/api/foursquare-places", async (req, res) => {
    try {
      const { city, preferences } = req.body;
      const { getPlaces: getPlaces2 } = await Promise.resolve().then(() => (init_foursquare(), foursquare_exports));
      const places2 = await getPlaces2(city, preferences);
      res.json(places2);
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to fetch places" });
    }
  });
  app2.post("/api/gemini-plan", async (req, res) => {
    try {
      const { flights, places: places2, preferences, tripDetails } = req.body;
      const { getGeminiPlan: getGeminiPlan2 } = await Promise.resolve().then(() => (init_gemini(), gemini_exports));
      const plan = await getGeminiPlan2({ flights, places: places2, preferences, tripDetails });
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to generate plan" });
    }
  });
  app2.post("/api/optimize-day", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const { places: places2 } = req.body;
      if (!Array.isArray(places2) || places2.length < 2) {
        return res.status(400).json({ error: "At least 2 places are required" });
      }
      const preferences = await storage.getUserPreferences(sessionId);
      const profile = osrmService.getProfileFromTransportation(preferences?.transportation || "walking");
      const coordinates = places2.map((p) => [p.longitude, p.latitude]);
      const opt = await osrmService.optimizeRoute(coordinates, profile);
      const orderedCoords = opt.optimizedOrder.map((idx) => coordinates[idx]);
      const routeResult = await osrmService.getRoute(orderedCoords, profile);
      return res.json({
        optimizedOrder: opt.optimizedOrder,
        totalDistance: opt.totalDistance,
        totalDuration: opt.totalDuration,
        routeGeometry: routeResult.decodedGeometry || [],
        // @ts-ignore
        osrmInstructions: routeResult.instructionsByLeg || []
      });
    } catch (e) {
      console.error("optimize-day error", e);
      return res.status(500).json({ error: "Failed to optimize day" });
    }
  });
  app2.post("/api/optimize-route", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const prefs = await storage.getUserPreferences(sessionId);
      if (!prefs || !prefs.location) {
        return res.status(400).json({ success: false, message: "User preferences with location are required" });
      }
      const bodyPlaces = Array.isArray(req.body?.places) ? req.body.places : void 0;
      const stored = await storage.getItinerary(sessionId);
      const places2 = bodyPlaces && bodyPlaces.length > 0 ? bodyPlaces : stored?.places || [];
      if (!Array.isArray(places2) || places2.length < 2) {
        return res.status(400).json({ success: false, message: "At least 2 places with coordinates are required to optimize" });
      }
      const coords = [
        [prefs.location.lng, prefs.location.lat],
        ...places2.map((p) => [Number(p.longitude), Number(p.latitude)])
      ];
      if (coords.some(([lng, lat]) => !isFinite(lng) || !isFinite(lat))) {
        return res.status(400).json({ success: false, message: "Invalid coordinates provided" });
      }
      const profile = osrmService.getProfileFromTransportation(prefs.transportation || "walking");
      const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(";");
      const tripUrl = `https://router.project-osrm.org/trip/v1/${profile}/${coordString}?source=first&destination=last&roundtrip=false`;
      const tripResp = await fetch(tripUrl);
      if (!tripResp.ok) {
        return res.status(502).json({ success: false, message: `OSRM trip error: ${tripResp.status}` });
      }
      const tripData = await tripResp.json();
      if (!tripData?.trips || !tripData.trips[0] || !Array.isArray(tripData.waypoints)) {
        return res.status(500).json({ success: false, message: "Invalid OSRM trip response" });
      }
      const inputIndices = tripData.waypoints.map((_, i) => i);
      inputIndices.sort((a, b) => tripData.waypoints[a].waypoint_index - tripData.waypoints[b].waypoint_index);
      const optimizedPlaceInputIdx = inputIndices.filter((idx) => idx !== 0);
      const optimizedPlaceOrder = optimizedPlaceInputIdx.map((inputIdx) => inputIdx - 1);
      const reorderedPlaces = optimizedPlaceOrder.map((pi, i) => ({
        ...places2[pi],
        order: i + 1
      }));
      const orderedCoords = [coords[0], ...optimizedPlaceOrder.map((pi) => coords[pi + 1])];
      const routeResult = await osrmService.getRoute(orderedCoords, profile);
      const decodedGeometry = routeResult.decodedGeometry || [];
      const osrmInstructions = routeResult.instructionsByLeg || [];
      const totalDistanceKm = (routeResult.routes?.[0]?.distance || 0) / 1e3;
      const totalDurationMin = (routeResult.routes?.[0]?.duration || 0) / 60;
      const updated = await storage.updateItinerary(sessionId, {
        places: reorderedPlaces,
        totalDistance: totalDistanceKm,
        totalDuration: Math.round(totalDurationMin),
        routeGeometry: decodedGeometry,
        // @ts-ignore
        osrmInstructions
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: "Itinerary not found" });
      }
      return res.json({ success: true, itinerary: updated, osrmInstructions });
    } catch (e) {
      console.error("optimize-route error", e);
      return res.status(500).json({ success: false, message: e?.message || "Failed to optimize route" });
    }
  });
  app2.get("/api/quick/:type", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"];
      const prefs = await storage.getUserPreferences(sessionId);
      const { type } = req.params;
      let loc = prefs?.location;
      if (!loc) {
        const q = req.query || {};
        const hLat = Number(req.headers["x-user-lat"] || req.headers["x-lat"] || "");
        const hLng = Number(req.headers["x-user-lng"] || req.headers["x-lng"] || "");
        const qLat = Number(q.lat || "");
        const qLng = Number(q.lng || "");
        const lat = isFinite(hLat) ? hLat : isFinite(qLat) ? qLat : NaN;
        const lng = isFinite(hLng) ? hLng : isFinite(qLng) ? qLng : NaN;
        if (isFinite(lat) && isFinite(lng)) {
          loc = { lat, lng };
          storage.updateUserPreferences(sessionId, { location: loc }).catch(() => {
          });
        }
      }
      if (!loc) return res.status(400).json({ success: false, message: "Location required" });
      const { foursquareService: foursquareService2 } = await Promise.resolve().then(() => (init_foursquare(), foursquare_exports));
      const ll = `${loc.lat},${loc.lng}`;
      const mapping = {
        coffee: { query: "coffee" },
        atm: { query: "atm" },
        restroom: { query: "restroom toilet washroom bathroom wc" }
      };
      const m = mapping[type?.toLowerCase?.()] || { query: type };
      let results = await foursquareService2.searchPlaces({ ll, radius: 2e3, query: m.query, categories: m.categories, limit: 12, sort: "distance" });
      results = (results || []).filter((r) => isFinite(r?.latitude) && isFinite(r?.longitude)).slice(0, 12);
      return res.json({ success: true, results });
    } catch (e) {
      console.error("quick action error", e);
      const status = Number(e?.status) || 500;
      const isRate = status === 429;
      const message = isRate ? "Too many requests to Places API. Please wait a moment and try again." : e?.message?.slice?.(0, 200) || "Failed to fetch nearby options";
      return res.status(status).json({ success: false, message, code: status });
    }
  });
  app2.get("/api/places/:id/tips-summary", async (req, res) => {
    try {
      const { id } = req.params;
      const { foursquareService: foursquareService2 } = await Promise.resolve().then(() => (init_foursquare(), foursquare_exports));
      const { summarizeTips: summarizeTips2 } = await Promise.resolve().then(() => (init_gemini(), gemini_exports));
      const cached = tipsSummaryCache.get(id);
      const now = Date.now();
      if (cached && now - cached.ts < TIPS_TTL_MS) {
        return res.json({ success: true, summary: cached.summary, cached: true });
      }
      const tips = await foursquareService2.getPlaceTips(id);
      const texts = tips.map((t) => t.text).slice(0, 15);
      const details = await foursquareService2.getPlaceDetails(id).catch(() => null);
      const name = details?.name || id;
      const summary = await summarizeTips2(name, texts);
      tipsSummaryCache.set(id, { summary, ts: now });
      return res.json({ success: true, summary, cached: false });
    } catch (e) {
      console.error("tips-summary error", e);
      return res.status(500).json({ success: false, message: "Failed to summarize tips" });
    }
  });
  app2.post("/api/enrich/hours", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.json({ success: true, data: [] });
      const { foursquareService: foursquareService2 } = await Promise.resolve().then(() => (init_foursquare(), foursquare_exports));
      const data = await Promise.all(ids.map(async (id) => {
        try {
          const d = await foursquareService2.getPlaceDetails(id);
          return { id, hours: d.hours };
        } catch {
          return { id, hours: void 0 };
        }
      }));
      return res.json({ success: true, data });
    } catch (e) {
      console.error("enrich hours error", e);
      return res.status(500).json({ success: false, message: "Failed to enrich hours" });
    }
  });
  app2.all("/api/*", (_req, res) => {
    return res.status(404).json({ success: false, message: "API route not found" });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv3.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    const prev = res.getHeader("Vary");
    res.setHeader("Vary", prev ? String(prev) + ", Origin" : "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, session-id, x-user-lat, x-user-lng");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
        }
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
