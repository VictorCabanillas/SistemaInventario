import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Edit2, Trash2, AlertTriangle, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { getArticulo, updateArticulo, deleteArticulo, createMovimiento, getMovimientos, getCategorias } from '../utils/api'
import { Modal, Button, Input, Select, Toast, Spinner, Badge } from '../components/ui'

export default function DetalleArticulo() {
  const { proyectoId, articuloId } = useParams()
  const navigate = useNavigate()
  const [articulo, setArticulo] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistorial, setShowHistorial] = useState(false)
  const [modal, setModal] = useState(null) // 'editar' | 'stock'
  const [toast, setToast] = useState(null)

  // Formulario editar info
  const [formInfo, setFormInfo] = useState({})
  const [errorsInfo, setErrorsInfo] = useState({})

  // Formulario stock
  const [formStock, setFormStock] = useState({ tipo: 'entrada', cantidad: '', operador: '', motivo: '' })
  const [errorsStock, setErrorsStock] = useState({})

  useEffect(() => { cargar() }, [articuloId])

  async function cargar() {
    try {
      const [art, cats, movs] = await Promise.all([
        getArticulo(articuloId),
        getCategorias(),
        getMovimientos(articuloId)
      ])
      setArticulo(art)
      setCategorias(cats)
      setMovimientos(movs)
      setFormInfo({
        nombre: art.nombre,
        categoria_id: art.categoria_id || '',
        unidad: art.unidad,
        ubicacion: art.ubicacion || '',
        stock_minimo: art.stock_minimo || '',
        notas: art.notas || ''
      })
    } catch (e) {
      showToast('Error al cargar artículo', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardarInfo() {
    const errs = {}
    if (!formInfo.nombre?.trim()) errs.nombre = 'Obligatorio'
    if (Object.keys(errs).length) { setErrorsInfo(errs); return }

    try {
      const updated = await updateArticulo(articuloId, {
        nombre: formInfo.nombre,
        categoria_id: formInfo.categoria_id ? parseInt(formInfo.categoria_id) : null,
        unidad: formInfo.unidad,
        ubicacion: formInfo.ubicacion || null,
        stock_minimo: formInfo.stock_minimo ? parseFloat(formInfo.stock_minimo) : null,
        notas: formInfo.notas || null,
      })
      setArticulo(updated)
      setModal(null)
      showToast('Información actualizada')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleMovimiento() {
    const errs = {}
    if (!formStock.cantidad || isNaN(parseFloat(formStock.cantidad)) || parseFloat(formStock.cantidad) <= 0)
      errs.cantidad = 'Introduce una cantidad válida'
    if (!formStock.operador.trim()) errs.operador = 'El nombre es obligatorio'
    if (Object.keys(errs).length) { setErrorsStock(errs); return }

    try {
      const updated = await createMovimiento({
        articulo_id: parseInt(articuloId),
        tipo: formStock.tipo,
        cantidad: parseFloat(formStock.cantidad),
        operador: formStock.operador,
        motivo: formStock.motivo || null,
      })
      setArticulo(updated)
      // Recargar historial
      const movs = await getMovimientos(articuloId)
      setMovimientos(movs)
      setModal(null)
      showToast(formStock.tipo === 'entrada' ? 'Stock añadido' : 'Stock retirado')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleEliminar() {
    if (!confirm(`¿Eliminar "${articulo.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteArticulo(articuloId)
      showToast('Artículo eliminado')
      setTimeout(() => navigate(`/proyectos/${proyectoId}`), 500)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  function abrirStock(tipo) {
    setFormStock({ tipo, cantidad: '', operador: '', motivo: '' })
    setErrorsStock({})
    setModal('stock')
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner /></div>
  if (!articulo) return null

  const bajominimo = articulo.bajo_minimo

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(`/proyectos/${proyectoId}`)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{articulo.nombre}</h1>
            <p className="text-xs text-gray-400">{articulo.categoria_nombre || 'Sin categoría'}</p>
          </div>
          <button onClick={handleEliminar} className="p-2 rounded-xl hover:bg-red-50 transition-colors">
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Tarjeta principal de stock */}
        <div className={`rounded-2xl p-6 text-center ${bajominimo ? 'bg-red-50 border-2 border-red-200' : 'bg-white border border-gray-200'}`}>
          {bajominimo && (
            <div className="flex items-center justify-center gap-1.5 text-red-600 text-sm font-medium mb-3">
              <AlertTriangle size={14} />
              Stock bajo mínimo
            </div>
          )}
          <div className={`text-6xl font-bold mb-1 ${bajominimo ? 'text-red-700' : 'text-gray-900'}`}>
            {articulo.cantidad}
          </div>
          <div className="text-gray-400 text-sm">{articulo.unidad}</div>
          {articulo.stock_minimo && (
            <div className="text-xs text-gray-400 mt-1">Mínimo: {articulo.stock_minimo} {articulo.unidad}</div>
          )}

          {/* Botones de stock */}
          <div className="flex gap-3 mt-6">
            <button onClick={() => abrirStock('salida')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
              <Minus size={18} /> Retirar
            </button>
            <button onClick={() => abrirStock('entrada')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">
              <Plus size={18} /> Añadir
            </button>
          </div>
        </div>

        {/* Información del artículo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Información</h2>
            <button onClick={() => { setErrorsInfo({}); setModal('editar') }}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Edit2 size={14} /> Editar
            </button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Ubicación', value: articulo.ubicacion },
              { label: 'Unidad de medida', value: articulo.unidad },
              { label: 'Stock mínimo', value: articulo.stock_minimo ? `${articulo.stock_minimo} ${articulo.unidad}` : null },
              { label: 'Notas', value: articulo.notas },
            ].map(({ label, value }) => value ? (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xs font-medium text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-700">{value}</span>
              </div>
            ) : null)}
          </div>
        </div>

        {/* Historial de movimientos */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button onClick={() => setShowHistorial(h => !h)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span className="font-semibold text-gray-800">Historial</span>
              <Badge>{movimientos.length}</Badge>
            </div>
            {showHistorial ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {showHistorial && (
            <div className="border-t border-gray-100">
              {movimientos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin movimientos registrados</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {movimientos.map(mov => (
                    <div key={mov.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                        ${mov.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {mov.tipo === 'entrada'
                          ? <Plus size={13} className="text-green-600" />
                          : <Minus size={13} className="text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{mov.operador}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(mov.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {mov.motivo && ` · ${mov.motivo}`}
                        </p>
                      </div>
                      <span className={`font-bold text-sm flex-shrink-0 ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal editar información */}
      {modal === 'editar' && (
        <Modal title="Editar información" onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            <Input label="Nombre *" value={formInfo.nombre} error={errorsInfo.nombre}
              onChange={e => setFormInfo(f => ({ ...f, nombre: e.target.value }))} />
            <Select label="Categoría" value={formInfo.categoria_id}
              onChange={e => setFormInfo(f => ({ ...f, categoria_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Unidad" value={formInfo.unidad}
                onChange={e => setFormInfo(f => ({ ...f, unidad: e.target.value }))} placeholder="ud, kg, m..." />
              <Input label="Stock mínimo" type="number" min="0" step="0.01"
                value={formInfo.stock_minimo}
                onChange={e => setFormInfo(f => ({ ...f, stock_minimo: e.target.value }))}
                placeholder="Opcional" />
            </div>
            <Input label="Ubicación" value={formInfo.ubicacion}
              onChange={e => setFormInfo(f => ({ ...f, ubicacion: e.target.value }))}
              placeholder="Estantería, caja..." />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Notas</label>
              <textarea value={formInfo.notas} onChange={e => setFormInfo(f => ({ ...f, notas: e.target.value }))}
                rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardarInfo} className="flex-1">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar stock */}
      {modal === 'stock' && (
        <Modal
          title={formStock.tipo === 'entrada' ? 'Añadir stock' : 'Retirar stock'}
          onClose={() => setModal(null)}>
          <div className="space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {['entrada', 'salida'].map(t => (
                <button key={t} onClick={() => setFormStock(f => ({ ...f, tipo: t }))}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors border
                    ${formStock.tipo === t
                      ? t === 'entrada' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                  {t === 'entrada' ? '+ Añadir' : '- Retirar'}
                </button>
              ))}
            </div>

            <Input
              label="Cantidad *"
              type="number" min="0.01" step="0.01"
              value={formStock.cantidad}
              error={errorsStock.cantidad}
              onChange={e => setFormStock(f => ({ ...f, cantidad: e.target.value }))}
              placeholder={`Cantidad en ${articulo.unidad}`}
            />

            {/* Stock resultante (preview) */}
            {formStock.cantidad && !isNaN(parseFloat(formStock.cantidad)) && (
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Stock resultante</p>
                <p className={`text-2xl font-bold ${
                  (formStock.tipo === 'entrada'
                    ? articulo.cantidad + parseFloat(formStock.cantidad)
                    : articulo.cantidad - parseFloat(formStock.cantidad)) < 0
                    ? 'text-red-600' : 'text-gray-800'
                }`}>
                  {formStock.tipo === 'entrada'
                    ? articulo.cantidad + parseFloat(formStock.cantidad)
                    : articulo.cantidad - parseFloat(formStock.cantidad)
                  } {articulo.unidad}
                </p>
              </div>
            )}

            <Input
              label="¿Quién realiza el movimiento? *"
              value={formStock.operador}
              error={errorsStock.operador}
              onChange={e => setFormStock(f => ({ ...f, operador: e.target.value }))}
              placeholder="Tu nombre"
            />

            <Input
              label="Motivo (opcional)"
              value={formStock.motivo}
              onChange={e => setFormStock(f => ({ ...f, motivo: e.target.value }))}
              placeholder="Uso en obra, reposición, inventario..."
            />

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button
                variant={formStock.tipo === 'salida' ? 'danger' : 'primary'}
                onClick={handleMovimiento} className="flex-1">
                {formStock.tipo === 'entrada' ? 'Añadir' : 'Retirar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
