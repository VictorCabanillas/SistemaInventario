from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
import os
import io
import shutil
import sqlite3
import tempfile

ICONOS_DIR = os.path.join(os.path.dirname(__file__), "iconos")

from database import get_db, init_db, DB_PATH
from schemas import (
    Categoria, CategoriaCreate,
    Sala, SalaCreate,
    Operador, OperadorCreate,
    Proyecto, ProyectoCreate, ProyectoUpdate,
    Articulo, ArticuloCreate, ArticuloUpdate,
    Movimiento, MovimientoCreate,
    ResultadoBusqueda
)

app = FastAPI(title="Inventario Almacén", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar DB al arrancar
@app.on_event("startup")
def startup():
    init_db()


# ─────────────────────────────────────────
# ICONOS PERSONALIZADOS
# ─────────────────────────────────────────

ICONOS_MIME = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

@app.get("/api/iconos")
def get_iconos():
    os.makedirs(ICONOS_DIR, exist_ok=True)
    return sorted(
        f for f in os.listdir(ICONOS_DIR)
        if os.path.splitext(f)[1].lower() in ICONOS_MIME
    )

@app.get("/api/iconos/{filename}")
def get_icono(filename: str):
    if "/" in filename or "\\" in filename:
        raise HTTPException(400, "Nombre de archivo inválido")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ICONOS_MIME:
        raise HTTPException(400, "Tipo de archivo no permitido")
    path = os.path.join(ICONOS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Icono no encontrado")
    return FileResponse(path, media_type=ICONOS_MIME[ext])


# ─────────────────────────────────────────
# CATEGORÍAS
# ─────────────────────────────────────────

@app.get("/api/categorias", response_model=List[Categoria])
def get_categorias():
    db = get_db()
    rows = db.execute("SELECT id, nombre FROM categorias ORDER BY nombre").fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/categorias", response_model=Categoria, status_code=201)
def create_categoria(data: CategoriaCreate):
    db = get_db()
    try:
        cur = db.execute("INSERT INTO categorias (nombre) VALUES (?)", (data.nombre,))
        db.commit()
        row = db.execute("SELECT id, nombre FROM categorias WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)
    except Exception as e:
        raise HTTPException(400, f"Categoría ya existe: {e}")
    finally:
        db.close()

@app.delete("/api/categorias/{id}", status_code=204)
def delete_categoria(id: int):
    db = get_db()
    db.execute("DELETE FROM categorias WHERE id=?", (id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# SALAS
# ─────────────────────────────────────────

@app.get("/api/salas", response_model=List[Sala])
def get_salas():
    db = get_db()
    rows = db.execute("SELECT id, nombre FROM salas ORDER BY nombre").fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/salas", response_model=Sala, status_code=201)
def create_sala(data: SalaCreate):
    db = get_db()
    try:
        cur = db.execute("INSERT INTO salas (nombre) VALUES (?)", (data.nombre,))
        db.commit()
        row = db.execute("SELECT id, nombre FROM salas WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)
    except Exception as e:
        raise HTTPException(400, f"La sala ya existe: {e}")
    finally:
        db.close()

@app.delete("/api/salas/{id}", status_code=204)
def delete_sala(id: int):
    db = get_db()
    db.execute("DELETE FROM salas WHERE id=?", (id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# OPERADORES
# ─────────────────────────────────────────

@app.get("/api/operadores", response_model=List[Operador])
def get_operadores():
    db = get_db()
    rows = db.execute("SELECT id, nombre FROM operadores ORDER BY nombre").fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/operadores", response_model=Operador, status_code=201)
def create_operador(data: OperadorCreate):
    db = get_db()
    try:
        cur = db.execute("INSERT INTO operadores (nombre) VALUES (?)", (data.nombre,))
        db.commit()
        row = db.execute("SELECT id, nombre FROM operadores WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)
    except Exception as e:
        raise HTTPException(400, f"El operador ya existe: {e}")
    finally:
        db.close()

@app.delete("/api/operadores/{id}", status_code=204)
def delete_operador(id: int):
    db = get_db()
    db.execute("DELETE FROM operadores WHERE id=?", (id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# PROYECTOS
# ─────────────────────────────────────────

PROYECTO_SELECT = """
    SELECT p.*,
           COUNT(s.id) as total_articulos,
           SUM(CASE WHEN COALESCE(s.stock_minimo, a.stock_minimo) IS NOT NULL
                         AND s.cantidad < COALESCE(s.stock_minimo, a.stock_minimo)
                    THEN 1 ELSE 0 END) as articulos_bajo_minimo
    FROM proyectos p
    LEFT JOIN stock s ON s.proyecto_id = p.id
    LEFT JOIN articulos a ON a.id = s.articulo_id
"""

@app.get("/api/proyectos", response_model=List[Proyecto])
def get_proyectos():
    db = get_db()
    rows = db.execute(PROYECTO_SELECT + "GROUP BY p.id ORDER BY p.nombre").fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/proyectos", response_model=Proyecto, status_code=201)
def create_proyecto(data: ProyectoCreate):
    db = get_db()
    cur = db.execute(
        "INSERT INTO proyectos (nombre, descripcion, color, icono) VALUES (?,?,?,?)",
        (data.nombre, data.descripcion, data.color, data.icono)
    )
    db.commit()
    row = db.execute("""
        SELECT p.*, 0 as total_articulos, 0 as articulos_bajo_minimo
        FROM proyectos p WHERE p.id=?
    """, (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)

@app.put("/api/proyectos/{id}", response_model=Proyecto)
def update_proyecto(id: int, data: ProyectoUpdate):
    db = get_db()
    fields = {k: v for k, v in data.dict().items() if v is not None}
    if fields:
        sets = ", ".join(f"{k}=?" for k in fields)
        db.execute(f"UPDATE proyectos SET {sets} WHERE id=?", (*fields.values(), id))
        db.commit()
    row = db.execute(PROYECTO_SELECT + "WHERE p.id=? GROUP BY p.id", (id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Proyecto no encontrado")
    return dict(row)

@app.delete("/api/proyectos/{id}", status_code=204)
def delete_proyecto(id: int):
    db = get_db()
    row = db.execute("SELECT es_almacen FROM proyectos WHERE id=?", (id,)).fetchone()
    if row and row["es_almacen"]:
        db.close()
        raise HTTPException(400, "No se puede eliminar el proyecto Almacén general")
    db.execute("DELETE FROM proyectos WHERE id=?", (id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# ARTÍCULOS
#
# `articulos` es el catálogo global (único por nombre+marca+referencia).
# `stock` guarda las existencias de un artículo en un proyecto concreto.
# Estos endpoints devuelven ambas cosas fusionadas: la vista que usa el
# frontend es "el artículo, con la cantidad/ubicación/mínimo de ESTE proyecto".
# ─────────────────────────────────────────

ARTICULO_SELECT = """
    SELECT
        a.id AS id,
        s.id AS stock_id,
        s.proyecto_id AS proyecto_id,
        p.nombre AS proyecto_nombre,
        p.color AS proyecto_color,
        a.nombre AS nombre,
        a.marca AS marca,
        a.referencia AS referencia,
        a.categoria_id AS categoria_id,
        c.nombre AS categoria_nombre,
        COALESCE(s.sala_id, a.sala_id) AS sala_id,
        sal.nombre AS sala_nombre,
        s.cantidad AS cantidad,
        a.unidad AS unidad,
        COALESCE(s.ubicacion, a.ubicacion) AS ubicacion,
        COALESCE(s.stock_minimo, a.stock_minimo) AS stock_minimo,
        a.notas AS notas,
        CASE WHEN COALESCE(s.stock_minimo, a.stock_minimo) IS NOT NULL
                  AND s.cantidad < COALESCE(s.stock_minimo, a.stock_minimo)
             THEN 1 ELSE 0 END AS bajo_minimo,
        s.created_at AS created_at,
        s.updated_at AS updated_at
    FROM stock s
    JOIN articulos a ON a.id = s.articulo_id
    JOIN proyectos p ON p.id = s.proyecto_id
    LEFT JOIN categorias c ON c.id = a.categoria_id
    LEFT JOIN salas sal ON sal.id = COALESCE(s.sala_id, a.sala_id)
"""

CAMPOS_CATALOGO = {"nombre", "marca", "referencia", "categoria_id", "unidad", "notas"}
CAMPOS_STOCK = {"sala_id", "ubicacion", "stock_minimo"}


@app.get("/api/articulos", response_model=List[Articulo])
def get_todos_articulos():
    """Todas las filas de stock, de todos los proyectos (vista del Almacén general)."""
    db = get_db()
    rows = db.execute(ARTICULO_SELECT + "ORDER BY a.nombre").fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.get("/api/proyectos/{proyecto_id}/articulos", response_model=List[Articulo])
def get_articulos(proyecto_id: int):
    db = get_db()
    rows = db.execute(ARTICULO_SELECT + "WHERE s.proyecto_id = ? ORDER BY a.nombre", (proyecto_id,)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.get("/api/proyectos/{proyecto_id}/articulos/{articulo_id}", response_model=Articulo)
def get_articulo(proyecto_id: int, articulo_id: int):
    db = get_db()
    row = db.execute(ARTICULO_SELECT + "WHERE s.proyecto_id = ? AND a.id = ?", (proyecto_id, articulo_id)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Artículo no encontrado en este proyecto")
    return dict(row)

@app.get("/api/articulos/{articulo_id}/stock", response_model=List[Articulo])
def get_stock_por_proyecto(articulo_id: int):
    """Todas las filas de stock de un artículo del catálogo, en cualquier proyecto."""
    db = get_db()
    rows = db.execute(ARTICULO_SELECT + "WHERE a.id = ? ORDER BY p.nombre", (articulo_id,)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.get("/api/alertas", response_model=List[Articulo])
def get_alertas():
    """Todas las filas de stock, de cualquier proyecto, por debajo de su mínimo."""
    db = get_db()
    rows = db.execute(ARTICULO_SELECT + """
        WHERE COALESCE(s.stock_minimo, a.stock_minimo) IS NOT NULL
          AND s.cantidad < COALESCE(s.stock_minimo, a.stock_minimo)
        ORDER BY a.nombre
    """).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/articulos", response_model=Articulo, status_code=201)
def create_articulo(data: ArticuloCreate):
    db = get_db()
    try:
        if data.proyecto_id is not None:
            proyecto = db.execute("SELECT id FROM proyectos WHERE id=?", (data.proyecto_id,)).fetchone()
            if not proyecto:
                raise HTTPException(404, "Proyecto no encontrado")
            proyecto_id = data.proyecto_id
        else:
            almacen = db.execute("SELECT id FROM proyectos WHERE es_almacen = 1").fetchone()
            if not almacen:
                raise HTTPException(500, "No existe un proyecto Almacén general")
            proyecto_id = almacen["id"]

        marca = data.marca or ""
        referencia = data.referencia or ""

        articulo = db.execute(
            "SELECT id FROM articulos WHERE nombre=? AND marca=? AND referencia=?",
            (data.nombre, marca, referencia)
        ).fetchone()

        if articulo:
            articulo_id = articulo["id"]
        else:
            cur = db.execute("""
                INSERT INTO articulos (nombre, marca, referencia, categoria_id, unidad, stock_minimo, sala_id, ubicacion, notas)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (data.nombre, marca, referencia, data.categoria_id, data.unidad,
                  data.stock_minimo, data.sala_id, data.ubicacion, data.notas))
            articulo_id = cur.lastrowid

        stock = db.execute(
            "SELECT id FROM stock WHERE articulo_id=? AND proyecto_id=?",
            (articulo_id, proyecto_id)
        ).fetchone()

        if stock:
            db.execute(
                "UPDATE stock SET cantidad = cantidad + ?, updated_at=datetime('now') WHERE id=?",
                (data.cantidad, stock["id"])
            )
            stock_id = stock["id"]
        else:
            cur = db.execute(
                "INSERT INTO stock (articulo_id, proyecto_id, cantidad) VALUES (?,?,?)",
                (articulo_id, proyecto_id, data.cantidad)
            )
            stock_id = cur.lastrowid

        if data.cantidad and data.cantidad > 0:
            db.execute("""
                INSERT INTO movimientos (articulo_id, tipo, cantidad, motivo, operador, proyecto_id)
                VALUES (?, 'entrada', ?, 'Alta inicial', 'Sistema', ?)
            """, (articulo_id, data.cantidad, proyecto_id))

        db.commit()
        row = db.execute(ARTICULO_SELECT + "WHERE s.id = ?", (stock_id,)).fetchone()
        return dict(row)
    except sqlite3.IntegrityError as e:
        raise HTTPException(400, f"No se pudo crear el artículo: {e}")
    finally:
        db.close()

@app.put("/api/articulos/{id}", response_model=Articulo)
def update_articulo(id: int, proyecto_id: int, data: ArticuloUpdate):
    db = get_db()
    fields = {k: v for k, v in data.dict().items() if v is not None}
    catalogo_fields = {k: v for k, v in fields.items() if k in CAMPOS_CATALOGO}
    stock_fields = {k: v for k, v in fields.items() if k in CAMPOS_STOCK}

    try:
        if catalogo_fields:
            sets = ", ".join(f"{k}=?" for k in catalogo_fields)
            sets += ", updated_at=datetime('now')"
            db.execute(f"UPDATE articulos SET {sets} WHERE id=?", (*catalogo_fields.values(), id))

        if stock_fields:
            sets = ", ".join(f"{k}=?" for k in stock_fields)
            sets += ", updated_at=datetime('now')"
            db.execute(f"UPDATE stock SET {sets} WHERE articulo_id=? AND proyecto_id=?",
                       (*stock_fields.values(), id, proyecto_id))

        db.commit()
    except sqlite3.IntegrityError as e:
        raise HTTPException(400, f"No se pudo actualizar: {e}")

    row = db.execute(ARTICULO_SELECT + "WHERE a.id = ? AND s.proyecto_id = ?", (id, proyecto_id)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Artículo no encontrado")
    return dict(row)

@app.delete("/api/proyectos/{proyecto_id}/articulos/{articulo_id}", status_code=204)
def delete_articulo(proyecto_id: int, articulo_id: int):
    db = get_db()
    db.execute("DELETE FROM stock WHERE articulo_id=? AND proyecto_id=?", (articulo_id, proyecto_id))
    otros = db.execute("SELECT COUNT(*) as n FROM stock WHERE articulo_id=?", (articulo_id,)).fetchone()
    if otros["n"] == 0:
        db.execute("DELETE FROM articulos WHERE id=?", (articulo_id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# MOVIMIENTOS DE STOCK
# ─────────────────────────────────────────

MOVIMIENTO_SELECT = """
    SELECT m.*, a.nombre as articulo_nombre,
           po.nombre as proyecto_nombre,
           porig.nombre as proyecto_origen_nombre,
           pdest.nombre as proyecto_destino_nombre
    FROM movimientos m
    JOIN articulos a ON a.id = m.articulo_id
    LEFT JOIN proyectos po ON po.id = m.proyecto_id
    LEFT JOIN proyectos porig ON porig.id = m.proyecto_origen_id
    LEFT JOIN proyectos pdest ON pdest.id = m.proyecto_destino_id
"""

@app.get("/api/articulos/{articulo_id}/movimientos", response_model=List[Movimiento])
def get_movimientos(articulo_id: int, limit: int = 50):
    db = get_db()
    rows = db.execute(
        MOVIMIENTO_SELECT + "WHERE m.articulo_id = ? ORDER BY m.fecha DESC LIMIT ?",
        (articulo_id, limit)
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.get("/api/movimientos", response_model=List[Movimiento])
def get_all_movimientos(limit: int = 100):
    db = get_db()
    rows = db.execute(MOVIMIENTO_SELECT + "ORDER BY m.fecha DESC LIMIT ?", (limit,)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/movimientos", response_model=Articulo, status_code=201)
def create_movimiento(data: MovimientoCreate):
    db = get_db()
    try:
        if data.tipo == "transferencia":
            if not (data.articulo_id and data.proyecto_origen_id and data.proyecto_destino_id):
                raise HTTPException(400, "La transferencia requiere articulo_id, proyecto_origen_id y proyecto_destino_id")
            if data.proyecto_origen_id == data.proyecto_destino_id:
                raise HTTPException(400, "El proyecto de origen y el de destino deben ser distintos")

            origen = db.execute(
                "SELECT * FROM stock WHERE articulo_id=? AND proyecto_id=?",
                (data.articulo_id, data.proyecto_origen_id)
            ).fetchone()
            disponible = origen["cantidad"] if origen else 0
            if not origen or origen["cantidad"] < data.cantidad:
                raise HTTPException(400, f"Stock insuficiente en el proyecto de origen. Disponible: {disponible}")

            destino = db.execute(
                "SELECT * FROM stock WHERE articulo_id=? AND proyecto_id=?",
                (data.articulo_id, data.proyecto_destino_id)
            ).fetchone()

            db.execute(
                "UPDATE stock SET cantidad = cantidad - ?, updated_at=datetime('now') WHERE id=?",
                (data.cantidad, origen["id"])
            )
            if destino:
                db.execute(
                    "UPDATE stock SET cantidad = cantidad + ?, updated_at=datetime('now') WHERE id=?",
                    (data.cantidad, destino["id"])
                )
            else:
                db.execute(
                    "INSERT INTO stock (articulo_id, proyecto_id, cantidad) VALUES (?,?,?)",
                    (data.articulo_id, data.proyecto_destino_id, data.cantidad)
                )

            db.execute("""
                INSERT INTO movimientos (articulo_id, tipo, cantidad, motivo, operador, proyecto_origen_id, proyecto_destino_id)
                VALUES (?, 'transferencia', ?, ?, ?, ?, ?)
            """, (data.articulo_id, data.cantidad, data.motivo, data.operador,
                  data.proyecto_origen_id, data.proyecto_destino_id))

            db.commit()
            row = db.execute(ARTICULO_SELECT + "WHERE s.id = ?", (origen["id"],)).fetchone()
            return dict(row)

        # entrada / salida
        if not data.stock_id:
            raise HTTPException(400, "El movimiento de entrada/salida requiere stock_id")

        stock = db.execute("SELECT * FROM stock WHERE id=?", (data.stock_id,)).fetchone()
        if not stock:
            raise HTTPException(404, "Stock no encontrado")

        nueva_cantidad = stock["cantidad"] + data.cantidad if data.tipo == "entrada" else stock["cantidad"] - data.cantidad
        if nueva_cantidad < 0:
            raise HTTPException(400, f"Stock insuficiente. Stock actual: {stock['cantidad']}")

        db.execute("""
            INSERT INTO movimientos (articulo_id, tipo, cantidad, motivo, operador, proyecto_id)
            VALUES (?,?,?,?,?,?)
        """, (stock["articulo_id"], data.tipo, data.cantidad, data.motivo, data.operador, stock["proyecto_id"]))

        db.execute("UPDATE stock SET cantidad=?, updated_at=datetime('now') WHERE id=?", (nueva_cantidad, data.stock_id))

        db.commit()
        row = db.execute(ARTICULO_SELECT + "WHERE s.id = ?", (data.stock_id,)).fetchone()
        return dict(row)
    finally:
        db.close()


# ─────────────────────────────────────────
# BÚSQUEDA GLOBAL
# ─────────────────────────────────────────

@app.get("/api/buscar", response_model=List[ResultadoBusqueda])
def buscar(q: str = Query(..., min_length=1)):
    db = get_db()
    like = f"%{q}%"
    rows = db.execute("""
        SELECT a.id, a.nombre, s.cantidad as cantidad, a.unidad,
               COALESCE(s.ubicacion, a.ubicacion) as ubicacion,
               CASE WHEN COALESCE(s.stock_minimo, a.stock_minimo) IS NOT NULL
                         AND s.cantidad < COALESCE(s.stock_minimo, a.stock_minimo)
                    THEN 1 ELSE 0 END as bajo_minimo,
               p.id as proyecto_id, p.nombre as proyecto_nombre, p.color as proyecto_color,
               c.nombre as categoria_nombre, sal.nombre as sala_nombre
        FROM stock s
        JOIN articulos a ON a.id = s.articulo_id
        JOIN proyectos p ON p.id = s.proyecto_id
        LEFT JOIN categorias c ON c.id = a.categoria_id
        LEFT JOIN salas sal ON sal.id = COALESCE(s.sala_id, a.sala_id)
        WHERE a.nombre LIKE ? OR a.marca LIKE ? OR a.referencia LIKE ?
           OR COALESCE(s.ubicacion, a.ubicacion) LIKE ? OR c.nombre LIKE ? OR sal.nombre LIKE ?
        ORDER BY a.nombre
        LIMIT 50
    """, (like, like, like, like, like, like)).fetchall()
    db.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# MOVIMIENTOS EN BULK
# ─────────────────────────────────────────

@app.post("/api/movimientos/bulk", response_model=List[Articulo], status_code=201)
def create_movimientos_bulk(movimientos: List[MovimientoCreate]):
    db = get_db()
    resultados = []
    try:
        for data in movimientos:
            stock = db.execute("SELECT * FROM stock WHERE id=?", (data.stock_id,)).fetchone()
            if not stock:
                raise HTTPException(404, f"Stock {data.stock_id} no encontrado")
            nueva = stock["cantidad"] + data.cantidad if data.tipo == "entrada" else stock["cantidad"] - data.cantidad
            if nueva < 0:
                articulo = db.execute("SELECT nombre FROM articulos WHERE id=?", (stock["articulo_id"],)).fetchone()
                raise HTTPException(400, f"Stock insuficiente para '{articulo['nombre']}' (actual: {stock['cantidad']})")
            db.execute(
                "INSERT INTO movimientos (articulo_id, tipo, cantidad, motivo, operador, proyecto_id) VALUES (?,?,?,?,?,?)",
                (stock["articulo_id"], data.tipo, data.cantidad, data.motivo, data.operador, stock["proyecto_id"])
            )
            db.execute("UPDATE stock SET cantidad=?, updated_at=datetime('now') WHERE id=?", (nueva, data.stock_id))
        db.commit()
        for data in movimientos:
            row = db.execute(ARTICULO_SELECT + "WHERE s.id=?", (data.stock_id,)).fetchone()
            if row:
                resultados.append(dict(row))
    finally:
        db.close()
    return resultados


# ─────────────────────────────────────────
# BACKUP / RESTORE
# ─────────────────────────────────────────

@app.get("/api/backup")
def backup_db():
    if not os.path.exists(DB_PATH):
        raise HTTPException(404, "Base de datos no encontrada")
    from datetime import datetime
    fecha = datetime.now().strftime("%Y%m%d_%H%M%S")
    return FileResponse(
        DB_PATH,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=inventario_backup_{fecha}.db"}
    )

@app.post("/api/restore")
async def restore_db(file: UploadFile = File(...)):
    content = await file.read()
    if not content.startswith(b"SQLite format 3"):
        raise HTTPException(400, "El archivo no es una base de datos SQLite válida")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        shutil.move(tmp_path, DB_PATH)
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(500, f"Error al restaurar: {e}")
    return {"message": "Base de datos restaurada. Recarga la aplicación."}


# ─────────────────────────────────────────
# EXPORTACIÓN EXCEL
# ─────────────────────────────────────────

@app.get("/api/proyectos/{proyecto_id}/exportar")
def exportar_excel(proyecto_id: int):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise HTTPException(500, "openpyxl no instalado")

    db = get_db()
    proyecto = db.execute("SELECT * FROM proyectos WHERE id=?", (proyecto_id,)).fetchone()
    if not proyecto:
        db.close()
        raise HTTPException(404, "Proyecto no encontrado")

    articulos = db.execute("""
        SELECT a.nombre, a.marca, a.referencia, c.nombre as categoria_nombre,
               s.cantidad, a.unidad,
               COALESCE(s.ubicacion, a.ubicacion) as ubicacion,
               COALESCE(s.stock_minimo, a.stock_minimo) as stock_minimo,
               s.updated_at
        FROM stock s
        JOIN articulos a ON a.id = s.articulo_id
        LEFT JOIN categorias c ON c.id = a.categoria_id
        WHERE s.proyecto_id = ?
        ORDER BY a.nombre
    """, (proyecto_id,)).fetchall()

    movimientos = db.execute("""
        SELECT m.*, a.nombre as articulo_nombre
        FROM movimientos m
        JOIN articulos a ON a.id = m.articulo_id
        WHERE m.proyecto_id = ? OR m.proyecto_origen_id = ? OR m.proyecto_destino_id = ?
        ORDER BY m.fecha DESC
    """, (proyecto_id, proyecto_id, proyecto_id)).fetchall()
    db.close()

    wb = openpyxl.Workbook()

    # Hoja 1: Inventario
    ws1 = wb.active
    ws1.title = "Inventario"

    header_fill = PatternFill("solid", fgColor="1E3A5F")
    header_font = Font(bold=True, color="FFFFFF")
    headers = ["Nombre", "Marca", "Referencia", "Categoría", "Cantidad", "Unidad", "Ubicación", "Stock Mínimo", "Estado", "Última actualización"]

    for col, h in enumerate(headers, 1):
        cell = ws1.cell(row=1, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for row_idx, art in enumerate(articulos, 2):
        art = dict(art)
        bajo = art.get("stock_minimo") and art["cantidad"] < art["stock_minimo"]
        ws1.cell(row=row_idx, column=1, value=art["nombre"])
        ws1.cell(row=row_idx, column=2, value=art.get("marca") or "—")
        ws1.cell(row=row_idx, column=3, value=art.get("referencia") or "—")
        ws1.cell(row=row_idx, column=4, value=art.get("categoria_nombre") or "—")
        ws1.cell(row=row_idx, column=5, value=art["cantidad"])
        ws1.cell(row=row_idx, column=6, value=art.get("unidad") or "ud")
        ws1.cell(row=row_idx, column=7, value=art.get("ubicacion") or "—")
        ws1.cell(row=row_idx, column=8, value=art.get("stock_minimo") or "—")
        estado_cell = ws1.cell(row=row_idx, column=9, value="⚠ Bajo mínimo" if bajo else "OK")
        if bajo:
            estado_cell.font = Font(color="CC0000", bold=True)
        ws1.cell(row=row_idx, column=10, value=art.get("updated_at", ""))

    for col in range(1, len(headers) + 1):
        ws1.column_dimensions[get_column_letter(col)].width = 18

    # Hoja 2: Historial
    ws2 = wb.create_sheet("Historial de movimientos")
    headers2 = ["Fecha", "Artículo", "Tipo", "Cantidad", "Operador", "Motivo"]

    for col, h in enumerate(headers2, 1):
        cell = ws2.cell(row=1, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for row_idx, mov in enumerate(movimientos, 2):
        mov = dict(mov)
        ws2.cell(row=row_idx, column=1, value=mov.get("fecha", ""))
        ws2.cell(row=row_idx, column=2, value=mov.get("articulo_nombre", ""))
        tipo_cell = ws2.cell(row=row_idx, column=3, value=mov["tipo"].capitalize())
        color_tipo = {"entrada": "006600", "salida": "CC0000", "transferencia": "1E3A5F"}
        tipo_cell.font = Font(color=color_tipo.get(mov["tipo"], "000000"))
        ws2.cell(row=row_idx, column=4, value=mov["cantidad"])
        ws2.cell(row=row_idx, column=5, value=mov.get("operador", ""))
        ws2.cell(row=row_idx, column=6, value=mov.get("motivo") or "—")

    for col in range(1, len(headers2) + 1):
        ws2.column_dimensions[get_column_letter(col)].width = 20

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    nombre_archivo = f"inventario_{proyecto['nombre'].replace(' ', '_')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )


# ─────────────────────────────────────────
# SERVIR FRONTEND (producción)
# ─────────────────────────────────────────

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")
