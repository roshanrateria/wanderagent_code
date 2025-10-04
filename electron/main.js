// electron/main.js
// Entry for Electron (ESM). Starts local server in production and opens a BrowserWindow.
import { app, BrowserWindow } from "electron";
// Disable GPU to avoid repeated GPU process crashes in some Windows environments
try { app.disableHardwareAcceleration(); } catch {}
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import net from "net";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const __rawDir = path.dirname(url.fileURLToPath(import.meta.url));
function resolvePreload() {
  const candidates = [
    path.join(__rawDir, 'preload.cjs'),
    path.join(__rawDir, 'preload.js'),
    path.join(app.getAppPath(), 'electron', 'preload.cjs'),
    path.join(app.getAppPath(), 'electron', 'preload.js'),
    path.join(process.resourcesPath || '', 'app.asar', 'electron', 'preload.cjs'),
    path.join(process.resourcesPath || '', 'app.asar', 'electron', 'preload.js'),
    path.join(process.resourcesPath || '', 'electron', 'preload.cjs'),
    path.join(process.resourcesPath || '', 'electron', 'preload.js'),
    path.join(process.cwd(), 'electron', 'preload.cjs'),
    path.join(process.cwd(), 'electron', 'preload.js'),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  console.warn('[preload] Could not resolve preload.(c|j)s from candidates:', candidates);
  return path.join(app.getAppPath(), 'electron', 'preload.cjs');
}
const resolvedPreload = resolvePreload();
console.log('[preload] using', resolvedPreload);

const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = !app.isPackaged || process.env.NODE_ENV === "development";
// Enable serverless / local-file mode when these env vars are set to true (string)
const useLocalFiles = [process.env.VITE_LOCAL, process.env.VITE_LOCAL_ONLY, process.env.vite_local]
  .some((v) => typeof v === 'string' && ['1', 'true', 'yes'].includes(v.toLowerCase()));
console.log('[boot] VITE_LOCAL=%s VITE_LOCAL_ONLY=%s NODE_ENV=%s app.isPackaged=%s => useLocalFiles=%s',
  process.env.VITE_LOCAL,
  process.env.VITE_LOCAL_ONLY,
  process.env.NODE_ENV,
  app.isPackaged, // FIX: was app.isPackaged()
  useLocalFiles
);
if (useLocalFiles) console.log('[boot] Serverless mode active');
let nodeProcess = null;

function waitForPort(port, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(tryConnect, 200);
      });
      socket.once("timeout", () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(tryConnect, 200);
      });
      socket.connect(port, "127.0.0.1", () => {
        socket.end();
        resolve();
      });
    };

    tryConnect();
  });
}

async function startServerIfNeeded() {
  // If running in local-file (serverless) mode, don't try to start the server
  if (useLocalFiles) {
    console.log('VITE_LOCAL detected — running in serverless (local file) mode, will not start server.');
    return;
  }

  // In dev we expect the developer to run `npm run dev` which starts the server
  if (isDev) return;

  // Try multiple candidate locations where dist/index.js may live in packaged apps
  const candidates = [
    path.resolve(__dirname, "..", "dist", "index.js"),
    path.resolve(process.resourcesPath || "", "dist", "index.js"),
    path.resolve(process.resourcesPath || "", "app.asar", "dist", "index.js"),
    path.resolve(process.resourcesPath || "", "app", "dist", "index.js"),
    path.resolve(__dirname, "..", "..", "dist", "index.js"),
    path.resolve(app.getAppPath(), "..", "dist", "index.js"),
  ];

  const entry = candidates.find((p) => fs.existsSync(p) || fs.existsSync(p.replace(/\.js$/, ".mjs")) || fs.existsSync(p.replace(/\.js$/, ".cjs")));
  if (!entry) {
    console.error("Could not find dist/index.js to start server. Tried:\n", candidates.join("\n"));

    // As a fallback, check for a packaged server executable next to the app binary
    const execDir = path.dirname(process.execPath);
    const exeCandidates = [
      path.join(execDir, "rest-express.exe"),
      path.join(process.resourcesPath || "", "..", "rest-express.exe"),
      path.join(app.getAppPath(), "..", "rest-express.exe"),
    ];

    // Resolve, dedupe and filter out the currently running executable to avoid self-spawn
    const resolvedExeCandidates = exeCandidates
      .map((p) => {
        try { return path.resolve(p); } catch (e) { return null; }
      })
      .filter((p) => !!p)
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .filter((p) => {
        try {
          // must exist and not be the running exe
          return fs.existsSync(p) && path.resolve(process.execPath) !== p;
        } catch (e) {
          return false;
        }
      });

    if (resolvedExeCandidates.length > 0) {
      const exeEntry = resolvedExeCandidates[0];
      console.log("Starting packaged server executable:", exeEntry);
      nodeProcess = spawn(exeEntry, [], {
        env: { ...process.env, NODE_ENV: "production" },
        stdio: ["ignore", "inherit", "inherit"],
        detached: false,
      });

      nodeProcess.on("exit", (code, signal) => {
        console.log(`server process exited code=${code} signal=${signal}`);
      });

      try {
        await waitForPort(PORT, 20000);
      } catch (err) {
        console.warn("Timed out waiting for packaged server to start on port", PORT);
      }

      return;
    }

    console.error("No server entry or packaged server executable found. Window will likely fail to load localhost:", PORT);
    return;
  }

  // Start node with the discovered entry file
  // Accept .js/.mjs/.cjs bundle names
  const resolvedEntry = [entry, entry.replace(/\.js$/, ".mjs"), entry.replace(/\.js$/, ".cjs")].find((p) => p && fs.existsSync(p)) || entry;
  console.log("Starting server from entry:", resolvedEntry);
  nodeProcess = spawn(process.execPath, [resolvedEntry], {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "inherit", "inherit"],
    detached: false,
  });

  nodeProcess.on("exit", (code, signal) => {
    console.log(`server process exited code=${code} signal=${signal}`);
  });

  // wait for the server to accept connections before creating the BrowserWindow
  try {
    await waitForPort(PORT, 20000);
  } catch (err) {
    console.warn("Timed out waiting for server to start on port", PORT);
  }
}

function resolveServerlessIndex() {
  const execDir = path.dirname(process.execPath);
  const resourcesDir = path.resolve(execDir, 'resources');
  const appPath = app.getAppPath(); // points to app.asar when asar=true
  const candidates = [
    path.join(appPath, 'dist', 'public', 'index.html'), // inside app.asar
    path.join(appPath, 'dist', 'index.html'),
    path.join(resourcesDir, 'app.asar', 'dist', 'public', 'index.html'),
    path.join(resourcesDir, 'app.asar', 'dist', 'index.html'),
    path.join(resourcesDir, 'dist', 'public', 'index.html'), // extraResources style
    path.join(resourcesDir, 'dist', 'index.html'),
    path.resolve(__dirname, '..', 'dist', 'public', 'index.html'), // unpacked dev-like
    path.resolve(__dirname, '..', 'dist', 'index.html'),
  ];
  console.log('[serverless] Checking index candidates:');
  let found = null;
  for (const c of candidates) {
    let ok = false;
    try { ok = fs.existsSync(c); } catch {}
    console.log('  ', ok ? '[+]' : '[-]', c);
    if (!found && ok) found = c;
  }
  return found;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: resolvedPreload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Diagnostics for blank screen issues
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[webContents:did-fail-load]', errorCode, errorDescription, validatedURL);
    // Auto-fallback: if we tried localhost and it refused, attempt serverless index
    if (!useLocalFiles && validatedURL && validatedURL.startsWith('http://localhost:') && errorCode === -102) {
      console.log('[fallback] Localhost refused connection; attempting serverless index fallback');
      const idx = resolveServerlessIndex();
      if (idx) {
        const fileUrl = url.pathToFileURL(idx).href;
        console.log('[fallback] Loading local file instead:', fileUrl);
        win.loadURL(fileUrl).catch(e => console.error('[fallback] failed to load local index', e));
      } else {
        console.warn('[fallback] No local index.html found to fallback to');
      }
    }
  });
  win.webContents.on('crashed', () => console.error('[webContents] crashed'));
  win.webContents.on('render-process-gone', (e, details) => console.error('[webContents] render-process-gone', details));
  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[renderer console][lvl ${level}] ${message} (${sourceId}:${line})`);
  });

  if (isDev || useLocalFiles) {
    try { win.webContents.openDevTools({ mode: 'detach' }); } catch {}
  }

  if (useLocalFiles) {
    const indexPath = resolveServerlessIndex();
    if (!indexPath) {
      console.error('[serverless] index.html not found. Falling back to localhost and showing error page.');
      const fallback = `http://localhost:${PORT}/`;
      win.loadURL(fallback).catch(e => console.error('Failed to load fallback URL', fallback, e));
      win.webContents.once('did-fail-load', () => {
        win.webContents.executeJavaScript(`document.body.style.fontFamily='sans-serif';document.body.innerHTML='<h2>Packaged assets missing</h2><p>The static dist/public assets were not bundled. Ensure electron-builder includes dist/public in the files array.</p>'`);
      });
      return;
    }
    console.log('[serverless] Loading', indexPath);
    // Prefer loadFile (lets Electron build proper file:// internally, works with ASAR)
    try {
      if (typeof win.loadFile === 'function') {
        win.loadFile(indexPath).catch(e => {
          console.warn('loadFile failed, retrying with file URL', e);
          const fileUrl = url.pathToFileURL(indexPath).href;
          win.loadURL(fileUrl).catch(err => console.error('Failed to load local file URL', fileUrl, err));
        });
      } else {
        const fileUrl = url.pathToFileURL(indexPath).href;
        win.loadURL(fileUrl).catch(err => console.error('Failed to load local file URL', fileUrl, err));
      }
    } catch (e) {
      console.error('Unexpected error loading local index:', e);
    }
    return;
  }

  const loadUrl = `http://localhost:${PORT}/`;
  win.loadURL(loadUrl).catch(e => console.error('Failed to load URL', loadUrl, e));
}

app.whenReady().then(async () => {
  await startServerIfNeeded();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // On non-macOS platforms, quit the app when all windows are closed.
  if (process.platform !== "darwin") {
    if (nodeProcess && !nodeProcess.killed) {
      try { nodeProcess.kill(); } catch {}
    }
    app.quit();
  }
});

// Ensure child is killed on unexpected exits
process.on("exit", () => {
  if (nodeProcess && !nodeProcess.killed) {
    try { nodeProcess.kill(); } catch {}
  }
});
