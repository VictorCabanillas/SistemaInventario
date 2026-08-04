from pydantic import BaseModel, Field
from typing import Optional


# --- Categorías ---
class CategoriaCreate(BaseModel):
    nombre: str

class Categoria(BaseModel):
    id: int
    nombre: str


# --- Salas ---
class SalaCreate(BaseModel):
    nombre: str

class Sala(BaseModel):
    id: int
    nombre: str


# --- Operadores ---
class OperadorCreate(BaseModel):
    nombre: str

class Operador(BaseModel):
    id: int
    nombre: str


# --- Proyectos ---
class ProyectoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    icono: Optional[str] = "Package"

class ProyectoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None
    icono: Optional[str] = None

class Proyecto(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    color: str
    icono: Optional[str] = "Package"
    es_almacen: bool = False
    created_at: str
    total_articulos: Optional[int] = 0
    articulos_bajo_minimo: Optional[int] = 0


# --- Artículos ---
# El "artículo" es el catálogo global (nombre+marca+referencia únicos).
# Las existencias reales viven en `stock`, una fila por (articulo, proyecto).
# Los endpoints de listado devuelven ambas cosas fusionadas: catálogo +
# cantidad/ubicación/stock_mínimo ya resueltos para un proyecto concreto.

class ArticuloCreate(BaseModel):
    nombre: str
    marca: Optional[str] = ""
    referencia: Optional[str] = ""
    categoria_id: Optional[int] = None
    proyecto_id: Optional[int] = None  # si no se indica, va al Almacén general
    cantidad: float = 0
    unidad: Optional[str] = "ud"
    sala_id: Optional[int] = None
    ubicacion: Optional[str] = None
    stock_minimo: Optional[float] = None
    notas: Optional[str] = None

class ArticuloUpdate(BaseModel):
    # Campos de catálogo (compartidos por todos los proyectos donde exista stock)
    nombre: Optional[str] = None
    marca: Optional[str] = None
    referencia: Optional[str] = None
    categoria_id: Optional[int] = None
    unidad: Optional[str] = None
    notas: Optional[str] = None
    # Overrides de este proyecto concreto (fila de stock)
    sala_id: Optional[int] = None
    ubicacion: Optional[str] = None
    stock_minimo: Optional[float] = None

class Articulo(BaseModel):
    id: int  # id del artículo en el catálogo
    stock_id: int  # id de la fila de stock (existencias en este proyecto)
    proyecto_id: int
    proyecto_nombre: Optional[str] = None
    proyecto_color: Optional[str] = None
    nombre: str
    marca: str
    referencia: str
    categoria_id: Optional[int]
    categoria_nombre: Optional[str]
    sala_id: Optional[int]
    sala_nombre: Optional[str]
    cantidad: float
    unidad: str
    ubicacion: Optional[str]
    stock_minimo: Optional[float]
    notas: Optional[str]
    bajo_minimo: bool = False
    created_at: str
    updated_at: str


# --- Movimientos ---
class MovimientoCreate(BaseModel):
    tipo: str  # 'entrada' | 'salida' | 'transferencia'
    cantidad: float = Field(gt=0)
    motivo: Optional[str] = None
    operador: str
    stock_id: Optional[int] = None  # requerido para entrada/salida
    articulo_id: Optional[int] = None  # requerido para transferencia
    proyecto_origen_id: Optional[int] = None  # requerido para transferencia
    proyecto_destino_id: Optional[int] = None  # requerido para transferencia

class Movimiento(BaseModel):
    id: int
    articulo_id: int
    articulo_nombre: Optional[str]
    tipo: str
    cantidad: float
    motivo: Optional[str]
    operador: str
    fecha: str
    proyecto_id: Optional[int] = None
    proyecto_nombre: Optional[str] = None
    proyecto_origen_id: Optional[int] = None
    proyecto_origen_nombre: Optional[str] = None
    proyecto_destino_id: Optional[int] = None
    proyecto_destino_nombre: Optional[str] = None


# --- Búsqueda global ---
class ResultadoBusqueda(BaseModel):
    id: int
    nombre: str
    cantidad: float
    unidad: str
    ubicacion: Optional[str]
    sala_nombre: Optional[str]
    bajo_minimo: bool
    proyecto_id: int
    proyecto_nombre: str
    proyecto_color: str
    categoria_nombre: Optional[str]
