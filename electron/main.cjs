const { app, BrowserWindow, shell, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.handle('save-pdf', async (event, { defaultName, data }) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Analyzed PDF Report',
            defaultPath: defaultName || 'Analyzed_Motor_NCS_Report.pdf',
            filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
        });
        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }
        const buffer = Buffer.from(data);
        await fs.promises.writeFile(filePath, buffer);
        return { success: true, filePath };
    } catch (err) {
        console.error('Failed to save PDF file via IPC:', err);
        return { success: false, error: err.message };
    }
});

app.setName('NeuroReport Analyzer');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
try {
    app.setPath('userData', path.join(app.getPath('appData'), 'NeuroReport Analyzer'));
} catch (e) {
    console.warn('Could not set custom userData path:', e);
}

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.argv.includes('--dev'));
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 880,
        minWidth: 1024,
        minHeight: 700,
        title: 'NeuroReport Analyzer',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Essential for offline local file:// loading of wasm & OCR data
            allowRunningInsecureContent: false,
            sandbox: false
        },
        autoHideMenuBar: false,
        show: false
    });

    if (isDev) {
        mainWindow.loadURL(devServerUrl).catch(err => {
            console.error('Failed to load dev server, retrying...', err);
            setTimeout(() => {
                mainWindow && mainWindow.loadURL(devServerUrl);
            }, 1000);
        });
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        mainWindow.loadFile(indexPath);
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Strict offline security: block all external network traffic
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const url = details.url;
        if (
            url.startsWith('file:') || 
            url.startsWith('data:') || 
            url.startsWith('blob:') || 
            url.startsWith('devtools:') || 
            url.startsWith('chrome-extension:') || 
            (isDev && (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('ws://localhost') || url.startsWith('ws://127.0.0.1')))
        ) {
            callback({ cancel: false });
        } else {
            console.warn('[OFFLINE ENFORCEMENT] Blocked external network request to:', url);
            callback({ cancel: true });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
