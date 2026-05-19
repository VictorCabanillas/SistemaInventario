from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Categorías ---
class CategoriaCreate(BaseModel):
    nombre: str

class Categoria(BaseModel):
    id: int
    nombre: str


# --- Proyectos ---
class ProyectoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    color: Optional[str] = "#3B82F6"

class ProyectoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None

class Proyecto(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    color: str
    created_at: str
    total_articulos: Optional[int] = 0
    articulos_bajo_minimo: Optional[int] = 0


# --- Artículos ---
class ArticuloCreate(BaseModel):
    proyecto_id: int
    categoria_id: Optional[int] = None
    nombre: str
    cantidad: float = 0
    unidad: Optional[str] = "ud"
    ubicacion: Optional[str] = None
    stock_minimo: Optional[float] = None
    notas: Optional[str] = None

class ArticuloUpdate(BaseModel):
    categoria_id: Optional[int] = None
    nombre: Optional[str] = None
    unidad: Optional[str] = None
    ubicacion: Optional[str] = None
    stock_minimo: Optional[float] = None
    notas: Optional[str] = None

class Articulo(BaseModel):
    id: int
    proyecto_id: int
    categoria_id: Optional[int]
    categoria_nombre: Optional[str]
    nombre: str
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
    articulo_id: int
    tipo: str  # 'entrada' | 'salida'
    cantidad: float = Field(gt=0)
    motivo: Optional[str] = None
    operador: str

class Movimiento(BaseModel):
    id: int
    articulo_id: int
    articulo_nombre: Optional[str]
    proyecto_nombre: Optional[str]
    tipo: str
    cantidad: float
    motivo: Optional[str]
    operador: str
    fecha: str


# --- Búsqueda global ---
class ResultadoBusqueda(BaseModel):
    id: int
    nombre: str
    cantidad: float
    unidad: str
    ubicacion: Optional[str]
    bajo_minimo: bool
    proyecto_id: int
    proyecto_nombre: str
    proyecto_color: str
    categoria_nombre: Optional[str]
