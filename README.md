# Sistema de Inventario de Almacén

Aplicación web para gestión de stock, ejecutada en Raspberry Pi con acceso desde cualquier dispositivo en red local.

## Estructura

```
inventario/
├── backend/          # API REST (Python + FastAPI)
│   ├── main.py       # Endpoints de la API
│   ├── database.py   # Base de datos SQLite
│   ├── schemas.py    # Modelos de datos
│   └── requirements.txt
├── frontend/         # Interfaz web (React + Tailwind)
│   └── src/
│       ├── pages/    # Proyectos, Artículos, DetalleArticulo
│       ├── components/
│       └── utils/api.js
└── scripts/
    └── install.sh    # Instalación automática en Raspberry
```

## Instalación en Raspberry Pi

```bash
# Clonar o copiar el proyecto
cd ~
git clone <repo> inventario-src
cd inventario-src

# Ejecutar instalación (una sola vez)
bash scripts/install.sh
```

El script hace automáticamente:
- Instala Python, Node.js y Chromium
- Crea entorno virtual Python con las dependencias
- Compila el frontend React
- Configura un servicio systemd para el backend
- Configura Chromium en modo kiosk para la pantalla táctil

## Desarrollo local

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (en otra terminal)
```bash
cd frontend
npm install
npm run dev   # Puerto 5173, proxy a backend en 8000
```

## Acceso

| Dispositivo | URL |
|---|---|
| Pantalla táctil (Raspberry) | http://localhost:8000 |
| Otros ordenadores en red | http://[IP-raspberry]:8000 |

Ver IP de la Raspberry: `hostname -I`

## Gestión del servicio

```bash
# Ver estado
sudo systemctl status inventario

# Ver logs en tiempo real
sudo journalctl -u inventario -f

# Reiniciar
sudo systemctl restart inventario

# Parar
sudo systemctl stop inventario
```

## Exportación a Excel

El botón de exportar está disponible en la vista de artículos de cada proyecto, en el icono discreto de descarga (↓) en la esquina superior derecha del header. Genera un archivo `.xlsx` con:
- **Hoja 1**: Inventario completo con alertas de stock mínimo
- **Hoja 2**: Historial de movimientos

## Base de datos

SQLite en `data/inventario.db`. Para hacer una copia de seguridad:
```bash
cp ~/inventario/data/inventario.db ~/inventario_backup_$(date +%Y%m%d).db
```

## Despliegue (Docker Compose y backups)

Resumen
- Este proyecto puede desplegarse en una Raspberry Pi usando `docker compose` para ejecutar el `backend` (FastAPI) y el `frontend` (nginx que sirve la compilación de Vite).
- La persistencia se consigue montando el archivo `backend/inventario.db` desde el host y, opcionalmente, un directorio `backups/` donde se escribirán los dumps.

Pasos básicos

1. Instalar Docker y Docker Compose en la Raspberry Pi.
2. Copiar el repo a la Pi (por ejemplo `/home/pi/SistemaInventario`).
3. Construir y arrancar:

```bash
cd /ruta/al/repo
docker compose build
docker compose up -d
```

Volúmenes relevantes (docker-compose.yml)
- `./data/inventario.db:/data/inventario.db` — garantiza que la base de datos SQLite se persiste en el host.
- `./backups:/backups` — directorio de backups (opcionalmente sustituible por un montaje a un NAS sobre el host).

Backups: dónde ejecutarlos y cómo almacenar en NAS

Principal recomendación: ejecutar el script de backup en el host (Raspberry), no dentro del contenedor. Razones:
- El archivo `inventario.db` está montado desde el host; hacer la copia desde el host evita inconsistencias por permisos o paths dentro del contenedor.
- Es más sencillo montar un recurso de red (NAS) en el host y dejar que `scripts/backup_db.sh` escriba directamente allí.

Flujo típico para usar un NAS

1. Monta el share del NAS en la Raspberry Pi (ejemplo con CIFS):

```bash
sudo apt update && sudo apt install -y cifs-utils
sudo mkdir -p /mnt/nas/SistemaInventario/backups
sudo mount -t cifs -o username=USER,password=PASS,uid=pi,gid=pi //NAS_IP/Share /mnt/nas/SistemaInventario/backups
```

2. Valida permisos y, si es correcto, añade una entrada en `/etc/fstab` para montar en el arranque (usa archivo de credenciales en lugar de poner la contraseña en el fstab):

```
//NAS_IP/Share /mnt/nas/SistemaInventario/backups cifs credentials=/home/pi/.nas-cred,uid=pi,gid=pi,iocharset=utf8 0 0
```

3. Ejecuta el script de backup desde el host (cron):

```cron
# Backup diario a las 02:00 en NAS
0 2 * * * BACKUP_DIR=/mnt/nas/SistemaInventario/backups /bin/bash /home/pi/SistemaInventario/scripts/backup_db.sh >> /home/pi/SistemaInventario/backups/backup.log 2>&1
```

Notas sobre contenedores y acceso a backups
- Los contenedores pueden acceder a un directorio del host si este está montado como volumen en `docker-compose.yml`. Si montas `/mnt/nas/SistemaInventario/backups` en la ruta `./backups` del repo, los contenedores verán los archivos allí.
- No es recomendable que el contenedor que corre el backend sea el responsable de programar backups del archivo SQLite que está montado desde el host; mejor delegar esa tarea al host (cron o systemd timer).

Restauración
- Se puede restaurar subiendo la DB mediante la API (`POST /api/restore`) o copiando el archivo de backup a `backend/inventario.db` en el host y reiniciando los contenedores (`docker compose restart backend`).

Consideraciones finales
- Verifica la compatibilidad de imágenes con la arquitectura ARM de la Raspberry Pi.
- Si el espacio en la tarjeta SD es crítico, monta el directorio `backups` en un disco USB o en el NAS.
- Si piensas exponer la app fuera de tu LAN, añade autenticación y HTTPS (reverse proxy con Let's Encrypt).


