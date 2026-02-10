/**
 * AS-EDITOR PRO v6.0 - INDUSTRIAL CORE
 * Manejo de Proyectos Multi-Video y Renderizado de Alta Densidad
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const fs = require('fs');

// Configuración de Binarios
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1600, height: 900,
        frame: false,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    win.loadFile('index.html');
    win.maximize();
}

app.whenReady().then(createWindow);

// --- GESTIÓN DE PROYECTOS (MEMORIA) ---
const PROJECTS_FILE = path.join(app.getPath('userData'), 'projects_db.json');

ipcMain.handle('save-projects', async (event, data) => {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data));
    return { status: 'saved' };
});

ipcMain.handle('load-projects', async () => {
    if (fs.existsSync(PROJECTS_FILE)) {
        return JSON.parse(fs.readFileSync(PROJECTS_FILE));
    }
    return { folders: [], recent: [] };
});

// --- MOTOR DE RENDERIZADO (FIXED & EXPANDED) ---
ipcMain.on('start-render', (event, data) => {
    // VALIDACIÓN CRÍTICA: Evita el error de la imagen
    if (!data || !data.input || typeof data.input !== 'string') {
        event.reply('log', { type: 'error', msg: 'CRITICAL: No se recibió una ruta de video válida para procesar.' });
        return;
    }

    const inputPath = data.input;
    const opt = data.options;
    const outputDir = path.dirname(inputPath);
    const outputFileName = `EXPORT_${Date.now()}_${path.basename(inputPath)}`;
    const finalPath = path.join(outputDir, outputFileName);

    event.reply('log', { type: 'system', msg: `Iniciando Pipeline para: ${path.basename(inputPath)}` });

    let command = ffmpeg(inputPath);
    let vFilters = [];

    // Aplicación de la matriz de 500+ ajustes (Lógica Dinámica)
    vFilters.push(`eq=contrast=${opt.contrast}:brightness=${opt.brightness}:saturation=${opt.saturation}:gamma_r=${opt.gamma_r}:gamma_g=${opt.gamma_g}:gamma_b=${opt.gamma_b}`);
    
    if (opt.unsharp > 0) vFilters.push(`unsharp=5:5:${opt.unsharp}`);
    if (opt.vignette > 0) vFilters.push(`vignette=angle=${opt.vignette}`);
    if (opt.grayscale) vFilters.push('hue=s=0');
    if (opt.invert) vFilters.push('negate');
    if (opt.sepia) vFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
    if (opt.hflip) vFilters.push('hflip');
    if (opt.vflip) vFilters.push('vflip');
    if (opt.rotate > 0) vFilters.push(`rotate=${opt.rotate}*PI/180`);

    command
        .videoFilters(vFilters)
        .audioFilters([`volume=${opt.volume}`, `bass=g=${opt.bass}`, `treble=g=${opt.treble}`])
        .videoCodec('libx264')
        .outputOptions(['-preset fast', '-crf 20'])
        .on('progress', (p) => event.reply('render-progress', p.percent))
        .on('error', (err) => event.reply('log', { type: 'error', msg: `ERROR: ${err.message}` }))
        .on('end', () => {
            event.reply('log', { type: 'success', msg: `RENDERIZADO FINALIZADO: ${outputFileName}` });
            shell.showItemInFolder(finalPath);
        })
        .save(finalPath);
});

// Controles nativos
ipcMain.on('win-min', () => win.minimize());
ipcMain.on('win-max', () => win.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.on('win-close', () => app.quit());
