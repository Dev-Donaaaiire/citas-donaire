@echo off
chcp 65001 >nul
rem Actualiza a la ultima version publicada y la sube a tu repositorio.
cd /d "%~dp0.."
node scripts\update.mjs --push
pause
