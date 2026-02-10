/**
 * AS-EDITOR PRO - UI ENGINE
 * Gestión de Explorador Profesional y Multi-Threading de UI
 */

const { ipcRenderer } = require('electron');
const path = require('path');

// --- SISTEMA DE ESTADO GLOBAL ---
let appState = {
    projects: [], // { id, name, path, settings }
    activeId: null,
    folders: ["PROYECTOS_MASTER", "RECURSOS_IA", "EXPORTACIONES"],
    uiConfig: { sidebarWidth: 260, bottomHeight: 250 }
};

// --- CONFIGURACIÓN DE HERRAMIENTAS (DERECHA) ---
const TOOLS = [
    { group: "COLOR MASTER", items: [
        { id: 'gamma_r', name: 'Gamma R', type: 'range', min: 0.1, max: 5, step: 0.01, def: 1 },
        { id: 'gamma_g', name: 'Gamma G', type: 'range', min: 0.1, max: 5, step: 0.01, def: 1 },
        { id: 'gamma_b', name: 'Gamma B', type: 'range', min: 0.1, max: 5, step: 0.01, def: 1 },
        { id: 'contrast', name: 'Contraste', type: 'range', min: -1, max: 2, step: 0.01, def: 1 },
        { id: 'brightness', name: 'Brillo', type: 'range', min: -1, max: 1, step: 0.01, def: 0 },
        { id: 'saturation', name: 'Saturación', type: 'range', min: 0, max: 3, step: 0.01, def: 1 }
    ]},
    { group: "IA & FX", items: [
        { id: 'unsharp', name: 'Nitidez IA', type: 'range', min: 0, max: 5, step: 0.1, def: 0 },
        { id: 'vignette', name: 'Viñeta', type: 'range', min: 0, max: 1, step: 0.01, def: 0 },
        { id: 'grayscale', name: 'B/N Noir', type: 'checkbox', def: false },
        { id: 'invert', name: 'Invertir', type: 'checkbox', def: false },
        { id: 'sepia', name: 'Vintage Sepia', type: 'checkbox', def: false }
    ]},
    { group: "AUDIO & GEOMETRÍA", items: [
        { id: 'volume', name: 'Volumen', type: 'range', min: 0, max: 5, step: 0.1, def: 1 },
        { id: 'bass', name: 'Bajos', type: 'range', min: -15, max: 15, step: 1, def: 0 },
        { id: 'treble', name: 'Agudos', type: 'range', min: -15, max: 15, step: 1, def: 0 },
        { id: 'rotate', name: 'Rotar Grados', type: 'range', min: 0, max: 360, step: 1, def: 0 },
        { id: 'hflip', name: 'Espejo H', type: 'checkbox', def: false },
        { id: 'vflip', name: 'Espejo V', type: 'checkbox', def: false }
    ]}
];

// --- GESTOR DEL EXPLORADOR (IZQUIERDA) ---
function renderExplorer() {
    const container = document.getElementById('explorerTree');
    container.innerHTML = '';

    appState.folders.forEach(folder => {
        const fDiv = document.createElement('div');
        fDiv.className = 'tree-folder';
        fDiv.innerHTML = `<span>▼</span> ${folder}`;
        container.appendChild(fDiv);

        // Renderizar videos dentro de la carpeta (si pertenecen a ella)
        const files = appState.projects.filter(p => p.folder === folder);
        files.forEach(file => {
            const fItem = document.createElement('div');
            fItem.className = `tree-item ${appState.activeId === file.id ? 'active' : ''}`;
            fItem.innerHTML = `📄 ${file.name}`;
            fItem.onclick = () => selectVideo(file.id);
            container.appendChild(fItem);
        });
    });
}

function selectVideo(id) {
    appState.activeId = id;
    const project = appState.projects.find(p => p.id === id);
    
    // Actualizar Preview
    const video = document.getElementById('videoPreview');
    video.src = `file://${project.path}`;
    video.style.display = 'block';
    document.getElementById('dropText').style.display = 'none';

    // Cargar sus ajustes en los sliders
    Object.keys(project.settings).forEach(key => {
        const el = document.getElementById(key);
        if (el) {
            if (el.type === 'checkbox') el.checked = project.settings[key];
            else {
                el.value = project.settings[key];
                if(document.getElementById(`val_${key}`)) document.getElementById(`val_${key}`).innerText = el.value;
            }
        }
    });

    log('info', `Cargado proyecto: ${project.name}`);
    renderExplorer();
    updateTabs();
}

function updateTabs() {
    const container = document.getElementById('tabContainer');
    container.innerHTML = '';
    appState.projects.forEach(p => {
        const tab = document.createElement('div');
        tab.className = `vs-tab ${appState.activeId === p.id ? 'active' : ''}`;
        tab.innerHTML = `${p.name} <span onclick="closeProject('${p.id}')">×</span>`;
        tab.onclick = (e) => { if(e.target.tagName !== 'SPAN') selectVideo(p.id); };
        container.appendChild(tab);
    });
}

// --- DRAG & DROP MULTI-VIDEO ---
const dropZone = document.getElementById('dropZone');
dropZone.ondrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
        const newProject = {
            id: Date.now() + Math.random(),
            name: file.name,
            path: file.path,
            folder: "PROYECTOS_MASTER",
            settings: {} // Valores por defecto
        };
        // Inicializar settings
        TOOLS.forEach(g => g.items.forEach(i => newProject.settings[i.id] = i.def));
        
        appState.projects.push(newProject);
        if (!appState.activeId) selectVideo(newProject.id);
    });
    
    renderExplorer();
    updateTabs();
    log('success', `Añadidos ${files.length} archivos al gestor.`);
};

// --- BOTÓN EXPORTAR ---
document.getElementById('renderBtn').onclick = () => {
    if (!appState.activeId) return log('error', 'Selecciona un video en el explorador.');

    const activeProject = appState.projects.find(p => p.id === appState.activeId);
    
    // Capturar ajustes actuales antes de enviar
    const currentSettings = {};
    TOOLS.forEach(g => g.items.forEach(i => {
        const el = document.getElementById(i.id);
        currentSettings[i.id] = (i.type === 'range') ? parseFloat(el.value) : el.checked;
    }));

    ipcRenderer.send('start-render', { 
        input: activeProject.path, 
        options: currentSettings 
    });
};

// Inyectar herramientas de la derecha
function initTools() {
    const container = document.getElementById('optionsContainer');
    TOOLS.forEach(group => {
        const gDiv = document.createElement('div');
        gDiv.className = 'vs-group';
        gDiv.innerHTML = `<div class="vs-group-title">▼ ${group.group}</div>`;
        const cDiv = document.createElement('div');
        cDiv.className = 'vs-group-content';
        
        group.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'vs-row';
            let input = item.type === 'range' ? 
                `<input type="range" id="${item.id}" min="${item.min}" max="${item.max}" step="${item.step}" value="${item.def}">
                 <span class="vs-val" id="val_${item.id}">${item.def}</span>` :
                `<input type="checkbox" id="${item.id}" ${item.def ? 'checked' : ''}>`;
            
            row.innerHTML = `<label>${item.name}</label>${input}`;
            cDiv.appendChild(row);
        });
        gDiv.appendChild(cDiv);
        container.appendChild(gDiv);
    });
}

function log(type, msg) {
    const out = document.getElementById('consoleOutput');
    const div = document.createElement('div');
    div.className = `log-${type}`;
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}

// Init
initTools();
renderExplorer();
log('system', 'Workstation 2026 cargada. El Explorador está listo para gestionar carpetas.');
