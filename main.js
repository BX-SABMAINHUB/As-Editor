const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindows() {
    // 1. SPLASH SCREEN (Made by DevAlex)
    let splash = new BrowserWindow({ width: 800, height: 450, frame: false, transparent: true, alwaysOnTop: true });
    splash.loadURL(`data:text/html;charset=utf-8,
        <style>
            body { background: #1e1e1e; color: white; font-family: 'Segoe UI'; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .logo { font-size: 80px; font-weight: 900; color: #007acc; }
            .sub { color: #888; letter-spacing: 5px; margin-top: -15px; }
            .loader { width: 400px; height: 2px; background: #333; margin-top: 40px; }
            .bar { width: 0%; height: 100%; background: #007acc; animation: grow 7s linear forwards; }
            @keyframes grow { to { width: 100%; } }
        </style>
        <div class="logo">As-Editor</div>
        <div class="sub">MADE BY DEVALEX</div>
        <div class="loader"><div class="bar"></div></div>
    `);

    // 2. MAIN WINDOW
    let win = new BrowserWindow({
        width: 1920, height: 1080, show: false, frame: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    win.loadFile('index.html');

    // Sincronización de 7 segundos
    setTimeout(() => {
        splash.close();
        win.show();
        win.maximize();
    }, 7000);
}

app.whenReady().then(createWindows);
