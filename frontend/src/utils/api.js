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

// Artículos
export const getArticulos = (proyectoId) => request(`/proyectos/${proyectoId}/articulos`)
export const getArticulo = (id) => request(`/articulos/${id}`)
export const createArticulo = (data) => request('/articulos', { method: 'POST', body: JSON.stringify(data) })
export const updateArticulo = (id, data) => request(`/articulos/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteArticulo = (id) => request(`/articulos/${id}`, { method: 'DELETE' })

// Movimientos
export const getMovimientos = (articuloId) => request(`/articulos/${articuloId}/movimientos`)
export const createMovimiento = (data) => request('/movimientos', { method: 'POST', body: JSON.stringify(data) })

// Categorías
export const getCategorias = () => request('/categorias')
export const createCategoria = (data) => request('/categorias', { method: 'POST', body: JSON.stringify(data) })
export const deleteCategoria = (id) => request(`/categorias/${id}`, { method: 'DELETE' })

// Búsqueda
export const buscar = (q) => request(`/buscar?q=${encodeURIComponent(q)}`)

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
