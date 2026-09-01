#!/usr/bin/env bash
# dev.sh — Prepara (si hace falta) y arranca backend y frontend para desarrollo local (Linux/macOS)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v python3 >/dev/null || { echo "Necesitas python3 instalado."; exit 1; }
command -v npm >/dev/null || { echo "Necesitas Node.js/npm instalado."; exit 1; }

# El backend guarda la base de datos en /data (misma ruta que usa dentro del contenedor)
if [ ! -d /data ] || [ ! -w /data ]; then
  echo "Creando /data (puede pedir tu contraseña de sudo la primera vez)..."
  if ! sudo mkdir -p /data || ! sudo chown "$USER":"$USER" /data; then
    echo "No se pudo crear /data. Créalo manualmente con:"
    echo "  sudo mkdir -p /data && sudo chown \$USER:\$USER /data"
    exit 1
  fi
fi

if [ ! -x "$ROOT/backend/venv/bin/uvicorn" ]; then
  echo "Creando entorno virtual del backend e instalando dependencias..."
  python3 -m venv "$ROOT/backend/venv"
  "$ROOT/backend/venv/bin/pip" install --quiet --upgrade pip
  "$ROOT/backend/venv/bin/pip" install --quiet -r "$ROOT/backend/requirements.txt"
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Instalando dependencias del frontend..."
  (cd "$ROOT/frontend" && npm install)
fi

cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo "Deteniendo servidores..."
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(cd "$ROOT/backend" && venv/bin/uvicorn main:app --reload --port 8000) &
(cd "$ROOT/frontend" && npm run dev) &

echo ""
echo "Servidores arrancando..."
echo "  Backend  -> http://localhost:8000"
echo "  Frontend -> http://localhost:5173"
echo ""
echo "Pulsa Ctrl+C para detener ambos."

wait
