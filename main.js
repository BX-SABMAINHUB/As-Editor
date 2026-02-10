const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

let mainWindow;
let splash;

function createWindows() {
    // 1. Splash Window (Siete segundos, diseño limpio)
    splash = new BrowserWindow({
        width: 600, height: 350,
        transparent: true, frame: false,
        alwaysOnTop: true, resizable: false,
        center: true,
        icon: path.join(__dirname, 'icon.ico')
    });
    splash.loadFile('splash.html');

    // 2. Main Window (Oculta al inicio)
    mainWindow = new BrowserWindow({
        width: 1280, height: 800,
        show: false,
        frame: true,
        title: "As-Editor - Professional AI Video Studio",
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Permite cargar videos locales
        }
    });
    mainWindow.loadFile('index.html');

    // 3. Temporizador de carga profesional (7 segundos)
    setTimeout(() => {
        splash.close();
        mainWindow.show();
        mainWindow.maximize();
    }, 7000);
}

app.whenReady().then(createWindows);

// Comunicación para procesamiento de video (Lógica IA)
ipcMain.on('process-video', (event, filePath) => {
    const output = path.join(path.dirname(filePath), 'AsEditor_Exported.mp4');
    
    // Aquí se inyecta la lógica de filtros compleja
    ffmpeg(filePath)
        .videoFilters([
            { filter: 'fade', options: 'in:0:30' },
            { filter: 'hue', options: 's=0' }, // Ejemplo: Efecto cinemático
            { filter: 'drawbox', options: 'y=0:color=white@0.4:t=fill:enable=\'between(t,2,2.1)\'' }
        ])
        .on('start', () => event.reply('status', 'Procesando arquitectura de video...'))
        .on('progress', (p) => event.reply('progress', p.percent))
        .on('error', (err) => event.reply('error', err.message))
        .on('end', () => {
            event.reply('finished', output);
        })
        .save(output);
});
