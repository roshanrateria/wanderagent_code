Electron notes

- main.js: entry for electron main process
- preload.js: preload bridge that exposes an electron.onDeepLink handler
- Packaging
  - Run `npm install` to ensure electron & electron-builder are installed.
  - Dev: `npm run electron:dev` (starts electron and loads localhost:5173)
  - Build: `npm run build:electron` (this runs build:client:local to bake VITE_* into dist/public then runs electron-builder to create Windows artifacts).

Signing
- MSIX/Appx requires a certificate (pfx) with a valid publisher. Add signing configuration or supply a certificate when running electron-builder.

Notes about serverless/native
- The `build:electron` script uses `build:client:local` which runs `scripts/inject-client-env.mjs` and forces `VITE_LOCAL_ONLY=true`. This bakes VITE_GEMINI_API_KEY and VITE_FOURSQUARE_API_KEY into the static `dist/public` files so the packaged app runs without a server.
- The app still preserves privacy-first behavior: no login flows created in these changes.
