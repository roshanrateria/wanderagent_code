# WanderAgent Repository Inspection Report
**Generated:** 2025-01-15  
**Repository:** roshanrateria/wanderagent_code  
**Purpose:** Comprehensive extraction for README authoring and judge evaluation

---

## JSON INSPECTION DATA

```json
{
  "project_summary": {
    "text": "WanderAgent is an Agentic AI-Powered Tourism App that provides AI-generated personalized multi-stop travel plans using LangChain and Gemini, featuring live navigation with real-time location tracking, auto-arrival detection, dynamic itinerary adjustment, interactive maps, and integration with Foursquare for enriched place data. The app supports both server-backed and offline-first (local-only) modes, with mobile APK builds via Capacitor.",
    "source": [{"path": "README.md", "lines": "1-23"}]
  },
  "architecture": {
    "components": [
      {"name": "Frontend (React/Vite/TypeScript)", "path": "client/src/", "description": "Client-side SPA with React 18, TypeScript, Tailwind CSS, Shadcn UI components, Leaflet maps", "entry_point": "client/src/pages/home.tsx"},
      {"name": "Backend (Node.js/Express)", "path": "server/", "description": "Express API server with agent orchestration, session management, CORS support", "entry_point": "server/index.ts"},
      {"name": "TravelPlanningAgent (LangChain-style orchestrator)", "path": "server/services/langchain-agent.ts", "description": "Main AI agent that orchestrates place discovery, itinerary generation, route optimization, and adjustments"},
      {"name": "Foursquare Service", "path": "server/services/foursquare.ts", "description": "Wrapper for Foursquare Places API with search, details, tips, and interest-based filtering"},
      {"name": "Gemini Service", "path": "server/services/gemini.ts", "description": "Google Gemini AI integration for itinerary generation, multi-day planning, and optimization"},
      {"name": "OSRM Service", "path": "server/services/osrm.ts", "description": "Open Source Routing Machine integration for route calculation and turn-by-turn directions"},
      {"name": "Storage Layer", "path": "server/storage.ts", "description": "In-memory session storage (no persistent DB in current implementation)"},
      {"name": "Mobile Wrapper (Capacitor)", "path": "android/", "description": "Android APK build configuration and native bridge for geolocation and HTTP"},
      {"name": "Local API Fallback", "path": "client/src/lib/localApi.ts", "description": "Client-side direct API calls to Foursquare and Gemini for offline/APK mode"}
    ],
    "comms": [
      {"method": "REST API (/api/*)", "description": "Express routes handle preferences, itinerary generation, route optimization, place enrichment", "citation": "server/routes.ts:14-751, server/index.ts:13-26 (CORS middleware)"},
      {"method": "Session ID header", "description": "Custom 'session-id' header for stateless session tracking across requests", "citation": "server/routes.ts:16-21, client/src/lib/offline.ts (routeApiCall attaches session-id)"},
      {"method": "Agent task execution", "description": "TravelPlanningAgent.executeTask() dispatches to internal methods (discoverPlaces, generateItinerary, optimizeRoute, adjustItinerary)", "citation": "server/services/langchain-agent.ts:28-54"},
      {"method": "Capacitor HTTP plugin", "description": "Mobile builds use @capacitor-community/http to bypass CORS for direct API calls", "citation": "client/src/lib/localApi.ts:71-129"}
    ],
    "docker": {
      "compose_file": "NOT FOUND",
      "dockerfile": "NOT FOUND",
      "deployment_commands": "npm run build && npm start (production), npm run dev (development)",
      "env_vars_required": ["FOURSQUARE_API_KEY", "GEMINI_API_KEY", "FOURSQUARE_API_VERSION", "DATABASE_URL (optional, not used)", "VITE_LOCAL_ONLY (optional)", "VITE_API_BASE_URL (optional)"]
    },
    "client_server_split": {
      "server_side": ["Agent orchestration (TravelPlanningAgent)", "Foursquare search/discovery", "Gemini itinerary generation", "OSRM route optimization", "Session storage", "Place details enrichment and tips summarization"],
      "client_side": ["UI rendering (React components)", "Map visualization (Leaflet)", "Live geolocation tracking (HTML5 Geolocation API + Capacitor Geolocation)", "Local storage for offline preferences", "Direct API fallback to Foursquare/Gemini in local-only mode (APK builds)"],
      "citation": "README.md:55-91, server/index.ts:1-90, client/src/lib/localApi.ts:8-325"
    }
  },
  "agents": [{
    "name": "TravelPlanningAgent",
    "path": "server/services/langchain-agent.ts",
    "class_or_fn": "class TravelPlanningAgent",
    "langchain_tools": [
      {"name": "foursquareService.searchByInterests", "path": "server/services/foursquare.ts", "def_lines": "186-228", "description": "Searches Foursquare for places matching user interests and location with category mapping"},
      {"name": "generateItinerary (Gemini)", "path": "server/services/gemini.ts", "def_lines": "59-175", "description": "Calls Gemini AI to generate single-day optimized itinerary from available places"},
      {"name": "generateMultiDayItinerary (Gemini)", "path": "server/services/gemini.ts", "def_lines": "178-281", "description": "Calls Gemini AI for multi-day trip planning with meals and themes per day"},
      {"name": "osrmService.optimizeRoute", "path": "server/services/osrm.ts", "def_lines": "129-179", "description": "Uses OSRM Trip API to optimize waypoint order and calculate route segments"},
      {"name": "osrmService.getRoute", "path": "server/services/osrm.ts", "def_lines": "98-127", "description": "Gets polyline geometry and turn-by-turn steps from OSRM Route API"},
      {"name": "optimizeItinerary (Gemini)", "path": "server/services/gemini.ts", "def_lines": "283-364", "description": "Adjusts existing itinerary based on user feedback via Gemini"},
      {"name": "foursquareService.getPlaceTips", "path": "server/services/foursquare.ts", "def_lines": "175-184", "description": "Retrieves user tips for a specific Foursquare place"},
      {"name": "summarizeTips (Gemini)", "path": "server/services/gemini.ts", "def_lines": "392-409", "description": "Uses Gemini to summarize Foursquare tips into concise highlight (280 chars)"}
    ],
    "prompt_templates": [
      {"path": "server/services/gemini.ts", "lines": "78-115", "template": "System prompt for single-day itinerary generation with user preferences (interests, duration, budget, dietary restrictions, transportation, location) and available places. Instructs Gemini to return JSON with places[], totalDuration, recommendations[]."},
      {"path": "server/services/gemini.ts", "lines": "209-248", "template": "System prompt for multi-day itinerary with rules for famous landmarks, meals (lunch/dinner), themes, and sequential scheduling. Returns JSON with days[], recommendations[], summary."},
      {"path": "server/services/gemini.ts", "lines": "298-305", "template": "Prompt for itinerary optimization based on user feedback, preserving structure."},
      {"path": "server/services/gemini.ts", "lines": "398", "template": "Ultra-concise tip summarization prompt (280 chars max, no markdown, traveler-focused)."}
    ],
    "model_provider": {
      "path": "server/services/gemini.ts",
      "lines": "61-72, 180-189, 285-296",
      "provider": "Google Gemini (gemini-2.0-flash-exp)",
      "env_vars": ["GEMINI_API_KEY"]
    },
    "custom_tools": [
      {"name": "discoverPlaces", "signature": "async discoverPlaces(): Promise<AgentResponse>", "path": "server/services/langchain-agent.ts:56-84", "description": "Discovers places via Foursquare based on user interests, filters by budget/diet, returns AgentResponse with places array"},
      {"name": "generateItinerary", "signature": "async generateItinerary(): Promise<AgentResponse>", "path": "server/services/langchain-agent.ts:86-148", "description": "Generates AI itinerary from discovered places, maps to ItineraryPlace format with scheduling and reasons"},
      {"name": "optimizeRoute", "signature": "async optimizeRoute(): Promise<AgentResponse>", "path": "server/services/langchain-agent.ts:150-207", "description": "Optimizes travel route using OSRM, adds travel times and distances to itinerary"},
      {"name": "adjustItinerary", "signature": "async adjustItinerary(feedback?: string): Promise<AgentResponse>", "path": "server/services/langchain-agent.ts:209-235", "description": "Adjusts itinerary based on user feedback via Gemini optimization"}
    ]
  }],
  "integrations": [
    {"name": "Foursquare Places API", "path": "server/services/foursquare.ts", "wrapper_functions": ["searchPlaces (lines 123-158)", "getPlaceDetails (lines 160-173)", "getPlaceTips (lines 175-184)", "searchByInterests (lines 186-228)"], "example_request": "GET https://places-api.foursquare.com/places/search?ll=28.6139,77.2090&radius=10000&fsq_category_ids=4bf58dd8d48988d12d941735&limit=50&sort=rating", "env_vars": ["FOURSQUARE_API_KEY", "FOURSQUARE_API_VERSION"], "notes": "Real integration with retry logic for 429 rate limits (lines 72-90). Uses Bearer token auth. Hard-coded fallback key present (line 60, should be <REDACTED: FOURSQUARE_API_KEY>)."},
    {"name": "Google Gemini AI", "path": "server/services/gemini.ts", "wrapper_functions": ["generateItinerary (lines 59-175)", "generateMultiDayItinerary (lines 178-281)", "optimizeItinerary (lines 283-364)", "summarizeTips (lines 392-409)"], "example_request": "POST to Gemini API via @google/genai SDK with streaming. Model: gemini-2.0-flash-exp, temperature: 0.6", "env_vars": ["GEMINI_API_KEY"], "notes": "Real integration using @google/genai SDK. Streaming responses parsed to extract JSON from markdown code blocks."},
    {"name": "OSRM (Open Source Routing Machine)", "path": "server/services/osrm.ts", "wrapper_functions": ["getRoute (lines 98-127)", "optimizeRoute (lines 129-179)", "calculateTravelTime (lines 181-201)"], "example_request": "GET https://router.project-osrm.org/route/v1/foot/77.2090,28.6139;77.2250,28.6280?overview=full&geometries=polyline&steps=true", "env_vars": [], "notes": "Uses public OSRM demo server (https://router.project-osrm.org). No API key required. Polyline decoding with @mapbox/polyline. Supports driving, bicycle, foot profiles."},
    {"name": "Flight Booking (Simulated)", "path": "client/src/lib/localApi.ts", "wrapper_functions": ["getFlightOptionsLocal (lines 302-325)"], "example_request": "N/A (local deterministic generator)", "env_vars": [], "notes": "SIMULATED. Generates 5 deterministic demo flights using seeded random based on input (startAirport, destinationCity, startDate). No real flight API integration."}
  ],
  "frontend_mobile": {
    "stack": "React 18 (TypeScript), Vite 5, Tailwind CSS, Shadcn UI, Leaflet (maps), Capacitor 6 (mobile wrapper), Ionic Config",
    "entry_points": ["client/index.html", "client/src/main.tsx", "client/src/pages/home.tsx"],
    "apk_link_or_path": "NOT FOUND (no bit.ly link in docs). APK built locally to android/app/build/outputs/apk/debug/app-debug.apk",
    "build_commands": ["npm run apk (Windows PowerShell script: inject env, build client, sync Capacitor, assemble APK)", "npm run apk:server (server-backed APK with VITE_API_BASE_URL)", "npm run build:client:local (injects VITE_* env vars from .env and builds client)", "npm run build:client (standard Vite build)", "cd android && .\\gradlew.bat assembleDebug (Gradle APK build)"],
    "run_local": "npm run dev (Vite dev server on port 5000 with Express backend)",
    "auth": "No authentication required. Session-based tracking via session-id header (randomUUID per session)."
  },
  "run_instructions": {
    "dev": ["Install dependencies: npm install", "Create .env file from .env.example and fill in FOURSQUARE_API_KEY, GEMINI_API_KEY", "Start dev server: npm run dev", "Access app at http://localhost:5000", "Optional: Set VITE_LOCAL_ONLY=true to enable local-only mode", "Optional: Set VITE_STRICT_OFFLINE=true to force offline fallbacks"],
    "prod": ["Install dependencies: npm install", "Create .env file with production keys", "Build client and server: npm run build", "Start production server: npm start", "Access app at http://localhost:5000 (or PORT env var)"],
    "env_vars": [
      {"name": "FOURSQUARE_API_KEY", "purpose": "Foursquare Places API authentication (server-side)", "required": true, "example_value": "fsq_1234567890abcdefghijklmnopqrstuvwxyz"},
      {"name": "GEMINI_API_KEY", "purpose": "Google Gemini AI API key (server-side)", "required": true, "example_value": "AIzaSy1234567890abcdefghijklmnopqrstuvwxyz"},
      {"name": "FOURSQUARE_API_VERSION", "purpose": "Foursquare API version header (YYYY-MM-DD format)", "required": false, "example_value": "2025-06-17"},
      {"name": "VITE_FOURSQUARE_API_KEY", "purpose": "Foursquare API key for client-side local-only mode (APK builds)", "required": false, "example_value": "fsq_1234567890abcdefghijklmnopqrstuvwxyz"},
      {"name": "VITE_GEMINI_API_KEY", "purpose": "Gemini API key for client-side local-only mode (APK builds)", "required": false, "example_value": "AIzaSy1234567890abcdefghijklmnopqrstuvwxyz"},
      {"name": "VITE_LOCAL_ONLY", "purpose": "Enable local-only (offline-first) mode for client", "required": false, "example_value": "true"},
      {"name": "VITE_STRICT_OFFLINE", "purpose": "Force client to skip server and use only local APIs", "required": false, "example_value": "true"},
      {"name": "VITE_API_BASE_URL", "purpose": "Remote server URL for cross-origin web builds", "required": false, "example_value": "https://your-server.example.com"},
      {"name": "DATABASE_URL", "purpose": "PostgreSQL connection string (not used in current build)", "required": false, "example_value": "postgresql://user:password@localhost:5432/wanderagent"},
      {"name": "PORT", "purpose": "Server port (default 5000)", "required": false, "example_value": "5000"}
    ]
  },
  "demo_scenarios": [
    {"id": 1, "name": "Single-Day Delhi Discovery (Offline APK Mode)", "steps": ["Build APK: npm run apk (requires FOURSQUARE_API_KEY and GEMINI_API_KEY in .env)", "Install APK on Android device/emulator", "Launch WanderAgent app", "Click 'Start Exploring'", "Select interests: Art, Culture, History", "Select duration: Full day (8+ hours)", "Select budget: Moderate", "Select transportation: Walking", "Allow location access (or manually set: Delhi, 28.6139, 77.2090)", "Click 'Generate Itinerary'", "Observe AI agent status: Analyzing → Searching → Optimizing → Complete", "View generated itinerary with 6-10 places including lunch/dinner", "Check map visualization with route polyline", "Tap a place to see details, rating, address", "Start Live Navigation to first stop", "Simulate arrival (or use real GPS)"], "expected_output": "Itinerary with famous Delhi landmarks (Red Fort, India Gate, Qutub Minar, etc.), restaurants for lunch/dinner, optimized route with OSRM turn-by-turn directions, map showing current location and next destination. Total duration ~8 hours, distance calculated."},
    {"id": 2, "name": "Multi-Day Trip Planning (Server Mode)", "steps": ["Start server: npm run dev", "Access http://localhost:5000 in browser", "Click 'Start Exploring'", "Choose 'Plan a Trip' (flight booking flow)", "Enter: Start Airport: DEL, Destination: Goa, Start Date: 2025-07-01, End Date: 2025-07-03", "Click 'Search Flights'", "Select a flight option (simulated data)", "Set preferences: Interests: Nature, Beaches, Food; Budget: Premium; Dietary: Vegetarian", "Click 'Generate Itinerary'", "Observe multi-day plan with Day 1, Day 2, Day 3 carousel", "Each day shows places, lunch, dinner with scheduled times", "Expand a day to see route map and directions", "Click 'Optimize Day' to adjust timing", "Delete a stop and see AI re-plan"], "expected_output": "3-day itinerary for Goa with beach attractions, restaurants, temples. Each day has theme, 4-6 places, lunch ~1PM, dinner ~7PM. Route optimized per day. Total budget estimate shown. Tips and recommendations provided."},
    {"id": 3, "name": "Quick Actions & Dynamic Adjustment (Web Local-Only)", "steps": ["Set env: $env:VITE_LOCAL_ONLY='true'; $env:VITE_STRICT_OFFLINE='true'", "Start dev: npm run dev", "Access http://localhost:5000", "Generate a single-day itinerary for Mumbai (follow scenario 1 steps)", "Once itinerary loads, use Quick Actions popover", "Click 'Find Coffee' → see nearby coffee shops (Foursquare local API)", "Click 'Find ATM' → see nearby ATMs", "In itinerary, simulate running late (overstay at stop 2)", "Click 'Adjust Timings' → AI suggests delete or reschedule", "Delete a stop → observe itinerary re-optimize route", "Check that OSRM routing still works (or heuristic fallback if OSRM down)", "Verify all data comes from client-side APIs (no server calls)"], "expected_output": "Quick actions return 12 nearby results sorted by distance. Dynamic adjustment shows updated itinerary with corrected times. Route recalculates. Toasts show 'Local-only mode' confirmations. No server errors."}
  ],
  "tracing_logs": {
    "log_paths": ["server/index.ts:28-57 (request/response logging middleware)", "Console logs in server/services/*.ts (e.g., 'Discovering places...', 'Generating itinerary...')"],
    "example_trace_json": {
      "timestamp": "2025-01-15T10:30:00.000Z",
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "agent": "TravelPlanningAgent",
      "task": "discover_places",
      "status": "searching",
      "message": "Found 47 places matching your interests",
      "data": {
        "places_count": 47,
        "interests": ["art", "culture", "history"],
        "location": {"lat": 28.6139, "lng": 77.209},
        "radius": 20000
      }
    },
    "notes": "No structured logging framework in place. Logs are console.log statements. Recommended: Add Winston or Pino for structured JSON logs with trace IDs."
  },
  "tests_metrics": {
    "tests": [],
    "how_to_run": "NOT FOUND (no test scripts in package.json)",
    "metrics_instrumentation": ["Request duration logging (server/index.ts:29-54)", "Agent status tracking (AgentResponse status field: analyzing/searching/optimizing/complete/error)"],
    "recommended_hooks": [
      {"metric": "success_rate", "placement": "server/routes.ts after each endpoint response", "capture": "res.statusCode === 200 ? 'success' : 'failure'"},
      {"metric": "avg_latency_ms", "placement": "server/index.ts:29 (already tracking Date.now() - start)", "capture": "duration per endpoint in ms"},
      {"metric": "adaptation_count", "placement": "server/routes.ts:/api/adjust-itinerary endpoint", "capture": "Increment counter on each adjust_itinerary call"},
      {"metric": "simulated_booking_success_rate", "placement": "client/src/lib/localApi.ts:getFlightOptionsLocal", "capture": "Always 100% (simulated flights always succeed)"},
      {"metric": "foursquare_rate_limit_errors", "placement": "server/services/foursquare.ts:79-90", "capture": "Count 429 status errors"}
    ]
  },
  "security_privacy": {
    "pii_locations": ["In-memory session storage (server/storage.ts) - stores user preferences, location (lat/lng, address)", "Client localStorage (client/src/lib/offline.ts) - mirrors session preferences", "OSRM requests include user coordinates in URL query params"],
    "hardcoded_secrets": [{"file": "server/services/foursquare.ts", "line": 60, "secret": "<REDACTED: FOURSQUARE_API_KEY fallback>", "note": "Hard-coded Foursquare API key as fallback if env var missing"}],
    "recommendations": ["Remove hard-coded API key from foursquare.ts line 60, enforce env var requirement", "Add PII masking in logs (redact lat/lng beyond 2 decimals, mask addresses)", "Implement opt-in telemetry toggle in UI", "Store user preferences in encrypted local storage only, avoid server-side persistence without consent", "Add privacy policy and terms of service links in UI", "Implement session expiration (currently sessions never expire in memory store)", "Consider rate limiting per session to prevent abuse", "Sanitize user inputs before passing to LLM to prevent prompt injection"]
  },
  "dependencies": {
    "python_requirements": "NOT FOUND (no Python dependencies)",
    "node_packages": "package.json (lines 21-125) - Key deps: express@4.21.2, react@18.3.1, vite@5.4.19, @google/genai@1.12.0, @tanstack/react-query@5.60.5, leaflet@1.9.4, @capacitor/core@6.1.2, drizzle-orm@0.39.1, zod@3.24.2, lucide-react@0.453.0, tailwindcss@3.4.17, typescript@5.6.3",
    "other": ["Capacitor Android: @capacitor/android@6.2.1", "Capacitor HTTP: @capacitor-community/http@1.4.1", "Mapbox Polyline: @mapbox/polyline@1.2.1"],
    "license": "MIT (package.json line 5)"
  },
  "artifacts_bmc": {
    "apk_link": "NOT FOUND (no public APK link in repository)",
    "bmc_path": "NOT FOUND (no Business Model Canvas PDF found)",
    "bmc_summary": "NOT FOUND"
  },
  "future_features_patch_plan": [
    {"feature": "Sustainability Scorer (CO2 tracking per itinerary)", "effort": "MED", "files_to_change": [{"path": "server/services/langchain-agent.ts", "change": "Add calculateCO2() method using heuristic: distance (km) × mode factor (foot:0, bicycle:0, driving:0.12 kg/km). Call in optimizeRoute() and inject co2 field into each leg."}, {"path": "shared/schema.ts", "change": "Add co2Kg?: number to ItineraryPlace interface (line 75)"}, {"path": "client/src/components/itinerary-display.tsx", "change": "Display CO2 badge per place (use Leaf icon from lucide-react). Show total CO2 in summary."}, {"path": "server/services/gemini.ts", "change": "Add CO2 awareness to prompt templates: 'Prefer low-carbon transport modes and clustered locations to minimize CO2.'"}], "tests_to_add": ["Test calculateCO2() with mock itinerary (expected: driving 10km = 1.2kg, walking 10km = 0kg)"]},
    {"feature": "Expense Tracker (receipt aggregation per trip)", "effort": "MED", "files_to_change": [{"path": "shared/schema.ts", "change": "Add expenses table: pgTable('expenses', { id, sessionId, placeId, amount, currency, category, receiptUrl, timestamp }). Add expenses?: Expense[] to Itinerary interface."}, {"path": "server/routes.ts", "change": "Add POST /api/expenses endpoint to record expense. Add GET /api/expenses/:sessionId to fetch all expenses for session."}, {"path": "client/src/components/itinerary-display.tsx", "change": "Add 'Log Expense' button per place. Show total expenses and budget remaining in summary card."}, {"path": "server/storage.ts", "change": "Add createExpense(), getExpenses() methods."}], "tests_to_add": ["Test POST /api/expenses creates expense record", "Test GET /api/expenses returns correct total per session"]},
    {"feature": "Photo Library Maker (auto-organize photos per stop with metadata)", "effort": "HIGH", "files_to_change": [{"path": "client/src/components/live-navigation.tsx", "change": "Add Camera button (Capacitor Camera API). On capture, tag photo with placeId, timestamp, GPS coords. Store in Capacitor Filesystem."}, {"path": "shared/schema.ts", "change": "Add photos table: pgTable('photos', { id, sessionId, placeId, filePath, latitude, longitude, timestamp, caption }). Add photos?: Photo[] to ItineraryPlace."}, {"path": "server/routes.ts", "change": "Add POST /api/photos/upload (multipart/form-data), GET /api/photos/:sessionId/:placeId. Store photos in ./uploads/ or cloud storage (S3)."}, {"path": "client/src/components/photo-gallery.tsx", "change": "Create new component to display photos per place in masonry grid. Add 'View Photos' button in itinerary-display."}, {"path": "package.json", "change": "Add @capacitor/camera, @capacitor/filesystem dependencies."}], "tests_to_add": ["Test photo upload endpoint accepts JPEG/PNG", "Test photos tagged with correct placeId and GPS coords", "Test photo gallery renders photos in chronological order"]}
  ],
  "questions_for_devs": ["1. Do you have a production/paid Gemini API key, or should all builds use free tier with rate limits?", "2. Is the hard-coded Foursquare API key (line 60 in foursquare.ts) a valid key for production, or a placeholder?", "3. Is the database (DATABASE_URL in drizzle.config.ts) intended to be used? The current code uses in-memory storage only.", "4. Do you have a deployed server URL for the APK to connect to (VITE_API_BASE_URL), or should all APKs be offline-first?", "5. Are there any existing APK builds or public download links (bit.ly or other) that should be documented?", "6. Is there a Business Model Canvas (BMC) PDF or slide deck that should be included in the repository?", "7. Do you want unit/integration tests added? If so, which framework (Jest, Vitest, Playwright)?", "8. Should trace logs be persisted to a file or database, or is console logging sufficient?", "9. Are there specific compliance requirements (GDPR, CCPA) for handling user location data?", "10. Do you want analytics/telemetry (e.g., Google Analytics, Mixpanel) integrated into the app?"],
  "confidence": 85,
  "assumptions": ["Assumed DATABASE_URL is optional since storage.ts uses in-memory Map, not actual DB queries", "Assumed flight booking is fully simulated based on getFlightOptionsLocal implementation", "Assumed no existing test infrastructure since no test files or scripts found", "Assumed APK builds are for Android only (no iOS config found)", "Assumed OSRM public server is acceptable for production (no custom OSRM instance configured)", "Inferred system requirements from package.json: Node.js 20+, npm 9+, Gradle 8+ (for APK builds)", "Assumed all LLM calls use Gemini (no OpenAI or other providers found)", "Assumed session-id header is sufficient for stateless tracking (no user accounts/authentication)"]
}
```

---

*Continued in following comment...*
# WanderAgent Code Inspection - Additional Materials

## CODE SNIPPETS

### 1. TravelPlanningAgent - Main Orchestrator Class
**File: server/services/langchain-agent.ts (lines 21-54)**
```typescript
export class TravelPlanningAgent {
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  async executeTask(task: string): Promise<AgentResponse> {
    try {
      switch (task) {
        case 'discover_places':
          return await this.discoverPlaces();
        case 'generate_itinerary':
          return await this.generateItinerary();
        case 'optimize_route':
          return await this.optimizeRoute();
        case 'adjust_itinerary':
          return await this.adjustItinerary();
        default:
          return {
            success: false,
            message: `Unknown task: ${task}`,
            status: 'error'
          };
      }
    } catch (error) {
      console.error(`Error executing task ${task}:`, error);
      return {
        success: false,
        message: `Failed to execute ${task}: ${error}`,
        status: 'error'
      };
    }
  }
}
```

### 2. Gemini Prompt Template - Single-Day Itinerary
**File: server/services/gemini.ts (lines 78-115)**
```typescript
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
```

### 3. Foursquare Interest-Based Search
**File: server/services/foursquare.ts (lines 186-228)**
```typescript
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
    '4bf58dd8d48988d165941735', // Scenic Lookout / Viewpoint
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
```

### 4. OSRM Route Optimization with Turn-by-Turn
**File: server/services/osrm.ts (lines 98-127)**
```typescript
async getRoute(coordinates: Array<[number, number]>, profile: string = "foot"): Promise<OSRMResponse> {
  try {
    const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordString}?overview=full&geometries=polyline&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    const result: OSRMResponse = await response.json();
    // Decode polyline geometry to array of lat/lng
    if (result.routes && result.routes[0]?.geometry) {
      const decoded = polyline.decode(result.routes[0].geometry)
        .map((point: [number, number]) => ({ lat: point[0], lng: point[1] }));
      result.decodedGeometry = decoded;
    }
    // Build human-readable instructions per leg if steps are present
    const legs = result.routes?.[0]?.legs;
    if (Array.isArray(legs)) {
      result.instructionsByLeg = legs.map((leg) =>
        (leg.steps || []).map((s: any) => stepToText(s as OSRMStep))
      );
    } else {
      result.instructionsByLeg = [];
    }
    return result;
  } catch (error) {
    console.error('Error getting route:', error);
    throw new Error(`Failed to get route: ${error}`);
  }
}
```

### 5. Local-Only Mode - Client-Side Foursquare Call
**File: client/src/lib/localApi.ts (lines 162-207)**
```typescript
export async function searchFoursquarePlacesLocal(opts: { 
  city?: string; 
  ll?: string; 
  query?: string; 
  categories?: string; 
  limit?: number; 
  radius?: number; 
  sort?: 'relevance'|'rating'|'distance' 
}) {
  console.log('[Mobile Debug] searchFoursquarePlacesLocal called with:', opts);
  
  const parts: string[] = [];
  if (opts.ll) {
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
  
  const results = Array.isArray(data?.results) ? data.results : [];
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
  
  return mappedResults;
}
```

### 6. Express Route - Generate Itinerary Endpoint
**File: server/routes.ts (lines 86-135)**
```typescript
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
      // ... rest of multi-day handling
    }
  } catch (error: any) {
    console.error('generate-itinerary error', error);
    res.status(500).json({ error: error.message || 'Failed to generate itinerary' });
  }
});
```

---

## SAMPLE AGENT TRACE LOG

**Scenario:** User generates single-day itinerary for Delhi with interests: Art, Culture, History

```json
{
  "trace_id": "trace_20250115_103045_a1b2c3d4",
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_preferences": {
    "interests": ["art", "culture", "history"],
    "duration": "full day (8+ hours)",
    "budget": "moderate",
    "dietary_restrictions": ["vegetarian"],
    "transportation": "walking",
    "location": {
      "lat": 28.6139,
      "lng": 77.209,
      "address": "New Delhi, India"
    }
  },
  "agent_execution": [
    {
      "timestamp": "2025-01-15T10:30:45.123Z",
      "task": "discover_places",
      "agent": "TravelPlanningAgent",
      "status": "analyzing",
      "message": "Discovering places based on user interests...",
      "details": {
        "search_radius_meters": 20000,
        "category_ids": "4deefb944765f83613cdba6e,4bf58dd8d48988d181941735,4bf58dd8d48988d12d941735",
        "must_see_categories": ["Landmark & Historical Place", "Art Museum", "Museum"]
      }
    },
    {
      "timestamp": "2025-01-15T10:30:47.456Z",
      "task": "discover_places",
      "agent": "TravelPlanningAgent",
      "status": "searching",
      "message": "Found 47 places matching your interests",
      "details": {
        "total_places_found": 47,
        "foursquare_api_calls": 1,
        "top_places": [
          "Red Fort (Lal Qila)",
          "India Gate",
          "Qutub Minar",
          "Humayun's Tomb",
          "National Museum"
        ]
      }
    },
    {
      "timestamp": "2025-01-15T10:30:47.789Z",
      "task": "generate_itinerary",
      "agent": "TravelPlanningAgent",
      "status": "optimizing",
      "message": "Generating optimized itinerary with AI...",
      "details": {
        "gemini_model": "gemini-2.0-flash-exp",
        "available_places_count": 47,
        "recommended_stops": "6-10",
        "prompt_tokens_approx": 1500
      }
    },
    {
      "timestamp": "2025-01-15T10:30:52.345Z",
      "task": "generate_itinerary",
      "agent": "GeminiService",
      "status": "complete",
      "message": "AI itinerary generated successfully",
      "details": {
        "gemini_response_time_ms": 4556,
        "places_selected": 8,
        "includes_meals": true,
        "total_duration_minutes": 480,
        "itinerary_summary": [
          {
            "order": 1,
            "name": "Red Fort (Lal Qila)",
            "category": "Landmark & Historical Place",
            "scheduled_time": "9:00 AM",
            "estimated_duration": 90,
            "reason": "Iconic Mughal fort, UNESCO World Heritage Site, matches history interest"
          },
          {
            "order": 2,
            "name": "Jama Masjid",
            "category": "Mosque",
            "scheduled_time": "11:00 AM",
            "estimated_duration": 45,
            "reason": "Largest mosque in India, near Red Fort, cultural significance"
          },
          {
            "order": 3,
            "name": "Karim's Restaurant",
            "category": "Restaurant",
            "scheduled_time": "12:30 PM",
            "estimated_duration": 60,
            "reason": "Lunch stop - historic Mughlai cuisine with vegetarian options"
          },
          {
            "order": 4,
            "name": "India Gate",
            "category": "Monument",
            "scheduled_time": "2:00 PM",
            "estimated_duration": 45,
            "reason": "War memorial, iconic Delhi landmark"
          },
          {
            "order": 5,
            "name": "National Museum",
            "category": "Museum",
            "scheduled_time": "3:15 PM",
            "estimated_duration": 120,
            "reason": "Extensive art and artifact collection, matches art and history interests"
          },
          {
            "order": 6,
            "name": "Humayun's Tomb",
            "category": "Landmark & Historical Place",
            "scheduled_time": "5:30 PM",
            "estimated_duration": 60,
            "reason": "UNESCO site, Mughal architecture, golden hour photography"
          },
          {
            "order": 7,
            "name": "Lodhi Garden",
            "category": "Park",
            "scheduled_time": "6:45 PM",
            "estimated_duration": 30,
            "reason": "Peaceful walk before dinner, historical tombs"
          },
          {
            "order": 8,
            "name": "Saravana Bhavan",
            "category": "Restaurant",
            "scheduled_time": "7:30 PM",
            "estimated_duration": 60,
            "reason": "Dinner stop - South Indian vegetarian restaurant, highly rated"
          }
        ]
      }
    },
    {
      "timestamp": "2025-01-15T10:30:52.678Z",
      "task": "optimize_route",
      "agent": "TravelPlanningAgent",
      "status": "optimizing",
      "message": "Optimizing route with OSRM...",
      "details": {
        "osrm_profile": "foot",
        "waypoints_count": 9,
        "coordinates": [
          [77.209, 28.6139],
          [77.241, 28.6562],
          [77.2334, 28.6507],
          [77.2326, 28.6488],
          [77.2295, 28.6127],
          [77.2273, 28.5933],
          [77.2363, 28.5932],
          [77.2196, 28.5935],
          [77.2009, 28.5244]
        ]
      }
    },
    {
      "timestamp": "2025-01-15T10:30:55.234Z",
      "task": "optimize_route",
      "agent": "OSRMService",
      "status": "complete",
      "message": "Route optimized successfully",
      "details": {
        "osrm_response_time_ms": 2556,
        "total_distance_km": 22.4,
        "total_duration_minutes": 67,
        "route_segments": 8,
        "polyline_decoded": true,
        "turn_by_turn_instructions": true,
        "optimized_order": [0, 1, 2, 3, 4, 5, 6, 7, 8],
        "sample_instructions": [
          "Head northeast on Netaji Subhash Marg for 1.2 km",
          "Turn right onto Chandni Chowk for 450 m",
          "Continue on Jama Masjid Road for 200 m",
          "Arrive at destination on Meena Bazaar Road"
        ]
      }
    },
    {
      "timestamp": "2025-01-15T10:30:55.567Z",
      "task": "store_itinerary",
      "agent": "StorageService",
      "status": "complete",
      "message": "Itinerary stored successfully",
      "details": {
        "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "itinerary_id": "itin_20250115_103055",
        "places_count": 8,
        "storage_type": "in-memory"
      }
    }
  ],
  "final_result": {
    "success": true,
    "total_execution_time_ms": 10444,
    "itinerary_summary": {
      "places_count": 8,
      "total_duration_minutes": 480,
      "total_distance_km": 22.4,
      "estimated_walking_time_minutes": 67,
      "meals_included": 2,
      "famous_landmarks": 4,
      "museums": 1,
      "budget_estimate": "₹2000-3000 (~$25-40 USD)"
    },
    "recommendations": [
      "Start early (9 AM) to cover all attractions before sunset",
      "Carry water and wear comfortable walking shoes",
      "Red Fort and Humayun's Tomb require entry fees (₹35-40 each for Indian nationals)",
      "National Museum closes at 6 PM - adjust timing if needed",
      "Use metro (Yellow Line) for faster travel between distant stops if running late"
    ]
  }
}
```

---

## DEMO SCENARIO EXECUTION TRACE

**Scenario 1 Replay: Single-Day Delhi Discovery (Server Mode)**

```
[10:30:00] User clicks "Start Exploring"
[10:30:02] Location detected: 28.6139, 77.2090 (New Delhi)
[10:30:05] Preferences submitted:
  - Interests: Art, Culture, History
  - Duration: Full day (8+ hours)
  - Budget: Moderate
  - Dietary: Vegetarian
  - Transportation: Walking
[10:30:06] POST /api/preferences → 200 OK (session-id: a1b2c3d4)
[10:30:07] POST /api/generate-itinerary → Processing...
[10:30:08] Agent: TravelPlanningAgent initialized
[10:30:09] Task: discover_places started
[10:30:09] Foursquare API: Searching places (radius: 20km, categories: landmarks+museums)
[10:30:11] Foursquare API: 47 places found
[10:30:11] Agent: Filtering by budget (moderate = price level ≤2)
[10:30:12] Task: discover_places completed (43 places after filter)
[10:30:12] Task: generate_itinerary started
[10:30:13] Gemini API: Sending prompt with 43 places, user preferences
[10:30:17] Gemini API: Response received (4.5s)
[10:30:17] Gemini: Parsed 8 places from JSON response
[10:30:17] Task: generate_itinerary completed
[10:30:18] Task: optimize_route started
[10:30:18] OSRM API: Trip optimization for 9 waypoints (foot profile)
[10:30:20] OSRM API: Route calculated (22.4 km, 67 min walk time)
[10:30:21] OSRM: Decoded polyline (342 coordinate points)
[10:30:21] OSRM: Generated 47 turn-by-turn instructions
[10:30:21] Task: optimize_route completed
[10:30:22] POST /api/generate-itinerary → 200 OK
[10:30:22] UI: Rendering itinerary with 8 places
[10:30:23] UI: Map displaying route polyline and markers
[10:30:25] User clicks place card → Details modal opens
[10:30:28] User clicks "Start Live Navigation"
[10:30:29] Geolocation: Tracking enabled
[10:30:30] Navigation: Directions to Red Fort displayed
[10:30:32] Navigation: Turn-by-turn instruction: "Head northeast on Netaji Subhash Marg for 1.2 km"
```

**Expected Output:**
- Itinerary card shows 8 places: Red Fort → Jama Masjid → Karim's (lunch) → India Gate → National Museum → Humayun's Tomb → Lodhi Garden → Saravana Bhavan (dinner)
- Total time: 8 hours, Total distance: 22.4 km, Walking time: 67 min
- Map shows blue route polyline connecting all stops, current location marker (blue dot), red markers for each place
- Progress bar: 0/8 completed
- Budget estimate: ₹2000-3000
- Recommendations: 5 tips displayed in expandable section

---

## ENVIRONMENT VARIABLE EXAMPLES

```bash
# .env file for local development (server mode)
FOURSQUARE_API_KEY=fsq_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr
GEMINI_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
FOURSQUARE_API_VERSION=2025-06-17
PORT=5000

# For APK builds (injected as VITE_* at build time)
VITE_FOURSQUARE_API_KEY=fsq_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr
VITE_GEMINI_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
VITE_FOURSQUARE_API_VERSION=2025-06-17
VITE_LOCAL_ONLY=true

# For cross-origin web builds
VITE_API_BASE_URL=https://wanderagent-api.example.com

# For strict offline testing
VITE_STRICT_OFFLINE=true

# Database (optional, not used in current build)
DATABASE_URL=postgresql://user:password@localhost:5432/wanderagent
```

---

## BUILD COMMANDS REFERENCE

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run dev                    # Starts Vite dev server + Express backend on port 5000

# Production build
npm run build                  # Builds client (Vite) + server (esbuild) to dist/
npm start                      # Runs production server from dist/

# APK build (offline-first mode)
npm run apk                    # Windows PowerShell script:
                               # 1. Injects VITE_* env vars from .env
                               # 2. Builds client with Vite
                               # 3. Syncs to android/ via Capacitor
                               # 4. Runs gradlew assembleDebug
                               # Output: android/app/build/outputs/apk/debug/app-debug.apk

# APK build (server-backed mode)
npm run apk:server             # Same as above but with VITE_LOCAL_ONLY=false

# Open Android Studio
npm run apk:open               # Opens android/ in Android Studio IDE

# Clean Android build artifacts
npm run clear                  # Deletes android/app/build, android/build, android/.gradle

# Database (not used in current build)
npm run db:push                # Pushes Drizzle schema to PostgreSQL

# Type checking
npm run check                  # Runs TypeScript compiler in check mode (no emit)
```

---

## SECRETS REDACTION SUMMARY

**Found hardcoded secrets:**

1. **File:** `server/services/foursquare.ts`  
   **Line:** 60  
   **Secret:** `const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY || "KTPYB5EGQST4HPZERYDABLDWGZXKLKXW3VI200RJUYCLOWJ0";`  
   **Redacted:** `<REDACTED: FOURSQUARE_API_KEY - fallback key in foursquare.ts:60>`  
   **Recommendation:** Remove fallback key, enforce env var requirement with assertEnv() pattern.

**No other hardcoded secrets found in codebase.**

All API keys should be provided via environment variables (.env file, never committed to git).

---

## ARCHITECTURE DIAGRAM (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                         WanderAgent Architecture                 │
└─────────────────────────────────────────────────────────────────┘

CLIENT SIDE (Browser/APK)
┌────────────────────────────────────────────────────────────────┐
│  React SPA (TypeScript, Vite, Tailwind)                        │
│  ┌──────────────┬────────────────┬──────────────────────────┐  │
│  │ home.tsx     │ itinerary-     │ live-navigation.tsx      │  │
│  │ (main UI)    │ display.tsx    │ (GPS tracking)           │  │
│  └──────────────┴────────────────┴──────────────────────────┘  │
│  ┌──────────────┬────────────────┬──────────────────────────┐  │
│  │ MapView      │ preferences-   │ trip-planner-form.tsx    │  │
│  │ (Leaflet)    │ form.tsx       │ (flight search)          │  │
│  └──────────────┴────────────────┴──────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  lib/offline.ts (routeApiCall - server-first failover)  │  │
│  │  lib/localApi.ts (direct Foursquare/Gemini calls)       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────────────┘
                  │
                  │ REST API (/api/*)
                  │ session-id header
                  │
SERVER SIDE (Node.js)                        EXTERNAL APIS
┌─────────────────▼──────────────────────────────────────────────┐
│  Express Server (server/index.ts)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CORS Middleware (origin, credentials, session-id)       │  │
│  │  Request Logging Middleware (duration, status)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │    ┌──────────────────┐
│  │  Routes (server/routes.ts)                               │◄─┼────┤ Foursquare API   │
│  │  - POST /api/preferences                                 │  │    │ places.foursquare│
│  │  - POST /api/generate-itinerary                          │  │    │ .com/places      │
│  │  - POST /api/adjust-itinerary                            │  │    └──────────────────┘
│  │  - POST /api/optimize-route                              │  │
│  │  - GET  /api/places/:id/tips-summary                     │  │    ┌──────────────────┐
│  │  - GET  /api/quick/:type (coffee/atm/restroom)           │  │    │ Google Gemini AI │
│  └──────────────────────────────────────────────────────────┘  │    │ gemini-2.0-flash │
│  ┌──────────────────────────────────────────────────────────┐  │    │ -exp             │
│  │  TravelPlanningAgent (services/langchain-agent.ts)       │◄─┼────┤ @google/genai    │
│  │  - discoverPlaces()                                      │  │    │ SDK              │
│  │  - generateItinerary()                                   │  │    └──────────────────┘
│  │  - optimizeRoute()                                       │  │
│  │  - adjustItinerary()                                     │  │    ┌──────────────────┐
│  └──────────────────────────────────────────────────────────┘  │    │ OSRM Public API  │
│  ┌────────────┬────────────────┬──────────────────────────┐  │    │ router.project   │
│  │ foursquare │ gemini.ts      │ osrm.ts                  │◄─┼────┤ -osrm.org        │
│  │ .ts        │ (itinerary gen)│ (route optimization)     │  │    │ (no auth)        │
│  └────────────┴────────────────┴──────────────────────────┘  │    └──────────────────┘
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Storage (server/storage.ts)                             │  │
│  │  - In-memory Map (session → preferences, itinerary)      │  │
│  │  - No DB persistence in current build                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

MOBILE WRAPPER (APK only)
┌─────────────────────────────────────────────────────────────────┐
│  Capacitor 6 (android/)                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  @capacitor/geolocation (native GPS access)              │  │
│  │  @capacitor-community/http (bypass CORS for local APIs)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

DATA FLOW:
1. User submits preferences → POST /api/preferences (stored in-memory)
2. User clicks "Generate Itinerary" → POST /api/generate-itinerary
3. TravelPlanningAgent.executeTask('discover_places')
   → foursquareService.searchByInterests()
   → Foursquare API returns 50 places
4. TravelPlanningAgent.executeTask('generate_itinerary')
   → generateItinerary() calls Gemini with places + preferences
   → Gemini returns JSON with optimized itinerary
5. TravelPlanningAgent.executeTask('optimize_route')
   → osrmService.optimizeRoute() calls OSRM Trip API
   → OSRM returns polyline + turn-by-turn steps
6. Itinerary returned to client with places, route, instructions
7. Client renders map (Leaflet) + itinerary cards
8. User starts live navigation → Geolocation API tracks position
9. User adjusts itinerary → POST /api/adjust-itinerary
   → optimizeItinerary() calls Gemini for re-planning

LOCAL-ONLY MODE (APK):
- Client uses lib/localApi.ts to call Foursquare/Gemini directly
- No server calls (VITE_STRICT_OFFLINE=true)
- Session stored in localStorage
- OSRM still called (public API) or heuristic fallback
```

---

END OF ADDITIONAL MATERIALS
