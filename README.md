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

SQLite en `backend/inventario.db`. Para hacer una copia de seguridad:
```bash
cp ~/inventario/backend/inventario.db ~/inventario_backup_$(date +%Y%m%d).db
```
