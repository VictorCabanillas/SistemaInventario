import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, AlertTriangle, Package, Search, X, Download, Filter } from 'lucide-react'
import { getArticulos, getProyectos, getCategorias, createArticulo, exportarExcel } from '../utils/api'
import { Spinner, EmptyState, Toast, Badge, Modal, Input, Select, Button } from '../components/ui'

export default function Articulos() {
  const { proyectoId } = useParams()
  const navigate = useNavigate()
  const [articulos, setArticulos] = useState([])
  const [proyecto, setProyecto] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ nombre: '', categoria_id: '', cantidad: '', unidad: 'ud', ubicacion: '', stock_minimo: '', notas: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => { cargar() }, [proyectoId])

  async function cargar() {
    try {
      const [arts, proyects, cats] = await Promise.all([
        getArticulos(proyectoId),
        getProyectos(),
        getCategorias()
      ])
      setArticulos(arts)
      setProyecto(proyects.find(p => p.id === parseInt(proyectoId)))
      setCategorias(cats)
    } catch (e) {
      showToast('Error al cargar', 'error')
    } finally {
      setLoading(false)
    }
  }

  const articulosFiltrados = articulos.filter(a => {
    const matchNombre = a.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (a.ubicacion || '').toLowerCase().includes(filtro.toLowerCase())
    const matchCat = !filtroCat || a.categoria_id === parseInt(filtroCat)
    return matchNombre && matchCat
  })

  const bajosMinimo = articulos.filter(a => a.bajo_minimo).length

  async function handleGuardar() {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Obligatorio'
    if (form.cantidad === '' || isNaN(parseFloat(form.cantidad))) errs.cantidad = 'Cantidad inválida'
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      const nuevo = await createArticulo({
        proyecto_id: parseInt(proyectoId),
        nombre: form.nombre,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        cantidad: parseFloat(form.cantidad),
        unidad: form.unidad || 'ud',
        ubicacion: form.ubicacion || null,
        stock_minimo: form.stock_minimo ? parseFloat(form.stock_minimo) : null,
        notas: form.notas || null,
      })
      setArticulos(as => [...as, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setShowModal(false)
      showToast('Artículo creado')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleExportar() {
    try {
      await exportarExcel(proyectoId, proyecto?.nombre || 'proyecto')
      showToast('Excel generado')
    } catch (e) {
      showToast('Error al exportar', 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  function abrirCrear() {
    setForm({ nombre: '', categoria_id: '', cantidad: '0', unidad: 'ud', ubicacion: '', stock_minimo: '', notas: '' })
    setErrors({})
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            {proyecto && (
              <>
                <div className="w-8 h-8 rounded-xl flex-shrink-0" style={{ backgroundColor: proyecto.color }} />
                <div className="flex-1 min-w-0">
                  <h1 className="font-bold text-gray-900 truncate">{proyecto.nombre}</h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{articulos.length} artículo{articulos.length !== 1 ? 's' : ''}</span>
                    {bajosMinimo > 0 && (
                      <Badge color="red">
                        <AlertTriangle size={10} className="mr-1" />
                        {bajosMinimo} bajo mínimo
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Exportar: icono discreto */}
                <button onClick={handleExportar} title="Exportar a Excel"
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                  <Download size={18} />
                </button>
              </>
            )}
          </div>

          {/* Búsqueda y filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={filtro} onChange={e => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o ubicación..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              {filtro && (
                <button onClick={() => setFiltro('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFiltros(f => !f)}
              className={`px-3 py-2.5 rounded-xl border text-sm transition-colors ${filtroCat ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <Filter size={16} />
            </button>
          </div>

          {showFiltros && (
            <div className="mt-2">
              <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none">
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {loading ? <Spinner /> : articulosFiltrados.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtro || filtroCat ? 'Sin resultados' : 'Sin artículos'}
            description={filtro || filtroCat ? 'Prueba con otros filtros' : 'Pulsa + para añadir el primer artículo'}
          />
        ) : (
          <div className="space-y-2">
            {articulosFiltrados.map(art => (
              <div key={art.id}
                onClick={() => navigate(`/proyectos/${proyectoId}/articulos/${art.id}`)}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all flex items-center gap-4
                  ${art.bajo_minimo ? 'border-red-200 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'}`}>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-800 text-sm truncate">{art.nombre}</span>
                    {art.bajo_minimo && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {art.categoria_nombre && <Badge>{art.categoria_nombre}</Badge>}
                    {art.ubicacion && <span className="text-xs text-gray-400">📍 {art.ubicacion}</span>}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-base ${art.bajo_minimo ? 'text-red-600' : 'text-gray-900'}`}>
                    {art.cantidad}
                  </p>
                  <p className="text-xs text-gray-400">{art.unidad}</p>
                  {art.stock_minimo && (
                    <p className="text-xs text-gray-400">mín. {art.stock_minimo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={abrirCrear}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95">
        <Plus size={24} />
      </button>

      {/* Modal nuevo artículo */}
      {showModal && (
        <Modal title="Nuevo artículo" onClose={() => setShowModal(false)} size="lg">
          <div className="space-y-4">
            <Input label="Nombre *" value={form.nombre} error={errors.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del artículo" />

            <Select label="Categoría" value={form.categoria_id}
              onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Cantidad inicial *" type="number" min="0" step="0.01"
                value={form.cantidad} error={errors.cantidad}
                onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
              <Input label="Unidad" value={form.unidad}
                onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="ud, kg, m..." />
            </div>

            <Input label="Ubicación" value={form.ubicacion}
              onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Estantería A-3, Caja 7..." />

            <Input label="Stock mínimo (opcional)" type="number" min="0" step="0.01"
              value={form.stock_minimo}
              onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
              placeholder="Dejar vacío si no aplica" />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2} placeholder="Notas opcionales..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardar} className="flex-1">Crear artículo</Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
