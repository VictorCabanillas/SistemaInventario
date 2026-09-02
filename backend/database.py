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


def _column_exists(cursor, table, column):
    cols = cursor.execute(f"PRAGMA table_info({table})").fetchall()
    return any(c["name"] == column for c in cols)


def _table_exists(cursor, table):
    return cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone() is not None


def _migrar_catalogo_y_stock(conn, cursor):
    """
    Migra instalaciones antiguas donde `articulos` guardaba proyecto_id y
    cantidad directamente, al modelo nuevo: `articulos` como catálogo global
    (nombre+marca+referencia) y `stock` con las existencias por proyecto.
    Idempotente: solo actúa si detecta el esquema viejo.
    """
    if not _column_exists(cursor, "articulos", "proyecto_id"):
        return

    conn.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("ALTER TABLE articulos RENAME TO articulos_old")
    cursor.execute("ALTER TABLE movimientos RENAME TO movimientos_old")
    conn.commit()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS articulos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            marca TEXT NOT NULL DEFAULT '',
            referencia TEXT NOT NULL DEFAULT '',
            categoria_id INTEGER,
            unidad TEXT DEFAULT 'ud',
            stock_minimo REAL,
            sala_id INTEGER,
            ubicacion TEXT,
            notas TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL,
            UNIQUE (nombre, marca, referencia)
        );

        CREATE TABLE IF NOT EXISTS stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            proyecto_id INTEGER NOT NULL,
            cantidad REAL NOT NULL DEFAULT 0,
            stock_minimo REAL,
            sala_id INTEGER,
            ubicacion TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL,
            UNIQUE (articulo_id, proyecto_id)
        );

        CREATE TABLE IF NOT EXISTS movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'transferencia')),
            cantidad REAL NOT NULL,
            motivo TEXT,
            operador TEXT NOT NULL,
            proyecto_id INTEGER,
            proyecto_origen_id INTEGER,
            proyecto_destino_id INTEGER,
            fecha TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE SET NULL,
            FOREIGN KEY (proyecto_origen_id) REFERENCES proyectos(id) ON DELETE SET NULL,
            FOREIGN KEY (proyecto_destino_id) REFERENCES proyectos(id) ON DELETE SET NULL
        );
    """)

    # El nombre no es único en el esquema viejo: marca/referencia quedan vacías
    # (se preservan los ids para no romper las referencias de movimientos).
    cursor.execute("""
        INSERT INTO articulos (id, nombre, marca, referencia, categoria_id, unidad,
                                stock_minimo, sala_id, ubicacion, notas, created_at, updated_at)
        SELECT id, nombre, '', '', categoria_id, unidad,
               stock_minimo, sala_id, ubicacion, notas, created_at, updated_at
        FROM articulos_old
    """)

    cursor.execute("""
        INSERT INTO stock (articulo_id, proyecto_id, cantidad, created_at, updated_at)
        SELECT id, proyecto_id, cantidad, created_at, updated_at
        FROM articulos_old
    """)

    cursor.execute("""
        INSERT INTO movimientos (id, articulo_id, tipo, cantidad, motivo, operador, fecha, proyecto_id)
        SELECT m.id, m.articulo_id, m.tipo, m.cantidad, m.motivo, m.operador, m.fecha, a.proyecto_id
        FROM movimientos_old m
        JOIN articulos_old a ON a.id = m.articulo_id
    """)

    # Evita colisiones de AUTOINCREMENT con los ids preservados en la copia.
    for tabla in ("articulos", "movimientos"):
        cursor.execute(
            "INSERT OR REPLACE INTO sqlite_sequence (name, seq) "
            f"VALUES (?, (SELECT COALESCE(MAX(id), 0) FROM {tabla}))",
            (tabla,)
        )

    cursor.execute("DROP TABLE articulos_old")
    cursor.execute("DROP TABLE movimientos_old")
    conn.commit()
    conn.execute("PRAGMA foreign_keys = ON")
    print("Migración de esquema completada: catálogo de artículos + stock por proyecto.")


def _migrar_stock_baja(conn, cursor):
    """
    Permite varias filas de stock por articulo_id+proyecto_id (una por
    ubicación/estado): añade `estado` ('ok'/'baja') a `stock`, quita
    `stock_minimo` de `stock` (pasa a vivir solo en `articulos`, es un valor
    único por artículo), sustituye el UNIQUE(articulo_id, proyecto_id) por un
    índice de expresión que incluye ubicación normalizada, y añade 'baja' y
    'reparacion' al CHECK de movimientos.tipo.
    Idempotente: si `stock` no existe (instalación nueva, la crea el
    executescript de abajo con el esquema final) o ya tiene la columna
    `estado`, no hace nada.
    """
    if not _table_exists(cursor, "stock") or _column_exists(cursor, "stock", "estado"):
        return

    conn.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("ALTER TABLE stock RENAME TO stock_old")
    cursor.execute("ALTER TABLE movimientos RENAME TO movimientos_old")
    conn.commit()

    cursor.executescript("""
        CREATE TABLE stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            proyecto_id INTEGER NOT NULL,
            cantidad REAL NOT NULL DEFAULT 0,
            sala_id INTEGER,
            ubicacion TEXT,
            estado TEXT NOT NULL DEFAULT 'ok' CHECK(estado IN ('ok', 'baja')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL
        );
        CREATE UNIQUE INDEX ux_stock_articulo_proyecto_ubicacion_estado
            ON stock(articulo_id, proyecto_id, COALESCE(ubicacion, ''), estado);

        CREATE TABLE movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'transferencia', 'baja', 'reparacion')),
            cantidad REAL NOT NULL,
            motivo TEXT,
            operador TEXT NOT NULL,
            proyecto_id INTEGER,
            proyecto_origen_id INTEGER,
            proyecto_destino_id INTEGER,
            fecha TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE SET NULL,
            FOREIGN KEY (proyecto_origen_id) REFERENCES proyectos(id) ON DELETE SET NULL,
            FOREIGN KEY (proyecto_destino_id) REFERENCES proyectos(id) ON DELETE SET NULL
        );
    """)

    cursor.execute("""
        INSERT INTO stock (id, articulo_id, proyecto_id, cantidad, sala_id, ubicacion,
                            estado, created_at, updated_at)
        SELECT id, articulo_id, proyecto_id, cantidad, sala_id, ubicacion,
               'ok', created_at, updated_at
        FROM stock_old
    """)
    cursor.execute("""
        INSERT INTO movimientos (id, articulo_id, tipo, cantidad, motivo, operador,
                                  proyecto_id, proyecto_origen_id, proyecto_destino_id, fecha)
        SELECT id, articulo_id, tipo, cantidad, motivo, operador,
               proyecto_id, proyecto_origen_id, proyecto_destino_id, fecha
        FROM movimientos_old
    """)

    for tabla in ("stock", "movimientos"):
        cursor.execute(
            "INSERT OR REPLACE INTO sqlite_sequence (name, seq) "
            f"VALUES (?, (SELECT COALESCE(MAX(id), 0) FROM {tabla}))",
            (tabla,)
        )

    cursor.execute("DROP TABLE stock_old")
    cursor.execute("DROP TABLE movimientos_old")
    conn.commit()
    conn.execute("PRAGMA foreign_keys = ON")
    print("Migración de esquema completada: stock por ubicación/estado + bajas.")


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Deben ejecutarse antes del executescript: renombran las tablas viejas
    # para que los CREATE TABLE IF NOT EXISTS de abajo creen el esquema nuevo.
    _migrar_catalogo_y_stock(conn, cursor)
    _migrar_stock_baja(conn, cursor)

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
            es_almacen INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS articulos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            marca TEXT NOT NULL DEFAULT '',
            referencia TEXT NOT NULL DEFAULT '',
            categoria_id INTEGER,
            unidad TEXT DEFAULT 'ud',
            stock_minimo REAL,
            sala_id INTEGER,
            ubicacion TEXT,
            notas TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL,
            UNIQUE (nombre, marca, referencia)
        );

        CREATE TABLE IF NOT EXISTS stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            proyecto_id INTEGER NOT NULL,
            cantidad REAL NOT NULL DEFAULT 0,
            sala_id INTEGER,
            ubicacion TEXT,
            estado TEXT NOT NULL DEFAULT 'ok' CHECK(estado IN ('ok', 'baja')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_articulo_proyecto_ubicacion_estado
            ON stock(articulo_id, proyecto_id, COALESCE(ubicacion, ''), estado);

        CREATE TABLE IF NOT EXISTS movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'transferencia', 'baja', 'reparacion')),
            cantidad REAL NOT NULL,
            motivo TEXT,
            operador TEXT NOT NULL,
            proyecto_id INTEGER,
            proyecto_origen_id INTEGER,
            proyecto_destino_id INTEGER,
            fecha TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE SET NULL,
            FOREIGN KEY (proyecto_origen_id) REFERENCES proyectos(id) ON DELETE SET NULL,
            FOREIGN KEY (proyecto_destino_id) REFERENCES proyectos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS articulo_imagenes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articulo_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE
        );
    """)

    # Migraciones para DBs anteriores a esta versión (columnas añadidas con el tiempo)
    migraciones = [
        "ALTER TABLE proyectos ADD COLUMN icono TEXT DEFAULT 'Package'",
        "ALTER TABLE proyectos ADD COLUMN es_almacen INTEGER NOT NULL DEFAULT 0",
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

    # Seed: proyecto "Almacén general" (destino por defecto de los artículos nuevos)
    almacen = cursor.execute("SELECT id FROM proyectos WHERE es_almacen = 1").fetchone()
    if not almacen:
        cursor.execute(
            "INSERT INTO proyectos (nombre, descripcion, color, icono, es_almacen) VALUES (?,?,?,?,1)",
            ("Almacén general", "Stock sin asignar todavía a un proyecto concreto", "#6B7280", "Archive")
        )

    conn.commit()
    conn.close()
    print(f"Base de datos inicializada en {DB_PATH}")


if __name__ == "__main__":
    init_db()
