@echo off
title S.O.F.I.E. OS : Sovereign Citizen Ignition
set ROOT_PATH=C:\Users\squat\Desktop\Terracare_Project\Terracare_Ledger
cd /d "%ROOT_PATH%"

echo [SYSTEM] Waking Intelligence Bridge (Ollama)...
:: This starts the AI engine in the background
tasklist | find /i "ollama.exe" >nul || start /min ollama serve

echo [SYSTEM] Syncing DNA and Pillars...
timeout /t 5 >nul

echo [SYSTEM] Awakening S.O.F.I.E. Core (The Brain)...
:: 'start /b' runs the Python brain in the SAME window or background
:: This allows it to serve data to the HUD
start /min python SOFIE_Core.py

echo [SYSTEM] Stabilization Buffer...
timeout /t 3 >nul

echo [SYSTEM] Manifesting High-Fidelity HUD (The Eyes)...
:: This launches the Electron GUI you just built
npm start

pause