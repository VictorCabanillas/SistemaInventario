const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Error en la petición')
  }
  if (res.status === 204) return null
  return res.json()
}

// Proyectos
export const getProyectos = () => request('/proyectos')
export const createProyecto = (data) => request('/proyectos', { method: 'POST', body: JSON.stringify(data) })
export const updateProyecto = (id, data) => request(`/proyectos/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteProyecto = (id) => request(`/proyectos/${id}`, { method: 'DELETE' })

// Artículos (catálogo global + stock por proyecto, agregados por ubicación en la respuesta)
// salaId (opcional) filtra a artículos con ALGUNA ubicación en esa sala, mostrando igualmente el total agregado completo
export const getArticulos = (proyectoId, salaId) => request(`/proyectos/${proyectoId}/articulos${salaId ? `?sala_id=${salaId}` : ''}`)
export const getArticulosGlobal = (salaId) => request(`/articulos${salaId ? `?sala_id=${salaId}` : ''}`)
// Detalle agregado: { ...catálogo, cantidad_total, bajo_minimo, ubicaciones: [...], bajas: [...] }
export const getArticulo = (proyectoId, articuloId) => request(`/proyectos/${proyectoId}/articulos/${articuloId}`)
// Total agregado de este artículo en cada OTRO proyecto: [{ proyecto_id, proyecto_nombre, proyecto_color, cantidad_total }]
export const getStockArticulo = (articuloId) => request(`/articulos/${articuloId}/stock`)
export const createArticulo = (data) => request('/articulos', { method: 'POST', body: JSON.stringify(data) })
export const updateArticulo = (id, data) => request(`/articulos/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteArticulo = (proyectoId, articuloId) => request(`/proyectos/${proyectoId}/articulos/${articuloId}`, { method: 'DELETE' })

// Ubicaciones concretas (filas de stock)
export const updateStock = (stockId, data) => request(`/stock/${stockId}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteStock = (stockId) => request(`/stock/${stockId}`, { method: 'DELETE' })
// Filas de stock en bruto (una por ubicación) de un proyecto, para el ajuste masivo
export const getStockProyecto = (proyectoId) => request(`/proyectos/${proyectoId}/stock`)
// Ídem, de todos los proyectos (vista Almacén general)
export const getStockGlobal = () => request('/stock')

// Movimientos
export const getMovimientos = (articuloId) => request(`/articulos/${articuloId}/movimientos`)
export const createMovimiento = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify(data) })
// Entrada en una ubicación ya existente (data.stock_id) o nueva (data.articulo_id + data.proyecto_id + data.ubicacion)
export const createEntrada = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify({ ...data, tipo: 'entrada' }) })
export const createTransferencia = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify({ ...data, tipo: 'transferencia' }) })
export const createBaja = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify({ ...data, tipo: 'baja' }) })
export const createReparacion = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify({ ...data, tipo: 'reparacion' }) })

// Bajas (material dado de baja, de todos los proyectos)
export const getBajas = () => request('/bajas')

// Categorías
export const getCategorias = () => request('/categorias')
export const createCategoria = (data) => request('/categorias', { method: 'POST', body: JSON.stringify(data) })
export const deleteCategoria = (id) => request(`/categorias/${id}`, { method: 'DELETE' })

// Salas
export const getSalas = () => request('/salas')
export const createSala = (data) => request('/salas', { method: 'POST', body: JSON.stringify(data) })
export const deleteSala = (id) => request(`/salas/${id}`, { method: 'DELETE' })

// Operadores
export const getOperadores = () => request('/operadores')
export const createOperador = (data) => request('/operadores', { method: 'POST', body: JSON.stringify(data) })
export const deleteOperador = (id) => request(`/operadores/${id}`, { method: 'DELETE' })

// Iconos personalizados
export const eliminarIcono = (filename) => request(`/iconos/${encodeURIComponent(filename)}`, { method: 'DELETE' })
export const subirIcono = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/iconos', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al subir el icono' }))
    throw new Error(err.detail)
  }
  return res.json()
}

// Búsqueda
export const buscar = (q) => request(`/buscar?q=${encodeURIComponent(q)}`)

// Alertas de stock bajo mínimo (todos los proyectos)
export const getAlertas = () => request('/alertas')

// Movimientos bulk
export const createMovimientosBulk = (data) => request('/movimientos/bulk', { method: 'POST', body: JSON.stringify(data) })

// Backup / Restore
export const backupDB = async () => {
  const res = await fetch('/api/backup')
  if (!res.ok) throw new Error('Error al generar backup')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  const f = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  a.download = `inventario_backup_${f}.db`
  a.click()
  URL.revokeObjectURL(url)
}

export const restoreDB = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/restore', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al restaurar' }))
    throw new Error(err.detail)
  }
  return res.json()
}

// Exportar
export const exportarExcel = async (proyectoId, nombreProyecto) => {
  const res = await fetch(`${BASE}/proyectos/${proyectoId}/exportar`)
  if (!res.ok) throw new Error('Error al exportar')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventario_${nombreProyecto}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// Importar (volcado masivo desde Excel)
export const descargarPlantillaImportacion = async () => {
  const res = await fetch(`${BASE}/plantilla-importacion`)
  if (!res.ok) throw new Error('Error al descargar la plantilla')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_importacion_articulos.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

export const importarExcel = async (proyectoId, file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/proyectos/${proyectoId}/importar`, { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al importar' }))
    throw new Error(err.detail)
  }
  return res.json() // { procesadas, errores: [{ fila, motivo }] }
}

// Importación global: cada fila decide su proyecto con la columna Proyecto
// (Almacén general si se deja vacía). No hace falta entrar en ningún proyecto.
export const importarExcelGlobal = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/importar`, { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al importar' }))
    throw new Error(err.detail)
  }
  return res.json()
}
