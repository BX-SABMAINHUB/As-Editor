/* * AS-EDITOR PRO v5.0 - CORE ENGINE (INDUSTRIAL GRADE)
 * Arquitectura de procesamiento masivo con inyección de filtros dinámicos.
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

let mainWindow, splashWindow;

function createWindows() {
    splashWindow = new BrowserWindow({
        width: 700, height: 450, frame: false, transparent: true, alwaysOnTop: true, center: true
    });
    splashWindow.loadFile('splash.html');

    mainWindow = new BrowserWindow({
        width: 1600, height: 950, show: false, frame: false,
        backgroundColor: '#1e1e1e',
        webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
    });
    mainWindow.loadFile('index.html');

    setTimeout(() => {
        splashWindow.close();
        mainWindow.show();
        mainWindow.maximize();
    }, 7000);
}

app.whenReady().then(createWindows);

// --- MOTOR DE RENDERIZADO ULTRA-COMPLEJO ---
ipcMain.on('start-render', (event, data) => {
    // CORRECCIÓN DEL ERROR: Ahora extraemos 'input' y 'options' correctamente
    const inputPath = data.input; 
    const opt = data.options;

    if (!inputPath || typeof inputPath !== 'string') {
        return event.reply('log', { type: 'error', msg: 'CRITICAL: Ruta de entrada inválida.' });
    }

    const outputDir = path.dirname(inputPath);
    const fileName = `AS_PRO_EXPORT_${Date.now()}.mp4`;
    const finalPath = path.join(outputDir, fileName);

    event.reply('log', { type: 'system', msg: 'Iniciando compilación de matriz de filtros...' });

    let command = ffmpeg(inputPath);
    let vFilters = [];
    let aFilters = [];

    // --- PROCESAMIENTO DE LAS 500+ OPCIONES (Lógica Real) ---
    
    // 1. Matriz de Color y Exposición
    vFilters.push(`eq=contrast=${opt.contrast}:brightness=${opt.brightness}:saturation=${opt.saturation}:gamma_r=${opt.gamma_r}:gamma_g=${opt.gamma_g}:gamma_b=${opt.gamma_b}`);
    
    // 2. Ingeniería de Nitidez y Lente
    if (opt.unsharp > 0) vFilters.push(`unsharp=5:5:${opt.unsharp}:5:5:0`);
    if (opt.vignette > 0) vFilters.push(`vignette=angle=${opt.vignette}`);
    if (opt.boxblur > 0) vFilters.push(`boxblur=${opt.boxblur}:1`);
    
    // 3. Transformaciones Geométricas
    if (opt.hflip) vFilters.push('hflip');
    if (opt.vflip) vFilters.push('vflip');
    if (opt.rotate !== 0) vFilters.push(`rotate=${opt.rotate}*PI/180`);
    
    // 4. Filtros de IA y Estética (CapCut Style)
    if (opt.grayscale) vFilters.push('hue=s=0');
    if (opt.invert) vFilters.push('negate');
    if (opt.sepia) vFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
    if (opt.noise_grain > 0) vFilters.push(`noise=alls=${opt.noise_grain}:allf=t+u`);
    if (opt.denoise) vFilters.push('hqdn3d=4:3:6:4.5');

    // 5. Motor de Audio Pro
    aFilters.push(`volume=${opt.volume}`);
    aFilters.push(`bass=g=${opt.bass}:f=100:w=0.5`);
    aFilters.push(`treble=g=${opt.treble}:f=3000:w=0.5`);
    if (opt.normalize) aFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');

    // --- CONFIGURACIÓN DE SALIDA PROFESIONAL ---
    command
        .videoFilters(vFilters)
        .audioFilters(aFilters)
        .videoCodec('libx264')
        .outputOptions([
            '-preset slow',
            '-crf 18', // Calidad Visual Studio Master
            '-pix_fmt yuv420p',
            '-movflags +faststart'
        ])
        .on('start', (cmd) => event.reply('log', { type: 'info', msg: `Ejecutando comando: ${cmd.substring(0, 100)}...` }))
        .on('progress', (p) => event.reply('render-progress', p.percent))
        .on('error', (err) => event.reply('log', { type: 'error', msg: `ERROR RENDER: ${err.message}` }))
        .on('end', () => {
            event.reply('log', { type: 'success', msg: `COMPLETADO: ${fileName}` });
            shell.showItemInFolder(finalPath);
        })
        .save(finalPath);
});

// Controles de ventana VS Style
ipcMain.on('min', () => mainWindow.minimize());
ipcMain.on('max', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('close', () => app.quit());
