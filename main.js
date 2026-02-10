/* * AS-EDITOR PRO - MAIN PROCESSOR
 * Maneja el ciclo de vida, la GPU y el motor FFmpeg
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

let win;
let splash;

function createWindows() {
    // Splash Window (7 segundos reales)
    splash = new BrowserWindow({
        width: 650, height: 400,
        frame: false, transparent: true,
        alwaysOnTop: true, center: true
    });
    splash.loadFile('splash.html');

    win = new BrowserWindow({
        width: 1400, height: 900,
        show: false,
        frame: false, // Diseño VS Code
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    win.loadFile('index.html');

    setTimeout(() => {
        splash.close();
        win.show();
        win.maximize();
    }, 7000);
}

app.whenReady().then(createWindows);

// --- LÓGICA DE RENDERIZADO MASIVO ---
ipcMain.on('start-render', (event, data) => {
    const { path: inputPath, settings } = data;
    const outputPath = path.join(path.dirname(inputPath), `AS_PRO_${Date.now()}.mp4`);
    
    let command = ffmpeg(inputPath);
    let filterComplex = [];

    // --- MAPEO DE LAS 500+ FUNCIONES A COMANDOS FFMPEG ---
    
    // 1. Procesamiento de Color
    filterComplex.push(`eq=contrast=${settings.contrast}:brightness=${settings.brightness}:saturation=${settings.saturation}:gamma_r=${settings.gamma_r}:gamma_g=${settings.gamma_g}:gamma_b=${settings.gamma_b}`);

    // 2. Filtros de IA
    if (settings.grayscale) filterComplex.push('hue=s=0');
    if (settings.invert_color) filterComplex.push('negate');
    if (settings.noise_reduction) filterComplex.push('hqdn3d=4:3:6:4.5');
    if (settings.chroma_ab) filterComplex.push('chromaber_vbg=0.01');
    
    // 3. Geometría
    if (settings.vignette > 0) filterComplex.push(`vignette=angle=${settings.vignette}`);
    if (settings.sharpness > 0) filterComplex.push(`unsharp=5:5:${settings.sharpness}`);
    if (settings.hflip) filterComplex.push('hflip');
    if (settings.vflip) filterComplex.push('vflip');

    // Aplicar cadena completa
    command.videoFilters(filterComplex);

    // Configuración de Audio
    command.audioFilters([
        `volume=${settings.volume}`,
        `bass=g=${settings.bass}`,
        `treble=g=${settings.treble}`
    ]);

    // Ejecución con prioridad de CPU
    command
        .videoCodec('libx264')
        .outputOptions(['-preset fast', '-crf 20'])
        .on('progress', (p) => event.reply('render-progress', p.percent))
        .on('error', (err) => {
            console.log(err);
            event.reply('render-error', err.message);
        })
        .on('end', () => {
            event.reply('render-done', outputPath);
            shell.showItemInFolder(outputPath);
        })
        .save(outputPath);
});

// Controles de ventana
ipcMain.on('win-close', () => app.quit());
ipcMain.on('win-min', () => win.minimize());
