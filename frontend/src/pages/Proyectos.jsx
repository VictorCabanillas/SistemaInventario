import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, Search, AlertTriangle, FolderOpen, MoreVertical, Edit2, Trash2, X, Download, Settings, Upload } from 'lucide-react'
import { getProyectos, createProyecto, updateProyecto, deleteProyecto, buscar, exportarExcel, getCategorias, createCategoria, deleteCategoria, getSalas, createSala, deleteSala, getOperadores, createOperador, deleteOperador, backupDB, restoreDB } from '../utils/api'
import { Modal, Button, Input, Toast, Spinner, EmptyState, ColorPicker, IconPicker, ProyectoIcon, Badge, DarkModeToggle, ConfirmDialog } from '../components/ui'
import { useDarkMode } from '../hooks/useDarkMode'

export default function Proyectos() {
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', color: '#3B82F6', icono: 'Package' })
  const [errors, setErrors] = useState({})
  const [confirmDlg, setConfirmDlg] = useState(null)

  // Settings
  const [showSettings, setShowSettings] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [nuevaCat, setNuevaCat] = useState('')
  const [salas, setSalas] = useState([])
  const [nuevaSala, setNuevaSala] = useState('')
  const [operadores, setOperadores] = useState([])
  const [nuevoOp, setNuevoOp] = useState('')
  const [loadingCats, setLoadingCats] = useState(false)

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
    } catch {
      showToast('Error al cargar proyectos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function realizarBusqueda(q) {
    if (!q.trim()) return
    setBuscando(true)
    try { setResultadosBusqueda(await buscar(q)) }
    catch { setResultadosBusqueda([]) }
    finally { setBuscando(false) }
  }

  function abrirCrear() {
    setEditando(null)
    setForm({ nombre: '', descripcion: '', color: '#3B82F6', icono: 'Package' })
    setErrors({})
    setShowModal(true)
  }

  function abrirEditar(p, e) {
    e.stopPropagation()
    setMenuAbierto(null)
    setEditando(p)
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', color: p.color, icono: p.icono || 'Package' })
    setErrors({})
    setShowModal(true)
  }

  async function handleExportar(p, e) {
    e.stopPropagation()
    setMenuAbierto(null)
    try { await exportarExcel(p.id, p.nombre); showToast('Excel generado') }
    catch { showToast('Error al exportar', 'error') }
  }

  function handleEliminar(p, e) {
    e.stopPropagation()
    setMenuAbierto(null)
    setConfirmDlg({
      title: `¿Eliminar "${p.nombre}"?`,
      message: 'Se eliminarán todos sus artículos y no se puede deshacer.',
      confirmLabel: 'Eliminar proyecto',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteProyecto(p.id)
          setProyectos(ps => ps.filter(x => x.id !== p.id))
          showToast('Proyecto eliminado')
        } catch (e) { showToast(e.message, 'error') }
      }
    })
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
    } catch (e) { showToast(e.message, 'error') }
  }

  // ── Settings ──────────────────────────────────────────────
  async function abrirSettings() {
    setShowSettings(true)
    setLoadingCats(true)
    try {
      const [cats, sls, ops] = await Promise.all([getCategorias(), getSalas(), getOperadores()])
      setCategorias(cats)
      setSalas(sls)
      setOperadores(ops)
    } catch { showToast('Error al cargar configuración', 'error') }
    finally { setLoadingCats(false) }
  }

  async function handleAddCat() {
    if (!nuevaCat.trim()) return
    try {
      const cat = await createCategoria({ nombre: nuevaCat.trim() })
      setCategorias(cs => [...cs, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevaCat('')
    } catch (e) { showToast(e.message, 'error') }
  }

  function handleDeleteCat(cat) {
    setConfirmDlg({
      title: `¿Eliminar "${cat.nombre}"?`,
      message: 'Los artículos con esta categoría quedarán sin categoría.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteCategoria(cat.id)
          setCategorias(cs => cs.filter(c => c.id !== cat.id))
        } catch (e) { showToast(e.message, 'error') }
      }
    })
  }

  async function handleAddSala() {
    if (!nuevaSala.trim()) return
    try {
      const sala = await createSala({ nombre: nuevaSala.trim() })
      setSalas(ss => [...ss, sala].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevaSala('')
    } catch (e) { showToast(e.message, 'error') }
  }

  function handleDeleteSala(sala) {
    setConfirmDlg({
      title: `¿Eliminar "${sala.nombre}"?`,
      message: 'Los artículos en esta sala quedarán sin sala asignada.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteSala(sala.id)
          setSalas(ss => ss.filter(s => s.id !== sala.id))
        } catch (e) { showToast(e.message, 'error') }
      }
    })
  }

  async function handleAddOperador() {
    if (!nuevoOp.trim()) return
    try {
      const op = await createOperador({ nombre: nuevoOp.trim() })
      setOperadores(os => [...os, op].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoOp('')
    } catch (e) { showToast(e.message, 'error') }
  }

  function handleDeleteOperador(op) {
    setConfirmDlg({
      title: `¿Eliminar "${op.nombre}"?`,
      message: 'El nombre ya no aparecerá en el desplegable de operadores.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteOperador(op.id)
          setOperadores(os => os.filter(o => o.id !== op.id))
        } catch (e) { showToast(e.message, 'error') }
      }
    })
  }

  async function handleBackup() {
    try { await backupDB(); showToast('Backup descargado') }
    catch { showToast('Error al generar backup', 'error') }
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setConfirmDlg({
      title: '¿Restaurar base de datos?',
      message: 'Esto reemplazará todos los datos actuales con el backup. La página se recargará.',
      confirmLabel: 'Restaurar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await restoreDB(file)
          showToast('Base de datos restaurada. Recargando...')
          setTimeout(() => window.location.reload(), 1500)
        } catch (e) { showToast(e.message, 'error') }
      }
    })
  }

  function showToast(message, type = 'success') { setToast({ message, type }) }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Inventario Almacén</h1>
                <p className="text-xs text-gray-400 dark:text-gray-500">{proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DarkModeToggle dark={dark} onToggle={toggleDark} />
              <button onClick={abrirSettings}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                title="Configuración">
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar artículos en todos los proyectos..."
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            {busqueda && (
              <button onClick={() => { setBusqueda(''); setResultadosBusqueda(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {resultadosBusqueda !== null ? (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
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
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: art.proyecto_color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{art.nombre}</span>
                        {art.bajo_minimo && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{art.proyecto_nombre} · {art.categoria_nombre || 'Sin categoría'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold text-sm ${art.bajo_minimo ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                        {art.cantidad} {art.unidad}
                      </p>
                      {(art.sala_nombre || art.ubicacion) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {[art.sala_nombre, art.ubicacion].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          loading ? <Spinner /> : proyectos.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Sin proyectos" description="Crea tu primer proyecto para empezar"
              action={<Button onClick={abrirCrear}>Crear proyecto</Button>} />
          ) : (
            <div className="space-y-3">
              {proyectos.map(p => (
                <div key={p.id} onClick={() => navigate(`/proyectos/${p.id}`)}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all group relative">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: p.color + '20' }}>
                      <ProyectoIcon icono={p.icono} color={p.color} size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{p.nombre}</h2>
                        {p.articulos_bajo_minimo > 0 && (
                          <Badge color="red"><AlertTriangle size={10} className="mr-1" />{p.articulos_bajo_minimo} bajo mínimo</Badge>
                        )}
                      </div>
                      {p.descripcion && <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{p.descripcion}</p>}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{p.total_articulos} artículo{p.total_articulos !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="relative">
                      <button onClick={e => { e.stopPropagation(); setMenuAbierto(menuAbierto === p.id ? null : p.id) }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                        <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                      </button>
                      {menuAbierto === p.id && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                          <button onClick={e => abrirEditar(p, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Edit2 size={14} /> Editar
                          </button>
                          <button onClick={e => handleExportar(p, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Download size={14} /> Descargar Excel
                          </button>
                          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                          <button onClick={e => handleEliminar(p, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
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
            <IconPicker value={form.icono} color={form.color} onChange={i => setForm(f => ({ ...f, icono: i }))} />
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardar} className="flex-1">{editando ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal configuración */}
      {showSettings && (
        <Modal title="Configuración" onClose={() => setShowSettings(false)} size="lg">
          <div className="space-y-6">
            {/* Backup */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Copia de seguridad</h3>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackup} className="flex-1 flex items-center justify-center gap-2">
                  <Download size={15} /> Descargar backup
                </Button>
                <label className="flex-1">
                  <div className="w-full px-4 py-2.5 text-sm rounded-xl font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                    <Upload size={15} /> Restaurar backup
                  </div>
                  <input type="file" accept=".db" className="hidden" onChange={handleRestore} />
                </label>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">El backup es el archivo de base de datos SQLite completo.</p>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* Categorías */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Categorías</h3>
              {loadingCats ? <Spinner /> : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                      placeholder="Nueva categoría..."
                      onKeyDown={e => e.key === 'Enter' && handleAddCat()} />
                    <Button onClick={handleAddCat} disabled={!nuevaCat.trim()}>Añadir</Button>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {categorias.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 group">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{cat.nombre}</span>
                        <button onClick={() => handleDeleteCat(cat)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-all">
                          <X size={13} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* Salas */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Salas / Ubicaciones</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={nuevaSala} onChange={e => setNuevaSala(e.target.value)}
                    placeholder="Nueva sala..."
                    onKeyDown={e => e.key === 'Enter' && handleAddSala()} />
                  <Button onClick={handleAddSala} disabled={!nuevaSala.trim()}>Añadir</Button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {salas.map(sala => (
                    <div key={sala.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 group">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{sala.nombre}</span>
                      <button onClick={() => handleDeleteSala(sala)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-all">
                        <X size={13} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* Operadores */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Operadores</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={nuevoOp} onChange={e => setNuevoOp(e.target.value)}
                    placeholder="Nombre del operador..."
                    onKeyDown={e => e.key === 'Enter' && handleAddOperador()} />
                  <Button onClick={handleAddOperador} disabled={!nuevoOp.trim()}>Añadir</Button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {operadores.map(op => (
                    <div key={op.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 group">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{op.nombre}</span>
                      <button onClick={() => handleDeleteOperador(op)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-all">
                        <X size={13} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {confirmDlg && <ConfirmDialog {...confirmDlg} onCancel={() => setConfirmDlg(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {menuAbierto && <div className="fixed inset-0 z-0" onClick={() => setMenuAbierto(null)} />}
    </div>
  )
}
