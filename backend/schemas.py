from pydantic import BaseModel, Field
from typing import Optional, List


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
# El "artículo" es el catálogo global (nombre+marca+referencia únicos), y
# vive solo en la tabla `articulos` (incluido el stock_mínimo: es un valor
# único por artículo, no por ubicación). Las existencias reales viven en
# `stock`, con una fila por (articulo, proyecto, ubicación, estado) — un
# mismo artículo puede repartirse en varias ubicaciones dentro del mismo
# proyecto, cada una con su propia cantidad.

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
    """Campos de catálogo, compartidos por todos los proyectos/ubicaciones donde exista el artículo."""
    nombre: Optional[str] = None
    marca: Optional[str] = None
    referencia: Optional[str] = None
    categoria_id: Optional[int] = None
    unidad: Optional[str] = None
    stock_minimo: Optional[float] = None
    notas: Optional[str] = None

class StockUpdate(BaseModel):
    """Campos de una ubicación concreta (una fila de `stock`)."""
    ubicacion: Optional[str] = None
    sala_id: Optional[int] = None


class Articulo(BaseModel):
    """Fila de listado: un artículo dentro de un proyecto, con la cantidad
    agregada de todas sus ubicaciones en estado 'ok'."""
    id: int  # id del artículo en el catálogo
    proyecto_id: int
    proyecto_nombre: Optional[str] = None
    proyecto_color: Optional[str] = None
    nombre: str
    marca: str
    referencia: str
    categoria_id: Optional[int]
    categoria_nombre: Optional[str]
    unidad: str
    cantidad: float  # total agregado
    stock_minimo: Optional[float]
    bajo_minimo: bool = False
    num_ubicaciones: int = 1
    ubicacion: Optional[str] = None  # solo si num_ubicaciones == 1
    sala_nombre: Optional[str] = None  # solo si num_ubicaciones == 1
    notas: Optional[str]
    created_at: str
    updated_at: str


class UbicacionStock(BaseModel):
    """Una fila de stock concreta (una ubicación) dentro del desglose de un artículo."""
    stock_id: int
    ubicacion: Optional[str]
    sala_id: Optional[int]
    sala_nombre: Optional[str]
    cantidad: float
    created_at: str
    updated_at: str


class ArticuloDetalle(BaseModel):
    """Respuesta del detalle de un artículo en un proyecto: catálogo +
    total agregado + desglose por ubicación (funcional y de baja)."""
    id: int
    nombre: str
    marca: str
    referencia: str
    categoria_id: Optional[int]
    categoria_nombre: Optional[str]
    unidad: str
    stock_minimo: Optional[float]
    notas: Optional[str]
    proyecto_id: int
    proyecto_nombre: str
    proyecto_color: str
    cantidad_total: float
    bajo_minimo: bool = False
    ubicaciones: List[UbicacionStock] = []
    bajas: List[UbicacionStock] = []


class StockPorProyecto(BaseModel):
    """Total agregado de un artículo en OTRO proyecto (sección 'también en otros proyectos')."""
    proyecto_id: int
    proyecto_nombre: str
    proyecto_color: str
    cantidad_total: float


class StockLinea(BaseModel):
    """Fila de stock plana (sin agregar), una por ubicación. Usada por el
    listado global de bajas y por el ajuste masivo (que necesita granularidad
    por ubicación)."""
    stock_id: int
    articulo_id: int
    nombre: str
    marca: str
    referencia: str
    unidad: str
    cantidad: float
    ubicacion: Optional[str]
    sala_nombre: Optional[str]
    estado: str
    proyecto_id: int
    proyecto_nombre: str
    proyecto_color: str
    updated_at: str


# --- Movimientos ---
class MovimientoCreate(BaseModel):
    tipo: str  # 'entrada' | 'salida' | 'transferencia' | 'baja' | 'reparacion'
    cantidad: float = Field(gt=0)
    motivo: Optional[str] = None
    operador: str
    stock_id: Optional[int] = None  # ubicación de origen ya existente
    articulo_id: Optional[int] = None  # solo si 'entrada' crea una ubicación nueva (sin stock_id)
    proyecto_id: Optional[int] = None  # ídem
    ubicacion: Optional[str] = None  # ubicación nueva a crear (con articulo_id+proyecto_id)
    sala_id: Optional[int] = None  # sala de la ubicación nueva (con articulo_id+proyecto_id)
    proyecto_destino_id: Optional[int] = None  # requerido para transferencia
    ubicacion_destino: Optional[str] = None  # opcional para baja/reparacion/transferencia
    sala_destino_id: Optional[int] = None  # opcional para baja/reparacion (sala de la ubicación destino)

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
# Una fila por ubicación que matchea (no agregado): el mínimo es un valor de
# catálogo, comparar solo esta cantidad parcial contra él sería engañoso, así
# que la búsqueda no marca "bajo mínimo" por fila.
class ResultadoBusqueda(BaseModel):
    id: int
    nombre: str
    cantidad: float
    unidad: str
    ubicacion: Optional[str]
    sala_nombre: Optional[str]
    proyecto_id: int
    proyecto_nombre: str
    proyecto_color: str
    categoria_nombre: Optional[str]
