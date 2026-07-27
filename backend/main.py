from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
import os
import io
import shutil
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

@app.get("/api/proyectos", response_model=List[Proyecto])
def get_proyectos():
    db = get_db()
    rows = db.execute("""
        SELECT p.*,
               COUNT(a.id) as total_articulos,
               SUM(CASE WHEN a.stock_minimo IS NOT NULL AND a.cantidad < a.stock_minimo THEN 1 ELSE 0 END) as articulos_bajo_minimo
        FROM proyectos p
        LEFT JOIN articulos a ON a.proyecto_id = p.id
        GROUP BY p.id
        ORDER BY p.nombre
    """).fetchall()
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
    row = db.execute("""
        SELECT p.*,
               COUNT(a.id) as total_articulos,
               SUM(CASE WHEN a.stock_minimo IS NOT NULL AND a.cantidad < a.stock_minimo THEN 1 ELSE 0 END) as articulos_bajo_minimo
        FROM proyectos p
        LEFT JOIN articulos a ON a.proyecto_id = p.id
        WHERE p.id=?
        GROUP BY p.id
    """, (id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Proyecto no encontrado")
    return dict(row)

@app.delete("/api/proyectos/{id}", status_code=204)
def delete_proyecto(id: int):
    db = get_db()
    db.execute("DELETE FROM proyectos WHERE id=?", (id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# ARTÍCULOS
# ─────────────────────────────────────────

ARTICULO_SELECT = """
    SELECT a.*, c.nombre as categoria_nombre, s.nombre as sala_nombre,
           CASE WHEN a.stock_minimo IS NOT NULL AND a.cantidad < a.stock_minimo THEN 1 ELSE 0 END as bajo_minimo
    FROM articulos a
    LEFT JOIN categorias c ON c.id = a.categoria_id
    LEFT JOIN salas s ON s.id = a.sala_id
"""

@app.get("/api/proyectos/{proyecto_id}/articulos", response_model=List[Articulo])
def get_articulos(proyecto_id: int):
    db = get_db()
    rows = db.execute(ARTICULO_SELECT + "WHERE a.proyecto_id = ? ORDER BY a.nombre", (proyecto_id,)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.get("/api/articulos/{id}", response_model=Articulo)
def get_articulo(id: int):
    db = get_db()
    row = db.execute(ARTICULO_SELECT + "WHERE a.id = ?", (id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Artículo no encontrado")
    return dict(row)

@app.post("/api/articulos", response_model=Articulo, status_code=201)
def create_articulo(data: ArticuloCreate):
    db = get_db()
    cur = db.execute("""
        INSERT INTO articulos (proyecto_id, categoria_id, sala_id, nombre, cantidad, unidad, ubicacion, stock_minimo, notas)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (data.proyecto_id, data.categoria_id, data.sala_id, data.nombre, data.cantidad,
          data.unidad, data.ubicacion, data.stock_minimo, data.notas))
    db.commit()
    row = db.execute(ARTICULO_SELECT + "WHERE a.id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)

@app.put("/api/articulos/{id}", response_model=Articulo)
def update_articulo(id: int, data: ArticuloUpdate):
    db = get_db()
    fields = {k: v for k, v in data.dict().items() if v is not None}
    if fields:
        sets = ", ".join(f"{k}=?" for k in fields)
        sets += ", updated_at=datetime('now')"
        db.execute(f"UPDATE articulos SET {sets} WHERE id=?", (*fields.values(), id))
        db.commit()
    row = db.execute(ARTICULO_SELECT + "WHERE a.id = ?", (id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Artículo no encontrado")
    return dict(row)

@app.delete("/api/articulos/{id}", status_code=204)
def delete_articulo(id: int):
    db = get_db()
    db.execute("DELETE FROM articulos WHERE id=?", (id,))
    db.commit()
    db.close()


# ─────────────────────────────────────────
# MOVIMIENTOS DE STOCK
# ─────────────────────────────────────────

@app.get("/api/articulos/{articulo_id}/movimientos", response_model=List[Movimiento])
def get_movimientos(articulo_id: int, limit: int = 50):
    db = get_db()
    rows = db.execute("""
        SELECT m.*, a.nombre as articulo_nombre, p.nombre as proyecto_nombre
        FROM movimientos m
        JOIN articulos a ON a.id = m.articulo_id
        JOIN proyectos p ON p.id = a.proyecto_id
        WHERE m.articulo_id = ?
        ORDER BY m.fecha DESC
        LIMIT ?
    """, (articulo_id, limit)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.get("/api/movimientos", response_model=List[Movimiento])
def get_all_movimientos(limit: int = 100):
    db = get_db()
    rows = db.execute("""
        SELECT m.*, a.nombre as articulo_nombre, p.nombre as proyecto_nombre
        FROM movimientos m
        JOIN articulos a ON a.id = m.articulo_id
        JOIN proyectos p ON p.id = a.proyecto_id
        ORDER BY m.fecha DESC
        LIMIT ?
    """, (limit,)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/api/movimientos", response_model=Articulo, status_code=201)
def create_movimiento(data: MovimientoCreate):
    db = get_db()

    articulo = db.execute("SELECT * FROM articulos WHERE id=?", (data.articulo_id,)).fetchone()
    if not articulo:
        raise HTTPException(404, "Artículo no encontrado")

    nueva_cantidad = articulo["cantidad"] + data.cantidad if data.tipo == "entrada" else articulo["cantidad"] - data.cantidad

    if nueva_cantidad < 0:
        raise HTTPException(400, f"Stock insuficiente. Stock actual: {articulo['cantidad']}")

    db.execute("""
        INSERT INTO movimientos (articulo_id, tipo, cantidad, motivo, operador)
        VALUES (?,?,?,?,?)
    """, (data.articulo_id, data.tipo, data.cantidad, data.motivo, data.operador))

    db.execute("""
        UPDATE articulos SET cantidad=?, updated_at=datetime('now') WHERE id=?
    """, (nueva_cantidad, data.articulo_id))

    db.commit()

    row = db.execute(ARTICULO_SELECT + "WHERE a.id = ?", (data.articulo_id,)).fetchone()
    db.close()
    return dict(row)


# ─────────────────────────────────────────
# BÚSQUEDA GLOBAL
# ─────────────────────────────────────────

@app.get("/api/buscar", response_model=List[ResultadoBusqueda])
def buscar(q: str = Query(..., min_length=1)):
    db = get_db()
    rows = db.execute("""
        SELECT a.id, a.nombre, a.cantidad, a.unidad, a.ubicacion,
               CASE WHEN a.stock_minimo IS NOT NULL AND a.cantidad < a.stock_minimo THEN 1 ELSE 0 END as bajo_minimo,
               p.id as proyecto_id, p.nombre as proyecto_nombre, p.color as proyecto_color,
               c.nombre as categoria_nombre, s.nombre as sala_nombre
        FROM articulos a
        JOIN proyectos p ON p.id = a.proyecto_id
        LEFT JOIN categorias c ON c.id = a.categoria_id
        LEFT JOIN salas s ON s.id = a.sala_id
        WHERE a.nombre LIKE ? OR a.ubicacion LIKE ? OR c.nombre LIKE ? OR s.nombre LIKE ?
        ORDER BY a.nombre
        LIMIT 50
    """, (f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%")).fetchall()
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
            articulo = db.execute("SELECT * FROM articulos WHERE id=?", (data.articulo_id,)).fetchone()
            if not articulo:
                raise HTTPException(404, f"Artículo {data.articulo_id} no encontrado")
            nueva = articulo["cantidad"] + data.cantidad if data.tipo == "entrada" else articulo["cantidad"] - data.cantidad
            if nueva < 0:
                raise HTTPException(400, f"Stock insuficiente para '{articulo['nombre']}' (actual: {articulo['cantidad']})")
            db.execute(
                "INSERT INTO movimientos (articulo_id, tipo, cantidad, motivo, operador) VALUES (?,?,?,?,?)",
                (data.articulo_id, data.tipo, data.cantidad, data.motivo, data.operador)
            )
            db.execute("UPDATE articulos SET cantidad=?, updated_at=datetime('now') WHERE id=?", (nueva, data.articulo_id))
        db.commit()
        for data in movimientos:
            row = db.execute(ARTICULO_SELECT + "WHERE a.id=?", (data.articulo_id,)).fetchone()
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
        SELECT a.*, c.nombre as categoria_nombre
        FROM articulos a
        LEFT JOIN categorias c ON c.id = a.categoria_id
        WHERE a.proyecto_id = ?
        ORDER BY a.nombre
    """, (proyecto_id,)).fetchall()

    movimientos = db.execute("""
        SELECT m.*, a.nombre as articulo_nombre
        FROM movimientos m
        JOIN articulos a ON a.id = m.articulo_id
        WHERE a.proyecto_id = ?
        ORDER BY m.fecha DESC
    """, (proyecto_id,)).fetchall()
    db.close()

    wb = openpyxl.Workbook()

    # Hoja 1: Inventario
    ws1 = wb.active
    ws1.title = "Inventario"

    header_fill = PatternFill("solid", fgColor="1E3A5F")
    header_font = Font(bold=True, color="FFFFFF")
    headers = ["Nombre", "Categoría", "Cantidad", "Unidad", "Ubicación", "Stock Mínimo", "Estado", "Última actualización"]

    for col, h in enumerate(headers, 1):
        cell = ws1.cell(row=1, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for row_idx, art in enumerate(articulos, 2):
        art = dict(art)
        bajo = art.get("stock_minimo") and art["cantidad"] < art["stock_minimo"]
        ws1.cell(row=row_idx, column=1, value=art["nombre"])
        ws1.cell(row=row_idx, column=2, value=art.get("categoria_nombre") or "—")
        ws1.cell(row=row_idx, column=3, value=art["cantidad"])
        ws1.cell(row=row_idx, column=4, value=art.get("unidad") or "ud")
        ws1.cell(row=row_idx, column=5, value=art.get("ubicacion") or "—")
        ws1.cell(row=row_idx, column=6, value=art.get("stock_minimo") or "—")
        estado_cell = ws1.cell(row=row_idx, column=7, value="⚠ Bajo mínimo" if bajo else "OK")
        if bajo:
            estado_cell.font = Font(color="CC0000", bold=True)
        ws1.cell(row=row_idx, column=8, value=art.get("updated_at", ""))

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
        tipo_cell.font = Font(color="006600" if mov["tipo"] == "entrada" else "CC0000")
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
