# WanderAgent: Agentic AI-Powered Tourism App

## Tech Stack

- **Frontend:** React (TypeScript), Vite, Tailwind CSS
- **UI Components:** Custom + Shadcn UI
- **Mapping & Navigation:** Custom MapView, OSRM (Open Source Routing Machine) integration
- **Backend:** Node.js (Express), LangChain, Gemini, Foursquare API, OSRM API
- **State Management:** React Hooks
- **Geolocation:** HTML5 Geolocation API
- **Notifications:** Toast system
- **Data Layer:** Custom types, schema, and query client

## Features

- **AI-Generated Itinerary:** Personalized multi-stop travel plans using agentic AI (LangChain + Gemini)
- **Live Navigation:** Real-time location tracking, auto-arrival detection, and step-by-step directions
- **Dynamic Itinerary Adjustment:** Delete stops, adjust timings, and receive smart suggestions if running late
- **Progress Tracking:** Visual progress bar and completion celebration
- **Map Visualization:** Interactive map with current location, route geometry, and next destination
- **Mobile-Friendly UI:** Responsive design and mobile detection
- **Error Handling:** User-friendly toasts for location and navigation issues
- **Integration with Foursquare:** Enriched place data and categories

## Detailed Flowchart (PlantUML)

```plantuml
@startuml
start
:User opens WanderAgent;
:User sets preferences;
:AI Agent generates itinerary;
:Itinerary displayed (places, route);
:User starts live navigation;
repeat
  :Track live location;
  :Show directions to next place;
  if (User arrives at place?) then (yes)
    :Mark as arrived;
    :Start timer for stay duration;
    if (Overstay detected?) then (yes)
      :Suggest delete stop or adjust timings;
    endif
    :User leaves for next destination;
    :Update progress;
  else (no)
    :Continue navigation;
  endif
until (Itinerary complete)
:Show completion message;
stop
@enduml
```

## Modes, offline, and failover

Local-only is now a failover mode. The client attempts server/external APIs first and falls back to local logic only on genuine network failures.

- Server-first endpoints in local-only:
  - POST /api/generate-itinerary
  - POST /api/optimize-route
  - POST /api/optimize-day
  - POST /api/foursquare-places
  - POST /api/gemini-plan
  - POST /api/flight-options
  - POST /api/enrich/*
  - GET  /api/places/:id/tips-summary
  - GET  /api/quick/*
- Preferences, session, and itinerary CRUD are mirrored to local storage if the server is reachable; otherwise handled locally.
- A stable session-id header is attached to all server-first attempts so the server can associate state consistently.

Strict offline mode:
- Set VITE_STRICT_OFFLINE=true to force the client to skip server attempts and use on-device fallbacks only.
- Auto-enabled in native/Capacitor schemes for APK builds (can be overridden by setting VITE_STRICT_OFFLINE=false for server-backed APKs).

Local fallbacks require client env keys at build time:
- VITE_FOURSQUARE_API_KEY (and optional VITE_FOURSQUARE_API_VERSION)
- VITE_GEMINI_API_KEY

The Android APK local build script (npm run apk) injects VITE_ env vars from .env and fails if required keys are missing when VITE_LOCAL_ONLY=true.

### Web builds calling a remote API base

- Set VITE_API_BASE_URL to point the web app at a remote server (example: https://your-server.example.com).
- The client installs a fetch shim that rewrites /api/* to VITE_API_BASE_URL and attaches a stable session-id header.
- The server enables lightweight CORS for /api, allowing credentials and custom headers (session-id, x-user-lat, x-user-lng) with OPTIONS preflight.

Notes:
- Calls use relative /api paths in source; in non-local-only web builds they are rewritten to VITE_API_BASE_URL.
- When running server and web on the same origin, CORS is bypassed as usual.

## Test plan (Windows PowerShell)

- Dev with failover enabled (server reachable):
  1) $env:VITE_LOCAL_ONLY='true'
  2) npm run dev
  3) In the app, exercise the endpoints above; they should reach the server and external services normally. Local fallbacks should NOT trigger.

- Dev with strict offline (simulate no network):
  1) $env:VITE_LOCAL_ONLY='true'; $env:VITE_STRICT_OFFLINE='true'
  2) npm run dev
  3) Endpoints use on-device fallbacks (Gemini/Foursquare via client keys; OSRM replaced by heuristic route/geometry) and still render usable UI.

- APK builds:
  - Offline-first (failover enabled by default): npm run apk
  - Server-backed APK: npm run apk:server (requires .env VITE_API_BASE_URL)

### APK E2E validation (no server)

- Ensure .env contains FOURSQUARE_API_KEY and GEMINI_API_KEY (injected as VITE_*), then:
  - npm run apk
  - Install the debug APK on a device/emulator
  - Validate on-device calls:
    - Foursquare places: search and quick actions return results without server
    - Gemini planning: generates itinerary locally
    - OSRM routing: route geometry and readable step instructions present; if OSRM down, heuristic route still works
  - Observe errors gracefully when rate-limited; UI toasts should explain retry/backoff

### Web local-only E2E validation

- With $env:VITE_LOCAL_ONLY='true' in browser dev:
  - Confirm server-first attempts; local fallback triggers only on actual network failures
  - Toggle $env:VITE_STRICT_OFFLINE='true' to force local-only behavior

### Cross-origin web call validation

- Set VITE_API_BASE_URL in .env and run a production web build
- Load the web app from a different origin than the server
- Verify:
  - All /api calls are rewritten to VITE_API_BASE_URL
  - session-id header is attached end-to-end
  - CORS succeeds, including OPTIONS preflight where applicable

## Security considerations for APK keys

- API keys bundled in the APK are extractable. Mitigations:
  - Restrict keys at the provider (domain/app restrictions, quotas, usage monitoring)
  - Use separate keys for on-device (low-privilege) usage
  - Consider server mediation for sensitive operations in server-backed mode

## Future Directions

- **Multi-Agent Collaboration:** Enable group travel planning and coordination
- **Advanced AI Recommendations:** Integrate more LLMs for richer suggestions and real-time re-planning
- **Offline Mode:** Cache maps and itinerary for use without internet
- **Gamification:** Add achievements, badges, and social sharing
- **Voice Navigation:** Integrate voice guidance and conversational UI
- **Accessibility Enhancements:** Improve support for diverse user needs
- **Expanded Integrations:** Add more data sources (e.g., TripAdvisor, Google Places)
- **Personalized Analytics:** Provide post-trip insights and feedback
- **Augmented Reality:** Overlay directions and POIs on camera view
