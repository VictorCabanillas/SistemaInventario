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

// Artículos (catálogo global + stock por proyecto, fusionados en la respuesta)
export const getArticulos = (proyectoId) => request(`/proyectos/${proyectoId}/articulos`)
export const getArticulosGlobal = () => request('/articulos')
export const getArticulo = (proyectoId, articuloId) => request(`/proyectos/${proyectoId}/articulos/${articuloId}`)
export const getStockArticulo = (articuloId) => request(`/articulos/${articuloId}/stock`)
export const createArticulo = (data) => request('/articulos', { method: 'POST', body: JSON.stringify(data) })
export const updateArticulo = (id, proyectoId, data) => request(`/articulos/${id}?proyecto_id=${proyectoId}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteArticulo = (proyectoId, articuloId) => request(`/proyectos/${proyectoId}/articulos/${articuloId}`, { method: 'DELETE' })

// Movimientos
export const getMovimientos = (articuloId) => request(`/articulos/${articuloId}/movimientos`)
export const createMovimiento = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify(data) })
export const createTransferencia = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify({ ...data, tipo: 'transferencia' }) })

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
