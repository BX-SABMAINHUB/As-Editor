const { ipcRenderer } = require('electron');

// ESTRUCTURA DE DATOS PARA LAS 500+ OPCIONES
const TOOLSET = [
    {
        group: "CORRECCIÓN DE COLOR (GRADIENT)",
        items: [
            { id: 'gamma_r', name: 'Gamma Rojo', type: 'range', min: 0.1, max: 5, step: 0.01, def: 1 },
            { id: 'gamma_g', name: 'Gamma Verde', type: 'range', min: 0.1, max: 5, step: 0.01, def: 1 },
            { id: 'gamma_b', name: 'Gamma Azul', type: 'range', min: 0.1, max: 5, step: 0.01, def: 1 },
            { id: 'brightness', name: 'Exposición (Luma)', type: 'range', min: -1, max: 1, step: 0.01, def: 0 },
            { id: 'contrast', name: 'Contraste Pro', type: 'range', min: -1, max: 2, step: 0.01, def: 1 },
            { id: 'saturation', name: 'Saturación Color', type: 'range', min: 0, max: 3, step: 0.01, def: 1 },
            { id: 'vibrance', name: 'Vibranza IA', type: 'range', min: -1, max: 2, step: 0.01, def: 0 }
        ]
    },
    {
        group: "ÓPTICA AVANZADA",
        items: [
            { id: 'unsharp', name: 'Nitidez (Sharpen)', type: 'range', min: 0, max: 5, step: 0.1, def: 0 },
            { id: 'boxblur', name: 'Desenfoque Gaussiano', type: 'range', min: 0, max: 20, step: 1, def: 0 },
            { id: 'vignette', name: 'Viñeteado Cinematográfico', type: 'range', min: 0, max: 1, step: 0.01, def: 0 },
            { id: 'lens_k1', name: 'Corrección Lente K1', type: 'range', min: -0.5, max: 0.5, step: 0.01, def: 0 },
            { id: 'lens_k2', name: 'Corrección Lente K2', type: 'range', min: -0.5, max: 0.5, step: 0.01, def: 0 }
        ]
    },
    {
        group: "REDUCCIÓN DE RUIDO & IA",
        items: [
            { id: 'denoise', name: 'Denoise Espacial (HQ)', type: 'checkbox', def: false },
            { id: 'chromaber', name: 'Aberración Cromática', type: 'checkbox', def: false },
            { id: 'stabilizer', name: 'Estabilizador de Imagen', type: 'checkbox', def: false },
            { id: 'fps_boost', name: 'Interpolación de Frames (AI)', type: 'checkbox', def: false }
        ]
    },
    {
        group: "FILTROS ESTILO CAPCUT / FX",
        items: [
            { id: 'grayscale', name: 'Modo Blanco y Negro', type: 'checkbox', def: false },
            { id: 'invert', name: 'Invertir Negativo', type: 'checkbox', def: false },
            { id: 'sepia', name: 'Tono Sepia Vintage', type: 'checkbox', def: false },
            { id: 'glitch', name: 'Efecto Glitch Digital', type: 'checkbox', def: false },
            { id: 'noise_grain', name: 'Grano de Película 35mm', type: 'range', min: 0, max: 100, step: 1, def: 0 }
        ]
    },
    {
        group: "TRANSFORMACIÓN & GEOMETRÍA",
        items: [
            { id: 'rotate', name: 'Rotación Grados', type: 'range', min: 0, max: 360, step: 1, def: 0 },
            { id: 'zoom', name: 'Escala de Zoom', type: 'range', min: 1, max: 3, step: 0.01, def: 1 },
            { id: 'hflip', name: 'Espejo Horizontal', type: 'checkbox', def: false },
            { id: 'vflip', name: 'Espejo Vertical', type: 'checkbox', def: false }
        ]
    },
    {
        group: "MASTERIZACIÓN DE AUDIO",
        items: [
            { id: 'volume', name: 'Ganancia Maestra', type: 'range', min: 0, max: 5, step: 0.1, def: 1 },
            { id: 'bass', name: 'Refuerzo de Graves', type: 'range', min: -15, max: 15, step: 1, def: 0 },
            { id: 'treble', name: 'Claridad de Agudos', type: 'range', min: -15, max: 15, step: 1, def: 0 },
            { id: 'normalize', name: 'Normalizar Audio EBU R128', type: 'checkbox', def: false }
        ]
    }
    // ... Se pueden expandir hasta las 500 opciones siguiendo este patrón ...
];

let selectedPath = null;

// Inicializar UI Estilo Visual Studio
function initProUI() {
    const container = document.getElementById('optionsContainer');
    TOOLSET.forEach(section => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'vs-group';
        groupDiv.innerHTML = `<div class="vs-group-title">▼ ${section.group}</div>`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'vs-group-content';

        section.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'vs-row';
            
            let inputHTML = '';
            if(item.type === 'range') {
                inputHTML = `<input type="range" id="${item.id}" min="${item.min}" max="${item.max}" step="${item.step}" value="${item.def}">
                             <span class="vs-val" id="val_${item.id}">${item.def}</span>`;
            } else {
                inputHTML = `<input type="checkbox" id="${item.id}" ${item.def ? 'checked' : ''}>`;
            }

            row.innerHTML = `<label title="${item.name}">${item.name}</label>${inputHTML}`;
            contentDiv.appendChild(row);

            // Listener para actualizar valor visualmente
            setTimeout(() => {
                const el = document.getElementById(item.id);
                el.oninput = () => {
                    if(item.type === 'range') document.getElementById(`val_${item.id}`).innerText = el.value;
                    log('debug', `Cambio en ${item.id}: ${el.value}`);
                };
            }, 0);
        });

        groupDiv.appendChild(contentDiv);
        container.appendChild(groupDiv);
    });
}

// Sistema de Consola Visual Studio
function log(type, msg) {
    const out = document.getElementById('consoleOutput');
    const div = document.createElement('div');
    div.className = `log-${type}`;
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}

// Drag & Drop
const dropZone = document.getElementById('dropZone');
dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = "#007acc"; };
dropZone.ondragleave = () => { dropZone.style.borderColor = "#3c3c3c"; };
dropZone.ondrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
        selectedPath = file.path;
        document.getElementById('videoPreview').src = `file://${file.path}`;
        document.getElementById('videoPreview').style.display = 'block';
        document.getElementById('dropText').style.display = 'none';
        document.getElementById('activeFile').innerText = file.name;
        log('success', `Archivo cargado en el editor: ${file.path}`);
    }
};

// Ejecución de Renderizado Real
document.getElementById('renderBtn').onclick = () => {
    if(!selectedPath) return alert("Primero arrastra un video al editor central.");
    
    log('system', 'Compilando parámetros de renderizado...');
    const params = {};
    TOOLSET.forEach(s => s.items.forEach(i => {
        const el = document.getElementById(i.id);
        params[i.id] = (i.type === 'range') ? parseFloat(el.value) : el.checked;
    }));

    ipcRenderer.send('start-render', { input: selectedPath, options: params });
};

ipcRenderer.on('render-progress', (e, p) => {
    document.getElementById('progressBar').style.width = `${p}%`;
});

ipcRenderer.on('log', (e, d) => log(d.type, d.msg));

initProUI();
