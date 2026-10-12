// Desktop wrapper: serves the game folder on a private localhost port and opens it in a window.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { serve } = require('../tools/server');

async function createWindow() {
  const server = await serve(path.resolve(__dirname, '..'));
  const { port } = server.address();
  const win = new BrowserWindow({
    width: 1440, height: 810, minWidth: 480, minHeight: 270,
    backgroundColor: '#07060c', title: 'ALL-NIGHTER', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });
  Menu.setApplicationMenu(null);
  win.loadURL(`http://127.0.0.1:${port}/index.html?desktop=1`);
  win.on('closed', () => server.close());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
