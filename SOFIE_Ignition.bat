@echo off
title S.O.F.I.E. OS : Sovereign Citizen
set ROOT_PATH=C:\Users\squat\Desktop\Terracare_Project\Terracare_Ledger
cd /d "%ROOT_PATH%"

echo [SYSTEM] Waking Intelligence Bridge (Ollama)...
:: Start Ollama in the background if not already running
tasklist | find /i "ollama.exe" >nul || start /min ollama serve

echo [SYSTEM] Sycing DNA and Pillars...
timeout /t 5 >nul

echo [SYSTEM] Awakening S.O.F.I.E. OS...
python SOFIE_Core.py

pause