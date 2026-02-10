const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let splash;

app.on('ready', () => {
  // 1. Crear la pantalla de carga (Splash Screen)
  splash = new BrowserWindow({
    width: 500, height: 300, 
    transparent: true, frame: false, alwaysOnTop: true 
  });
  splash.loadFile('splash.html');

  // 2. Crear la ventana principal (pero mantenerla oculta)
  mainWindow = new BrowserWindow({
    width: 1000, height: 700,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  mainWindow.loadFile('index.html');

  // 3. Esperar 5 segundos exactos antes de mostrar el programa
  setTimeout(() => {
    splash.close();
    mainWindow.show();
  }, 5000);
});
