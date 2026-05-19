import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "inventario.db")


def get_db():
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
            nombre TEXT NOT NULL,
            cantidad REAL NOT NULL DEFAULT 0,
            unidad TEXT DEFAULT 'ud',
            ubicacion TEXT,
            stock_minimo REAL,
            notas TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
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

    # Migración: añadir columna icono si no existe (DBs anteriores)
    try:
        cursor.execute("ALTER TABLE proyectos ADD COLUMN icono TEXT DEFAULT 'Package'")
        conn.commit()
    except Exception:
        pass

    # Seed data: categorías por defecto
    categorias_default = [
        "Tornillería", "Electrónica", "Herramientas", "Consumibles",
        "Cables y conectores", "Protección", "Materiales", "Otros"
    ]
    for cat in categorias_default:
        cursor.execute(
            "INSERT OR IGNORE INTO categorias (nombre) VALUES (?)", (cat,)
        )

    conn.commit()
    conn.close()
    print(f"Base de datos inicializada en {DB_PATH}")


if __name__ == "__main__":
    init_db()
