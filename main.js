// C:\Users\squat\Desktop\Terracare_Project\Terracare_Ledger\main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createHighFidelityHUD() {
    const mainWindow = new BrowserWindow({
        title: 'S.O.F.I.E. OS - Sovereign Citizen HUD',
        width: 1920, // Setting standard high-definition resolution
        height: 1080,
        frame: false, // Disabling brown terminal frame for high-fidelity immersion
        transparent: true, // Crucial for holographic overlay effect
        alwaysOnTop: true, // Operating as the sovereign primary layer
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Loading the Sovereign Visual Manifest
    mainWindow.loadFile('index.html');
    
    // Maximizing to full screen with proper scaling for multi-monitor depth
    mainWindow.maximize();
}

app.whenReady().then(() => {
    createHighFidelityHUD();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createHighFidelityHUD();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});