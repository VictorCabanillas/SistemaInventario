#!/usr/bin/env bash
set -euo pipefail

# Script de backup con rotación y soporte para destino en NAS
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="$REPO_DIR/data/inventario.db"
DEFAULT_BACKUP_DIR="$REPO_DIR/backups"

# Allow overriding backup dir via env var BACKUP_DIR
# If not set, try an obvious NAS mount, otherwise use repo/backups
BACKUP_DIR="${BACKUP_DIR:-}"
if [ -z "$BACKUP_DIR" ]; then
  if [ -d "/mnt/nas" ] && [ -w "/mnt/nas" ]; then
    BACKUP_DIR="/mnt/nas/SistemaInventario/backups"
  else
    BACKUP_DIR="$DEFAULT_BACKUP_DIR"
  fi
fi

# Number of backups to keep (can be overridden with KEEP env var)
KEEP=${KEEP:-7}

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "Base de datos no encontrada en $DB_PATH"
  exit 1
fi

STAMP=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_DIR/inventario_$STAMP.db"
sqlite3 "$DB_PATH" ".backup '$DEST'"
echo "Backup creado: $DEST"

# Eliminar backups antiguos dejando solo los más recientes (KEEP)
ls -1t "$BACKUP_DIR"/inventario_*.db 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm --

echo "Rotación completada. Conservando $KEEP backups más recientes en $BACKUP_DIR."

