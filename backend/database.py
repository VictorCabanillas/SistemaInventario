import sqlite3
import os

DB_DIR = "/data"
DB_PATH = os.path.join(DB_DIR, "inventario.db")


def _ensure_db_file():
    os.makedirs(DB_DIR, exist_ok=True)

    if os.path.isdir(DB_PATH):
        raise RuntimeError(
            f"{DB_PATH} es un directorio; debería ser un archivo SQLite."
        )

    if not os.path.exists(DB_PATH):
        open(DB_PATH, "a").close()


def get_db():
    _ensure_db_file()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS salas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS operadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS proyectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            color TEXT DEFAULT '#3B82F6',
            icono TEXT DEFAULT 'Package',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS articulos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proyecto_id INTEGER NOT NULL,
            categoria_id INTEGER,
            sala_id INTEGER,
            nombre TEXT NOT NULL,
            cantidad REAL NOT NULL DEFAULT 0,
            unidad TEXT DEFAULT 'ud',
            ubicacion TEXT,
            stock_minimo REAL,
            notas TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
            cantidad REAL NOT NULL,
            motivo TEXT,
            operador TEXT NOT NULL,
            fecha TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE
        );
    """)

    # Migraciones para DBs anteriores
    migraciones = [
        "ALTER TABLE proyectos ADD COLUMN icono TEXT DEFAULT 'Package'",
        "ALTER TABLE articulos ADD COLUMN sala_id INTEGER REFERENCES salas(id) ON DELETE SET NULL",
    ]
    for sql in migraciones:
        try:
            cursor.execute(sql)
            conn.commit()
        except Exception:
            pass

    # Seed: categorías por defecto
    for cat in ["Tornillería", "Electrónica", "Herramientas", "Consumibles",
                "Cables y conectores", "Protección", "Materiales", "Otros"]:
        cursor.execute("INSERT OR IGNORE INTO categorias (nombre) VALUES (?)", (cat,))

    # Seed: salas por defecto
    for sala in ["1 Departamento Ingeniería", "2 Taller", "3 Sala Impresoras"]:
        cursor.execute("INSERT OR IGNORE INTO salas (nombre) VALUES (?)", (sala,))

    conn.commit()
    conn.close()
    print(f"Base de datos inicializada en {DB_PATH}")


if __name__ == "__main__":
    init_db()
