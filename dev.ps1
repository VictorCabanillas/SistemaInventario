# dev.ps1 — Arranca backend y frontend para desarrollo local (Windows)
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

$backendCmd  = "& '$root\backend\venv\Scripts\uvicorn.exe' main:app --reload --port 8000 --app-dir '$root\backend'"
$frontendCmd = "Set-Location '$root\frontend'; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Servidores arrancando..."
Write-Host "  Backend  -> http://localhost:8000"
Write-Host "  Frontend -> http://localhost:5173"
Write-Host ""
