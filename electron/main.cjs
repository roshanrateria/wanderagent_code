// electron/main.cjs
// CommonJS bootstrap for packaged Electron apps. Reads the bundled ESM main from the ASAR
// and writes it to a temporary .mjs file so the ESM loader can import it. Works in dev
// and packaged builds. Preserves existing behavior.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { app } = require('electron');

async function loadEsmMain() {
  try {
    const appPath = app.getAppPath();
    const bundledEsmPath = path.join(appPath, 'electron', 'main.js');

    // Read source from app.asar (fs can transparently read inside ASAR)
    const source = fs.readFileSync(bundledEsmPath, 'utf8');

    // Instead of using the `node:electron` scheme (which may be unavailable in
    // some runtimes), create a small ESM shim file that requires the builtin
    // 'electron' CommonJS module and re-exports the commonly-used named
    // exports. Then rewrite imports that target 'electron' to point to the
    // shim via a relative file URL. This avoids both the unsupported
    // 'electron:' scheme and runtime environments that don't recognize
    // 'node:electron'.

    const tempDir = app.getPath('temp') || require('os').tmpdir();
    const shimBasename = `wanderagent-electron-shim-${process.pid}-${Date.now()}.mjs`;
    const shimFile = path.join(tempDir, shimBasename);

    const shimSource = `import { createRequire } from 'module';\n` +
      `const require = createRequire(import.meta.url);\n` +
      `const electron = require('electron');\n` +
      `export default electron;\n` +
      `export const app = electron.app;\n` +
      `export const BrowserWindow = electron.BrowserWindow;\n` +
      `export const ipcMain = electron.ipcMain;\n` +
      `export const ipcRenderer = electron.ipcRenderer;\n` +
      `export const nativeImage = electron.nativeImage;\n` +
      `export const shell = electron.shell;\n` +
      `export const dialog = electron.dialog;\n` +
      `export const Menu = electron.Menu;\n` +
      `export const MenuItem = electron.MenuItem;\n` +
      `export const Tray = electron.Tray;\n` +
      `export const BrowserView = electron.BrowserView;\n` +
      `export const session = electron.session;\n` +
      `export const webContents = electron.webContents;\n` +
      `export const systemPreferences = electron.systemPreferences;\n`;

    // Write the shim file first
    try {
      fs.writeFileSync(shimFile, shimSource, 'utf8');
    } catch (e) {
      // If writing the shim fails, fall back to original source to make error
      // visible rather than crashing silently.
      console.error('Failed to write electron shim:', e);
    }

    // Replace imports that reference 'electron' so they instead import the shim
    // using a relative path (same temp dir). This covers `import X from 'electron'`,
    // `import { X } from 'electron'`, and dynamic `import('electron')`.
    const shimRelative = `./${shimBasename}`;
    const transformedSource = source
      .replace(/from\s+(['"])electron\1/g, `from \"${shimRelative}\"`)
      .replace(/import\s+(['"])electron\1/g, `import \"${shimRelative}\"`)
      .replace(/import\(\s*(['"])electron\1\s*\)/g, `import(\"${shimRelative}\")`);

    // Create a unique temp file to import (must have .mjs extension for ESM)
    const tempFile = path.join(
      tempDir,
      `wanderagent-electron-main-${process.pid}-${Date.now()}.mjs`
    );

    fs.writeFileSync(tempFile, transformedSource, 'utf8');

    // Ensure cleanup on exit or termination signals
    const cleanup = () => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      try { fs.unlinkSync(shimFile); } catch (e) {}
    };
    process.once('exit', cleanup);
    process.once('SIGINT', () => { cleanup(); process.exit(0); });
    process.once('SIGTERM', () => { cleanup(); process.exit(0); });

    // Import the temp file via file:// URL
    const esmUrl = pathToFileURL(tempFile).href;
    await import(esmUrl);
  } catch (err) {
    console.error('Failed to load ESM electron/main.js:', err);
    // Give some time to inspect the error in packaged environments
    setTimeout(() => process.exit(1), 1000);
  }
}

if (app.isReady()) {
  loadEsmMain();
} else {
  app.once('ready', loadEsmMain);
}