# dev.ps1 — Prepara (si hace falta) y arranca backend y frontend para desarrollo local (Windows)
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# El backend guarda la base de datos en /data, que Python resuelve como la raiz del drive actual (normalmente C:\data)
$dataDir = Join-Path $env:SystemDrive "data"
if (-not (Test-Path $dataDir)) {
    Write-Host "Creando $dataDir..."
    try {
        New-Item -ItemType Directory -Path $dataDir -Force -ErrorAction Stop | Out-Null
    } catch {
        Write-Host "No se pudo crear $dataDir. Ejecuta esta ventana como Administrador o crealo manualmente."
        exit 1
    }
}

$venvPython = Join-Path $root "backend\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Creando entorno virtual del backend e instalando dependencias..."
    python -m venv "$root\backend\venv"
    & "$root\backend\venv\Scripts\pip.exe" install --quiet --upgrade pip
    & "$root\backend\venv\Scripts\pip.exe" install --quiet -r "$root\backend\requirements.txt"
}

if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "Instalando dependencias del frontend..."
    Push-Location "$root\frontend"
    npm install
    Pop-Location
}

$backendCmd  = "& '$root\backend\venv\Scripts\uvicorn.exe' main:app --reload --port 8000 --app-dir '$root\backend'"
$frontendCmd = "Set-Location '$root\frontend'; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Servidores arrancando..."
Write-Host "  Backend  -> http://localhost:8000"
Write-Host "  Frontend -> http://localhost:5173"
Write-Host ""
