import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, Search, AlertTriangle, FolderOpen, MoreVertical, Edit2, Trash2, X } from 'lucide-react'
import { getProyectos, createProyecto, updateProyecto, deleteProyecto, buscar } from '../utils/api'
import { Modal, Button, Input, Toast, Spinner, EmptyState, ColorPicker, Badge } from '../components/ui'

export default function Proyectos() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', color: '#3B82F6' })
  const [errors, setErrors] = useState({})

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!busqueda.trim()) { setResultadosBusqueda(null); return }
    const t = setTimeout(() => realizarBusqueda(busqueda), 400)
    return () => clearTimeout(t)
  }, [busqueda])

  async function cargar() {
    try {
      const data = await getProyectos()
      setProyectos(data)
    } catch (e) {
      showToast('Error al cargar proyectos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function realizarBusqueda(q) {
    if (!q.trim()) return
    setBuscando(true)
    try {
      const res = await buscar(q)
      setResultadosBusqueda(res)
    } catch (e) {
      setResultadosBusqueda([])
    } finally {
      setBuscando(false)
    }
  }

  function abrirCrear() {
    setEditando(null)
    setForm({ nombre: '', descripcion: '', color: '#3B82F6' })
    setErrors({})
    setShowModal(true)
  }

  function abrirEditar(p, e) {
    e.stopPropagation()
    setMenuAbierto(null)
    setEditando(p)
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', color: p.color })
    setErrors({})
    setShowModal(true)
  }

  async function handleEliminar(p, e) {
    e.stopPropagation()
    setMenuAbierto(null)
    if (!confirm(`¿Eliminar el proyecto "${p.nombre}"? Se eliminarán todos sus artículos.`)) return
    try {
      await deleteProyecto(p.id)
      setProyectos(ps => ps.filter(x => x.id !== p.id))
      showToast('Proyecto eliminado')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleGuardar() {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      if (editando) {
        const updated = await updateProyecto(editando.id, form)
        setProyectos(ps => ps.map(p => p.id === editando.id ? updated : p))
        showToast('Proyecto actualizado')
      } else {
        const nuevo = await createProyecto(form)
        setProyectos(ps => [...ps, nuevo])
        showToast('Proyecto creado')
      }
      setShowModal(false)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Inventario Almacén</h1>
                <p className="text-xs text-gray-400">{proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Buscador global */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar artículos en todos los proyectos..."
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {busqueda && (
              <button onClick={() => { setBusqueda(''); setResultadosBusqueda(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Resultados de búsqueda */}
        {resultadosBusqueda !== null ? (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              {buscando ? 'Buscando...' : `${resultadosBusqueda.length} resultado${resultadosBusqueda.length !== 1 ? 's' : ''} para "${busqueda}"`}
            </p>
            {resultadosBusqueda.length === 0 && !buscando ? (
              <div className="text-center py-12 text-gray-400">
                <Search size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resultadosBusqueda.map(art => (
                  <div key={art.id}
                    onClick={() => navigate(`/proyectos/${art.proyecto_id}/articulos/${art.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: art.proyecto_color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm truncate">{art.nombre}</span>
                        {art.bajo_minimo && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400">{art.proyecto_nombre} · {art.categoria_nombre || 'Sin categoría'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold text-sm ${art.bajo_minimo ? 'text-red-600' : 'text-gray-800'}`}>
                        {art.cantidad} {art.unidad}
                      </p>
                      {art.ubicacion && <p className="text-xs text-gray-400">{art.ubicacion}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Lista de proyectos */
          loading ? <Spinner /> : proyectos.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Sin proyectos"
              description="Crea tu primer proyecto para empezar"
              action={<Button onClick={abrirCrear}>Crear proyecto</Button>}
            />
          ) : (
            <div className="space-y-3">
              {proyectos.map(p => (
                <div key={p.id}
                  onClick={() => navigate(`/proyectos/${p.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all group relative">

                  <div className="flex items-start gap-4">
                    {/* Color indicator */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: p.color + '20' }}>
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900">{p.nombre}</h2>
                        {p.articulos_bajo_minimo > 0 && (
                          <Badge color="red">
                            <AlertTriangle size={10} className="mr-1" />
                            {p.articulos_bajo_minimo} bajo mínimo
                          </Badge>
                        )}
                      </div>
                      {p.descripcion && <p className="text-sm text-gray-400 truncate">{p.descripcion}</p>}
                      <p className="text-xs text-gray-400 mt-1">{p.total_articulos} artículo{p.total_articulos !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setMenuAbierto(menuAbierto === p.id ? null : p.id) }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all">
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                      {menuAbierto === p.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[140px] py-1">
                          <button onClick={e => abrirEditar(p, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Edit2 size={14} /> Editar
                          </button>
                          <button onClick={e => handleEliminar(p, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* FAB */}
      {resultadosBusqueda === null && (
        <button onClick={abrirCrear}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95">
          <Plus size={24} />
        </button>
      )}

      {/* Modal crear/editar proyecto */}
      {showModal && (
        <Modal title={editando ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <Input label="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              error={errors.nombre} placeholder="Nombre del proyecto" />
            <Input label="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción opcional" />
            <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardar} className="flex-1">{editando ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Cerrar menú al hacer click fuera */}
      {menuAbierto && <div className="fixed inset-0 z-0" onClick={() => setMenuAbierto(null)} />}
    </div>
  )
}
