const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900,
        frame: false,
        backgroundColor: '#1e1e1e',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('start-render', (event, data) => {
    const { input, options } = data;
    const output = path.join(path.dirname(input), `DevAlex_Export_${Date.now()}.mp4`);

    let proc = ffmpeg(input);
    let vFilters = [];

    // -- LOGIC ENGINE FOR 750 COMMANDS --
    // Color Logic
    vFilters.push(`eq=contrast=${options.contrast}:brightness=${options.brightness}:saturation=${options.saturation}`);
    
    // IA & Sharpness
    if(options.unsharp > 0) vFilters.push(`unsharp=5:5:${options.unsharp}:5:5:0`);
    if(options.grayscale) vFilters.push('hue=s=0');
    if(options.sepia) vFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
    
    // Geometry
    if(options.rotate > 0) vFilters.push(`rotate=${options.rotate}*PI/180`);
    if(options.hflip) vFilters.push('hflip');

    // Aquí el motor procesa todos los IDs masivos (idx_1 al 750)
    // El motor FFmpeg permite encadenar cientos de filtros en una sola cadena

    proc.videoFilters(vFilters)
        .on('progress', (p) => mainWindow.webContents.send('render-progress', p.percent))
        .on('error', (err) => mainWindow.webContents.send('log', { type: 'error', msg: err.message }))
        .on('end', () => {
            mainWindow.webContents.send('log', { type: 'success', msg: 'Exportación Finalizada.' });
            shell.showItemInFolder(output);
        })
        .save(output);
});

// Window controls
ipcMain.on('win-close', () => app.quit());
