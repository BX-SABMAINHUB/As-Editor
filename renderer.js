/* * AS-EDITOR RENDERER PROCESS
 * Client-side logic, Event Listeners, and UI State Management
 */

const { ipcRenderer } = require('electron');

// Elementos UI
const dropZone = document.getElementById('dropZone');
const editorArea = document.getElementById('editorArea');
const videoPreview = document.getElementById('videoPreview');
const consoleOutput = document.getElementById('consoleOutput');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const statusFile = document.getElementById('statusFile');
const fileList = document.getElementById('fileList');

let currentFilePath = null;

// --- SISTEMA DE LOGS (SIMULA TERMINAL) ---
function log(type, msg) {
    const div = document.createElement('div');
    div.className = `log-${type}`;
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Escuchar logs desde el Backend
ipcRenderer.on('console-log', (event, data) => log(data.type, data.msg));

// --- DRAG & DROP SYSTEM (REAL) ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        loadFile(files[0].path);
    }
});

// --- CARGA DE ARCHIVOS ---
function loadFile(path) {
    currentFilePath = path;
    
    // UI Update
    dropZone.style.display = 'none';
    videoPreview.style.display = 'block';
    videoPreview.src = path; // Carga local (gracias a webSecurity: false)
    
    statusFile.innerText = `EDITANDO: ${path}`;
    log('info', `Archivo cargado en memoria: ${path}`);
    
    // Actualizar explorador lateral
    fileList.innerHTML = `
        <div>> PROYECTO_MASTER</div>
        <div style="padding-left:10px; color: var(--success);">✔ ${path.split('\\').pop()}</div>
    `;

    // Pedir metadata a FFmpeg
    ipcRenderer.send('get-video-info', path);
}

// --- RENDERIZADO (RECOGER DATOS Y ENVIAR) ---
document.getElementById('renderBtn').addEventListener('click', () => {
    if (!currentFilePath) {
        log('error', 'No hay video cargado para renderizar.');
        alert('¡Arrastra un video primero!');
        return;
    }

    // 1. Recoger valores de la UI (Aquí es donde añades tus 500 opciones)
    const renderOptions = {
        filePath: currentFilePath,
        filters: {
            contrast: document.getElementById('contrast').value,
            brightness: document.getElementById('brightness').value,
            saturation: document.getElementById('saturation').value,
            grayscale: document.getElementById('grayscale').checked,
            invert: document.getElementById('invert').checked,
            noise: document.getElementById('noise').value
        },
        format: document.getElementById('format').value
    };

    // 2. Bloquear UI
    document.getElementById('renderBtn').disabled = true;
    document.getElementById('renderBtn').innerText = "PROCESANDO...";

    // 3. Enviar orden al Backend
    ipcRenderer.send('render-sequence', renderOptions);
});

// --- LISTENERS DE PROGRESO ---
ipcRenderer.on('render-progress', (event, percent) => {
    const p = Math.round(percent);
    progressBar.style.width = `${p}%`;
    progressText.innerText = `${p}%`;
});

ipcRenderer.on('render-complete', (event, result) => {
    document.getElementById('renderBtn').disabled = false;
    document.getElementById('renderBtn').innerText = "RENDERIZAR PROYECTO";
    
    if (result.success) {
        alert(`¡RENDERIZADO COMPLETADO!\nGuardado en: ${result.path}`);
        progressBar.style.background = "var(--success)";
    } else {
        progressBar.style.background = "var(--error)";
    }
});
