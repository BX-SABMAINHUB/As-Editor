/* * AS-EDITOR CORE ENGINE v2.0
 * Backend Logic & FFmpeg Bridge
 * -----------------------------
 * Handles native processes, memory allocation, and video rendering pipelines.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const fs = require('fs');

// Configuración del motor de video
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

let mainWindow;
let splashWindow;

// --- GESTIÓN DE VENTANAS PROFESIONAL ---
function createWindows() {
    // 1. Splash Screen (Carga de Módulos)
    splashWindow = new BrowserWindow({
        width: 600, height: 400,
        transparent: true, frame: false, alwaysOnTop: true,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: { nodeIntegration: true }
    });
    splashWindow.loadFile('splash.html');

    // 2. Main Workstation (Oculta hasta carga completa)
    mainWindow = new BrowserWindow({
        width: 1600, height: 900, // Resolución HD por defecto
        minWidth: 1024, minHeight: 768,
        show: false,
        frame: false, // Estilo Custom (VS Code)
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false, // Necesario para vista previa local
            enableRemoteModule: true
        }
    });
    mainWindow.loadFile('index.html');

    // Simulación de carga de módulos pesados (7 segundos reales)
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        mainWindow.show();
        mainWindow.maximize();
    }, 7000);
}

app.whenReady().then(createWindows);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- MOTOR DE PROCESAMIENTO DE VIDEO (REAL) ---

ipcMain.on('get-video-info', (event, filePath) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
            event.reply('console-log', { type: 'error', msg: `Error analizando metadata: ${err.message}` });
        } else {
            event.reply('video-metadata', metadata);
            event.reply('console-log', { type: 'info', msg: `Metadata cargada: ${metadata.format.duration}s @ ${metadata.streams[0].width}x${metadata.streams[0].height}` });
        }
    });
});

ipcMain.on('render-sequence', (event, task) => {
    /* * EL NÚCLEO DEL RENDERIZADO
     * Recibe un objeto 'task' con todas las opciones (filtros, codec, bitrate)
     * y construye el comando FFmpeg dinámicamente.
     */
    
    const { filePath, options, filters } = task;
    const outputPath = path.join(path.dirname(filePath), `AsEditor_Render_${Date.now()}.mp4`);
    
    event.reply('console-log', { type: 'system', msg: 'Iniciando Motor de Renderizado...' });
    event.reply('console-log', { type: 'system', msg: `Salida: ${outputPath}` });

    let command = ffmpeg(filePath);

    // 1. Aplicar Filtros de Video (Cadena compleja)
    let videoFilters = [];
    
    if (filters.contrast !== 1) videoFilters.push(`eq=contrast=${filters.contrast}`);
    if (filters.brightness !== 0) videoFilters.push(`eq=brightness=${filters.brightness}`);
    if (filters.saturation !== 1) videoFilters.push(`eq=saturation=${filters.saturation}`);
    if (filters.grayscale) videoFilters.push('hue=s=0');
    if (filters.invert) videoFilters.push('negate');
    if (filters.noise > 0) videoFilters.push(`noise=alls=${filters.noise}:allf=t+u`);
    
    if (videoFilters.length > 0) {
        command.videoFilters(videoFilters);
    }

    // 2. Opciones de Codec y Calidad
    command
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
            '-preset medium', // Balance velocidad/calidad
            '-crf 23',        // Calidad constante
            '-movflags +faststart'
        ]);

    // 3. Ejecución y Monitoreo
    command
        .on('start', (cmdLine) => {
            event.reply('console-log', { type: 'info', msg: `Comando FFmpeg generado.` });
            console.log(cmdLine); // Para debug interno
        })
        .on('progress', (progress) => {
            // Envía porcentaje real a la barra de progreso
            event.reply('render-progress', progress.percent);
        })
        .on('error', (err) => {
            event.reply('console-log', { type: 'error', msg: `FALLO CRÍTICO DE RENDER: ${err.message}` });
            event.reply('render-complete', { success: false });
        })
        .on('end', () => {
            event.reply('console-log', { type: 'success', msg: 'Renderizado Finalizado Exitosamente.' });
            event.reply('render-complete', { success: true, path: outputPath });
            // Abrir carpeta al finalizar
            shell.showItemInFolder(outputPath);
        })
        .save(outputPath);
});

// Controles de ventana personalizados
ipcMain.on('win-minimize', () => mainWindow.minimize());
ipcMain.on('win-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('win-close', () => mainWindow.close());
