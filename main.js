const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900,
        frame: false,
        backgroundColor: '#121212',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// --- MOTOR DE PROCESAMIENTO FFmpeg AVANZADO ---
ipcMain.on('render-sequence', (event, data) => {
    const { filePath, params } = data;
    const output = path.join(path.dirname(filePath), `AS_PRO_${Date.now()}.${params.format}`);
    
    event.reply('console-log', { type: 'system', msg: 'Construyendo Grafo de Filtros...' });

    let command = ffmpeg(filePath);
    let filters = [];

    // 1. Corrección de Color (EQ)
    let eqParts = [];
    if(params.eq_contrast != 1) eqParts.push(`contrast=${params.eq_contrast}`);
    if(params.eq_brightness != 0) eqParts.push(`brightness=${params.eq_brightness}`);
    if(params.eq_saturation != 1) eqParts.push(`saturation=${params.eq_saturation}`);
    if(params.eq_gamma != 1) eqParts.push(`gamma=${params.eq_gamma}`);
    if(params.eq_gamma_r != 1) eqParts.push(`gamma_r=${params.eq_gamma_r}`);
    if(params.eq_gamma_g != 1) eqParts.push(`gamma_g=${params.eq_gamma_g}`);
    if(params.eq_gamma_b != 1) eqParts.push(`gamma_b=${params.eq_gamma_b}`);
    
    if(eqParts.length > 0) filters.push(`eq=${eqParts.join(':')}`);

    // 2. Efectos Visuales
    if(params.noise > 0) filters.push(`noise=alls=${params.noise}:allf=t+u`);
    if(params.sharpen > 0) filters.push(`unsharp=5:5:${params.sharpen}:5:5:0`);
    if(params.blur > 0) filters.push(`gblur=sigma=${params.blur}`);
    if(params.vignette > 0) filters.push(`vignette=PI/4`); // Simplificado para estabilidad
    if(params.negate) filters.push('negate');
    
    // 3. Transformaciones
    if(params.lens_zoom > 1) {
        // Zoom central complejo
        let z = params.lens_zoom;
        filters.push(`scale=${z}*iw:-1,crop=iw/${z}:ih/${z}`);
    }
    
    // 4. Audio DSP
    let audioFilters = [];
    if(params.vol != 100) audioFilters.push(`volume=${params.vol/100}`);
    if(params.highpass > 0) audioFilters.push(`highpass=f=${params.highpass}`);
    if(params.lowpass < 20000) audioFilters.push(`lowpass=f=${params.lowpass}`);
    if(params.echo > 0) audioFilters.push(`aecho=0.8:0.9:1000:0.3`); // Eco simple

    // APLICAR FILTROS
    if(filters.length > 0) command.videoFilters(filters);
    if(audioFilters.length > 0) command.audioFilters(audioFilters);

    // Renderizado
    command
        .outputOptions([
            `-b:v ${params.bitrate}M`,
            `-preset ${params.preset}`
        ])
        .on('progress', (p) => event.reply('render-progress', p.percent))
        .on('end', () => {
            event.reply('render-complete', { success: true, path: output });
            shell.showItemInFolder(output);
        })
        .on('error', (err) => {
            event.reply('console-log', { type: 'error', msg: err.message });
            console.log(err);
        })
        .save(output);
});

// Controles de ventana
ipcMain.on('win-min', () => mainWindow.minimize());
ipcMain.on('win-max', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('win-close', () => mainWindow.close());
