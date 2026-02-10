const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let mainWindow;
let splash;

app.on('ready', () => {
  // Pantalla de carga (Splash)
  splash = new BrowserWindow({ width: 500, height: 350, transparent: true, frame: false, alwaysOnTop: true });
  splash.loadFile('splash.html');

  // Ventana Principal
  mainWindow = new BrowserWindow({
    width: 1100, height: 800,
    show: false,
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');

  // 5 segundos de Splash con Logo
  setTimeout(() => {
    splash.close();
    mainWindow.show();
  }, 5000);
});

// Lógica de Procesamiento de Video
ipcMain.on('video-upload', async (event, filePath) => {
  const output = path.join(path.dirname(filePath), 'AsEditor_Final.mp4');
  
  // Aquí simulamos la detección de ritmo y aplicamos 3 flashes de prueba
  // En una fase avanzada, aquí llamaríamos al script de Python
  ffmpeg(filePath)
    .videoFilters([
      { filter: 'drawbox', options: 'y=0:color=white@0.5:t=fill:enable=\'between(t,1,1.2)\'' },
      { filter: 'drawbox', options: 'y=0:color=white@0.5:t=fill:enable=\'between(t,2,2.2)\'' }
    ])
    .save(output)
    .on('end', () => event.reply('process-finished', output))
    .on('error', (err) => console.log('Error: ' + err.message));
});
