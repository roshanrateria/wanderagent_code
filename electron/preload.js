// electron/preload.js (CommonJS for compatibility)
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ping: () => Promise.resolve('pong'),
});
