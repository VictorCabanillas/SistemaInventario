import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, AlertTriangle, Package, Search, X, Download, Upload, Filter, MoreVertical, Edit2, Trash2, Sliders, ArrowUpDown } from 'lucide-react'
import { getArticulos, getArticulosGlobal, getProyectos, getCategorias, getSalas, getOperadores, createArticulo, exportarExcel, updateProyecto, deleteProyecto, createMovimientosBulk, getStockProyecto, getStockGlobal } from '../utils/api'
import { Spinner, EmptyState, Toast, Badge, Modal, Input, Select, Button, ProyectoIcon, ColorPicker, IconPicker, DarkModeToggle, ConfirmDialog } from '../components/ui'
import ImportarExcelModal from '../components/ImportarExcelModal'
import { useDarkMode } from '../hooks/useDarkMode'

export default function Articulos() {
  const { proyectoId } = useParams()
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [articulos, setArticulos] = useState([])
  const [proyecto, setProyecto] = useState(null)
  const [proyectosLista, setProyectosLista] = useState([])
  const [categorias, setCategorias] = useState([])
  const [salas, setSalas] = useState([])
  const [operadores, setOperadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)
  const [ordenar, setOrdenar] = useState('nombre_asc')
  const [showModal, setShowModal] = useState(false)
  const [showMenuProyecto, setShowMenuProyecto] = useState(false)
  const [showEditProyecto, setShowEditProyecto] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [formProyecto, setFormProyecto] = useState({ nombre: '', descripcion: '', color: '#3B82F6', icono: 'Package' })
  const [toast, setToast] = useState(null)
  const [confirmDlg, setConfirmDlg] = useState(null)
  const [form, setForm] = useState({ nombre: '', marca: '', referencia: '', proyecto_id: '', categoria_id: '', sala_id: '', cantidad: '', unidad: 'ud', ubicacion: '', stock_minimo: '', notas: '' })
  const [errors, setErrors] = useState({})
  const [bulkItems, setBulkItems] = useState([])
  const [bulkOperador, setBulkOperador] = useState('')
  const [bulkMotivo, setBulkMotivo] = useState('')
  const [bulkErrors, setBulkErrors] = useState({})

  useEffect(() => { cargar() }, [proyectoId])

  async function cargar() {
    try {
      const [proyects, cats, sls, ops] = await Promise.all([
        getProyectos(),
        getCategorias(),
        getSalas(),
        getOperadores()
      ])
      const proyectoActual = proyects.find(p => p.id === parseInt(proyectoId))
      const arts = proyectoActual?.es_almacen ? await getArticulosGlobal() : await getArticulos(proyectoId)
      setArticulos(arts)
      setProyecto(proyectoActual)
      setProyectosLista(proyects)
      setCategorias(cats)
      setSalas(sls)
      setOperadores(ops)
    } catch {
      showToast('Error al cargar', 'error')
    } finally {
      setLoading(false)
    }
  }

  const esAlmacen = !!proyecto?.es_almacen

  const articulosFiltrados = (() => {
    const list = articulos.filter(a => {
      const matchNombre = a.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (a.ubicacion || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (a.marca || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (a.referencia || '').toLowerCase().includes(filtro.toLowerCase())
      const matchCat = !filtroCat || a.categoria_id === parseInt(filtroCat)
      return matchNombre && matchCat
    })
    switch (ordenar) {
      case 'nombre_desc': list.sort((a, b) => b.nombre.localeCompare(a.nombre)); break
      case 'cantidad_asc': list.sort((a, b) => a.cantidad - b.cantidad); break
      case 'cantidad_desc': list.sort((a, b) => b.cantidad - a.cantidad); break
      case 'alertas': list.sort((a, b) => (b.bajo_minimo ? 1 : 0) - (a.bajo_minimo ? 1 : 0)); break
      default: list.sort((a, b) => a.nombre.localeCompare(b.nombre)); break
    }
    return list
  })()

  const bajosMinimo = articulos.filter(a => a.bajo_minimo).length

  async function handleGuardar() {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Obligatorio'
    if (form.cantidad === '' || isNaN(parseFloat(form.cantidad))) errs.cantidad = 'Cantidad inválida'
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      await createArticulo({
        proyecto_id: form.proyecto_id ? parseInt(form.proyecto_id) : parseInt(proyectoId),
        nombre: form.nombre,
        marca: form.marca || '',
        referencia: form.referencia || '',
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        sala_id: form.sala_id ? parseInt(form.sala_id) : null,
        cantidad: parseFloat(form.cantidad),
        unidad: form.unidad || 'ud',
        ubicacion: form.ubicacion || null,
        stock_minimo: form.stock_minimo ? parseFloat(form.stock_minimo) : null,
        notas: form.notas || null,
      })
      // Refetch (no append optimista): si el artículo ya existía en el catálogo
      // (misma marca+referencia), esto suma cantidad a una fila existente en vez
      // de crear una nueva.
      await cargar()
      setShowModal(false)
      showToast('Artículo creado')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  function abrirEditarProyecto() {
    setFormProyecto({
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion || '',
      color: proyecto.color,
      icono: proyecto.icono || 'Package'
    })
    setShowMenuProyecto(false)
    setShowEditProyecto(true)
  }

  async function handleGuardarProyecto() {
    if (!formProyecto.nombre.trim()) return
    try {
      const updated = await updateProyecto(proyecto.id, formProyecto)
      setProyecto(p => ({ ...p, ...updated }))
      setShowEditProyecto(false)
      showToast('Proyecto actualizado')
    } catch {
      showToast('Error al guardar', 'error')
    }
  }

  function handleEliminarProyecto() {
    setShowMenuProyecto(false)
    setConfirmDlg({
      title: '¿Eliminar proyecto?',
      message: `Se eliminarán "${proyecto.nombre}" y todos sus artículos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteProyecto(proyecto.id)
          navigate('/')
        } catch {
          showToast('Error al eliminar', 'error')
        }
      }
    })
  }

  async function handleExportar() {
    try {
      await exportarExcel(proyectoId, proyecto?.nombre || 'proyecto')
      showToast('Excel generado')
    } catch {
      showToast('Error al exportar', 'error')
    }
  }


  async function abrirBulk() {
    try {
      const lineas = esAlmacen ? await getStockGlobal() : await getStockProyecto(proyectoId)
      setBulkItems(lineas.map(l => ({ ...l, nuevaCantidad: '' })))
      setBulkOperador('')
      setBulkMotivo('')
      setBulkErrors({})
      setShowBulkModal(true)
    } catch {
      showToast('Error al cargar el stock', 'error')
    }
  }

  async function handleBulkGuardar() {
    const errs = {}
    if (!bulkOperador.trim()) errs.operador = 'El nombre es obligatorio'

    const movimientos = bulkItems
      .filter(a => a.nuevaCantidad !== '' && !isNaN(parseFloat(a.nuevaCantidad)) && parseFloat(a.nuevaCantidad) !== a.cantidad && parseFloat(a.nuevaCantidad) >= 0)
      .map(a => {
        const nueva = parseFloat(a.nuevaCantidad)
        return {
          stock_id: a.stock_id,
          tipo: nueva > a.cantidad ? 'entrada' : 'salida',
          cantidad: Math.abs(nueva - a.cantidad),
          operador: bulkOperador,
          motivo: bulkMotivo || null,
        }
      })

    if (movimientos.length === 0) errs.items = 'Introduce al menos una cantidad diferente'
    if (Object.keys(errs).length) { setBulkErrors(errs); return }

    try {
      await createMovimientosBulk(movimientos)
      await cargar()
      setShowBulkModal(false)
      showToast(`${movimientos.length} artículo${movimientos.length !== 1 ? 's' : ''} actualizado${movimientos.length !== 1 ? 's' : ''}`)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  function abrirCrear() {
    setForm({ nombre: '', marca: '', referencia: '', proyecto_id: proyectoId, categoria_id: '', sala_id: '', cantidad: '0', unidad: 'ud', ubicacion: '', stock_minimo: '', notas: '' })
    setErrors({})
    setShowModal(true)
  }

  const hayFiltrosActivos = filtroCat || ordenar !== 'nombre_asc'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            {proyecto && (
              <>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: proyecto.color + '20' }}>
                  <ProyectoIcon icono={proyecto.icono} color={proyecto.color} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-bold text-gray-900 dark:text-gray-50 truncate">{proyecto.nombre}</h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{articulos.length} artículo{articulos.length !== 1 ? 's' : ''}</span>
                    {bajosMinimo > 0 && (
                      <Badge color="red">
                        <AlertTriangle size={10} className="mr-1" />
                        {bajosMinimo} bajo mínimo
                      </Badge>
                    )}
                  </div>
                </div>
                <DarkModeToggle dark={dark} onToggle={toggleDark} />
                <button onClick={abrirBulk}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Ajuste masivo de stock">
                  <Sliders size={18} />
                </button>
                {/* Menú del proyecto */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenuProyecto(m => !m)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreVertical size={18} />
                  </button>
                  {showMenuProyecto && (
                    <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 min-w-[170px] py-1">
                      <button onClick={abrirEditarProyecto}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Edit2 size={14} /> Editar proyecto
                      </button>
                      <button onClick={() => { setShowMenuProyecto(false); handleExportar() }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Download size={14} /> Descargar Excel
                      </button>
                      <button onClick={() => { setShowMenuProyecto(false); setShowImportModal(true) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Upload size={14} /> Importar Excel
                      </button>
                      {!proyecto.es_almacen && (
                        <>
                          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                          <button onClick={handleEliminarProyecto}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                            <Trash2 size={14} /> Eliminar proyecto
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Búsqueda y filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={filtro} onChange={e => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o ubicación..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              {filtro && (
                <button onClick={() => setFiltro('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFiltros(f => !f)}
              className={`px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                hayFiltrosActivos
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              <Filter size={16} />
            </button>
          </div>

          {showFiltros && (
            <div className="mt-2 flex gap-2">
              <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none">
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none">
                <option value="nombre_asc">Nombre A-Z</option>
                <option value="nombre_desc">Nombre Z-A</option>
                <option value="cantidad_asc">Cantidad ↑</option>
                <option value="cantidad_desc">Cantidad ↓</option>
                <option value="alertas">Alertas primero</option>
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
              <div key={`${art.id}-${art.proyecto_id}`}
                onClick={() => navigate(`/proyectos/${art.proyecto_id}/articulos/${art.id}`)}
                className={`rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all flex items-center gap-4
                  ${art.bajo_minimo
                    ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{art.nombre}</span>
                    {art.bajo_minimo && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                  </div>
                  {(art.marca || art.referencia) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {[art.marca, art.referencia].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {esAlmacen && art.proyecto_nombre && <Badge hex={art.proyecto_color}>{art.proyecto_nombre}</Badge>}
                    {art.categoria_nombre && <Badge>{art.categoria_nombre}</Badge>}
                    {art.num_ubicaciones > 1 ? (
                      <Badge>{art.num_ubicaciones} ubicaciones</Badge>
                    ) : (art.sala_nombre || art.ubicacion) && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        📍 {[art.sala_nombre, art.ubicacion].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-base ${art.bajo_minimo ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {art.cantidad}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{art.unidad}</p>
                  {art.stock_minimo && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">mín. {art.stock_minimo}</p>
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

            {esAlmacen && (
              <Select label="Proyecto *" value={form.proyecto_id}
                onChange={e => setForm(f => ({ ...f, proyecto_id: e.target.value }))}>
                {proyectosLista.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="Marca" value={form.marca}
                onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ej: Bosch" />
              <Input label="Referencia" value={form.referencia}
                onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} placeholder="Ej: GSR-120" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
              Nombre + marca + referencia identifican el artículo en el catálogo. Si ya existe y además coincide
              la ubicación (Armario/Balda) en {esAlmacen ? 'el proyecto seleccionado' : 'este proyecto'}, se sumará
              la cantidad a esa ubicación; si la ubicación es distinta, se creará como una ubicación nueva.
            </p>

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

            <div className="grid grid-cols-2 gap-3">
              <Select label="Sala" value={form.sala_id}
                onChange={e => setForm(f => ({ ...f, sala_id: e.target.value }))}>
                <option value="">Sin sala</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
              <Input label="Armario / Balda" value={form.ubicacion}
                onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: B/2" />
            </div>

            <Input label="Stock mínimo (opcional)" type="number" min="0" step="0.01"
              value={form.stock_minimo}
              onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
              placeholder="Dejar vacío si no aplica" />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2} placeholder="Notas opcionales..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardar} className="flex-1">Crear artículo</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar proyecto */}
      {showEditProyecto && (
        <Modal title="Editar proyecto" onClose={() => setShowEditProyecto(false)}>
          <div className="space-y-4">
            <Input label="Nombre *" value={formProyecto.nombre}
              onChange={e => setFormProyecto(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del proyecto" />
            <Input label="Descripción" value={formProyecto.descripcion}
              onChange={e => setFormProyecto(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción opcional" />
            <ColorPicker value={formProyecto.color} onChange={c => setFormProyecto(f => ({ ...f, color: c }))} />
            <IconPicker value={formProyecto.icono} color={formProyecto.color}
              onChange={i => setFormProyecto(f => ({ ...f, icono: i }))} />
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowEditProyecto(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardarProyecto} className="flex-1">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal ajuste masivo */}
      {showBulkModal && (
        <Modal title="Ajuste masivo de stock" onClose={() => setShowBulkModal(false)} size="xl">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Introduce la nueva cantidad para los artículos que quieras ajustar. Los campos vacíos no se modificarán.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {bulkItems.map((art, i) => (
                <div key={art.stock_id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {art.nombre}
                      {esAlmacen && art.proyecto_nombre && <span className="text-gray-400 dark:text-gray-500 font-normal"> · {art.proyecto_nombre}</span>}
                      {art.ubicacion && <span className="text-gray-400 dark:text-gray-500 font-normal"> · {art.ubicacion}</span>}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Actual: {art.cantidad} {art.unidad}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={String(art.cantidad)}
                      value={art.nuevaCantidad}
                      onChange={e => setBulkItems(items => items.map((it, j) => j === i ? { ...it, nuevaCantidad: e.target.value } : it))}
                      className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right"
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-8">{art.unidad}</span>
                  </div>
                </div>
              ))}
            </div>

            {bulkErrors.items && <p className="text-xs text-red-500">{bulkErrors.items}</p>}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Select label="Operador *" value={bulkOperador} error={bulkErrors.operador}
                onChange={e => setBulkOperador(e.target.value)}>
                <option value="">Selecciona operador...</option>
                {operadores.map(op => <option key={op.id} value={op.nombre}>{op.nombre}</option>)}
              </Select>
              <Input label="Motivo (opcional)"
                value={bulkMotivo}
                onChange={e => setBulkMotivo(e.target.value)}
                placeholder="Inventario, corrección..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowBulkModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleBulkGuardar} className="flex-1">Aplicar ajuste</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal importar Excel */}
      {showImportModal && (
        <ImportarExcelModal
          proyectoId={proyectoId}
          nombreProyecto={proyecto?.nombre}
          onClose={() => setShowImportModal(false)}
          onImportado={cargar}
          showToast={showToast}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {confirmDlg && (
        <ConfirmDialog
          {...confirmDlg}
          onCancel={() => setConfirmDlg(null)}
        />
      )}

      {/* Overlay para cerrar menú del proyecto */}
      {showMenuProyecto && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMenuProyecto(false)} />
      )}
    </div>
  )
}
