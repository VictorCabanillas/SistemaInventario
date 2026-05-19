#!/bin/bash
# Script de instalación completa para Raspberry Pi
# Ejecutar con: bash install.sh

set -e
INSTALL_DIR="$HOME/inventario"
SERVICE_NAME="inventario"

echo "========================================"
echo "  Instalación: Sistema de Inventario"
echo "========================================"

# 1. Dependencias del sistema
echo ""
echo ">> Actualizando paquetes del sistema..."
sudo apt-get update -q
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm chromium-browser

# 2. Estructura del proyecto
echo ""
echo ">> Preparando directorio..."
mkdir -p "$INSTALL_DIR"
cp -r backend "$INSTALL_DIR/"
cp -r frontend "$INSTALL_DIR/"
cp -r scripts "$INSTALL_DIR/"

# 3. Entorno virtual Python
echo ""
echo ">> Instalando dependencias Python..."
cd "$INSTALL_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

# 4. Frontend
echo ""
echo ">> Instalando y compilando frontend..."
cd "$INSTALL_DIR/frontend"
npm install --silent
npm run build

echo ""
echo ">> Build del frontend completado."

# 5. Servicio systemd del backend
echo ""
echo ">> Configurando servicio systemd..."

sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Inventario Almacen Backend
After=network.target

[Service]
User=$USER
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

echo ">> Servicio backend activo."

# 6. Autostart Chromium en modo kiosk (pantalla táctil)
echo ""
echo ">> Configurando kiosk en pantalla táctil..."

mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/inventario-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Inventario Kiosk
Exec=bash -c 'sleep 5 && chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run http://localhost:8000'
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

echo ">> Kiosk configurado. Se abrirá al reiniciar."

# 7. Obtener IP local
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================"
echo "  Instalación completada!"
echo "========================================"
echo ""
echo "  Acceso local (Raspberry):  http://localhost:8000"
echo "  Acceso en red:             http://${IP}:8000"
echo ""
echo "  Comandos útiles:"
echo "  Ver logs:    sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Reiniciar:   sudo systemctl restart ${SERVICE_NAME}"
echo "  Estado:      sudo systemctl status ${SERVICE_NAME}"
echo ""
