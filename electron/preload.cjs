// electron/preload.cjs - CommonJS preload (safer for sandbox)
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ping: () => Promise.resolve('pong'),
});
