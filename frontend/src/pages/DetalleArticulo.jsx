import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Edit2, Trash2, AlertTriangle, Clock, Package, ChevronDown, ChevronUp, ArrowRightLeft, Ban, Wrench, MapPin, Merge, X, Image as ImageIcon } from 'lucide-react'
import {
  getArticulo, getStockArticulo, updateArticulo, updateStock, deleteArticulo, deleteStock,
  createMovimiento, createEntrada, createTransferencia, createBaja, createReparacion,
  getMovimientos, getCategorias, getProyectos, getSalas, getOperadores,
  getSugerencias, buscarCatalogo, fusionarArticulo,
  subirImagenesArticulo, eliminarImagenArticulo
} from '../utils/api'
import { Modal, Button, Input, Select, Toast, Spinner, Badge, DarkModeToggle, ConfirmDialog } from '../components/ui'
import { useDarkMode } from '../hooks/useDarkMode'

const SIN_UBICACION = '(sin ubicación)'
const NUEVA_UBICACION = '__nueva__'

export default function DetalleArticulo() {
  const { proyectoId, articuloId } = useParams()
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [articulo, setArticulo] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [salas, setSalas] = useState([])
  const [operadores, setOperadores] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [stockOtrosProyectos, setStockOtrosProyectos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistorial, setShowHistorial] = useState(false)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDlg, setConfirmDlg] = useState(null)

  const [formInfo, setFormInfo] = useState({})
  const [errorsInfo, setErrorsInfo] = useState({})

  const [formStock, setFormStock] = useState({ tipo: 'entrada', cantidad: '', operador: '', motivo: '' })
  const [errorsStock, setErrorsStock] = useState({})

  const [formMover, setFormMover] = useState({ stockId: '', proyecto_destino: '', cantidad: '', operador: '', motivo: '' })
  const [errorsMover, setErrorsMover] = useState({})

  const [formUbicacion, setFormUbicacion] = useState({ stockId: null, ubicacion: '', sala_id: '' })
  const [errorsUbicacion, setErrorsUbicacion] = useState({})

  const [formReparar, setFormReparar] = useState({ stockId: null, disponible: 0, cantidad: '', operador: '', motivo: '', ubicacionDestino: '', salaDestino: '' })
  const [errorsReparar, setErrorsReparar] = useState({})

  const [sugerencias, setSugerencias] = useState({ nombres: [], marcas: [], referencias: [], ubicaciones: [] })
  const [fusionQuery, setFusionQuery] = useState('')
  const [fusionResultados, setFusionResultados] = useState([])
  const [fusionBuscando, setFusionBuscando] = useState(false)
  const [fusionSeleccionado, setFusionSeleccionado] = useState(null)
  const [fusionando, setFusionando] = useState(false)

  const [subiendoImagenes, setSubiendoImagenes] = useState(false)
  const [imagenAmpliada, setImagenAmpliada] = useState(null)

  useEffect(() => {
    setLoading(true)
    cargar()
      .catch(() => showToast('Error al cargar artículo', 'error'))
      .finally(() => setLoading(false))
  }, [proyectoId, articuloId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargar() {
    const art = await getArticulo(proyectoId, articuloId)
    const [movs, proyects, sls, ops, stockOtros, cats, sug] = await Promise.all([
      getMovimientos(art.id),
      getProyectos(),
      getSalas(),
      getOperadores(),
      getStockArticulo(art.id),
      getCategorias(),
      getSugerencias(),
    ])
    setArticulo(art)
    setMovimientos(movs)
    setProyectos(proyects)
    setSalas(sls)
    setOperadores(ops)
    setCategorias(cats)
    setSugerencias(sug)
    setStockOtrosProyectos(stockOtros.filter(s => s.proyecto_id !== parseInt(proyectoId)))
    setFormInfo({
      nombre: art.nombre,
      marca: art.marca || '',
      referencia: art.referencia || '',
      categoria_id: art.categoria_id || '',
      unidad: art.unidad,
      stock_minimo: art.stock_minimo || '',
      notas: art.notas || ''
    })
    return art
  }

  async function handleGuardarInfo() {
    const errs = {}
    if (!formInfo.nombre?.trim()) errs.nombre = 'Obligatorio'
    if (Object.keys(errs).length) { setErrorsInfo(errs); return }

    try {
      await updateArticulo(articulo.id, {
        nombre: formInfo.nombre,
        marca: formInfo.marca,
        referencia: formInfo.referencia,
        categoria_id: formInfo.categoria_id ? parseInt(formInfo.categoria_id) : null,
        unidad: formInfo.unidad,
        stock_minimo: formInfo.stock_minimo ? parseFloat(formInfo.stock_minimo) : null,
        notas: formInfo.notas || null,
      })
      setModal(null)
      await cargar()
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
    if (formStock.tipo === 'salida' && !formStock.stockId) errs.stockId = 'Selecciona de qué ubicación'
    if (formStock.tipo === 'entrada' && articulo.ubicaciones.length > 0 && formStock.ubicacionModo === 'existente' && !formStock.stockId)
      errs.stockId = 'Selecciona una ubicación'
    if (Object.keys(errs).length) { setErrorsStock(errs); return }

    const cantidad = parseFloat(formStock.cantidad)
    try {
      if (formStock.tipo === 'salida' && formStock.esBaja) {
        await createBaja({
          stock_id: parseInt(formStock.stockId), cantidad,
          operador: formStock.operador, motivo: formStock.motivo || null,
          ubicacion_destino: formStock.ubicacionBaja || null,
          sala_destino_id: formStock.salaBaja ? parseInt(formStock.salaBaja) : null,
        })
      } else if (formStock.tipo === 'entrada' && (articulo.ubicaciones.length === 0 || formStock.ubicacionModo === 'nueva')) {
        await createEntrada({
          articulo_id: articulo.id, proyecto_id: parseInt(proyectoId),
          ubicacion: formStock.ubicacionNueva || null,
          sala_id: formStock.salaNueva ? parseInt(formStock.salaNueva) : null,
          cantidad, operador: formStock.operador, motivo: formStock.motivo || null,
        })
      } else if (formStock.tipo === 'entrada') {
        await createEntrada({
          stock_id: parseInt(formStock.stockId),
          cantidad, operador: formStock.operador, motivo: formStock.motivo || null,
        })
      } else {
        await createMovimiento({
          stock_id: parseInt(formStock.stockId), tipo: 'salida',
          cantidad, operador: formStock.operador, motivo: formStock.motivo || null,
        })
      }
      setModal(null)
      await cargar()
      showToast(
        formStock.esBaja ? 'Material dado de baja'
        : formStock.tipo === 'entrada' ? 'Stock añadido' : 'Stock retirado'
      )
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  function handleEliminar() {
    setConfirmDlg({
      title: '¿Eliminar artículo de este proyecto?',
      message: stockOtrosProyectos.length > 0
        ? `Se eliminará "${articulo.nombre}" (todas sus ubicaciones) y su historial de este proyecto. El artículo sigue existiendo en otros proyectos.`
        : `Se eliminará "${articulo.nombre}" y todo su historial. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteArticulo(proyectoId, articuloId)
          showToast('Artículo eliminado')
          setTimeout(() => navigate(`/proyectos/${proyectoId}`), 500)
        } catch (e) {
          showToast(e.message, 'error')
        }
      }
    })
  }

  function handleEliminarUbicacion(u) {
    setConfirmDlg({
      title: `¿Eliminar la ubicación "${u.ubicacion || SIN_UBICACION}"?`,
      message: `Se eliminarán ${u.cantidad} ${articulo.unidad} de esta ubicación. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await deleteStock(u.stock_id)
          showToast('Ubicación eliminada')
          try { await cargar() } catch { navigate(`/proyectos/${proyectoId}`) }
        } catch (e) {
          showToast(e.message, 'error')
        }
      }
    })
  }

  async function handleTransferir() {
    const errs = {}
    if (!formMover.stockId) errs.stockId = 'Selecciona de qué ubicación'
    if (!formMover.proyecto_destino) errs.proyecto_destino = 'Selecciona un proyecto'
    const origen = articulo.ubicaciones.find(u => String(u.stock_id) === String(formMover.stockId))
    const cantidad = parseFloat(formMover.cantidad)
    if (!formMover.cantidad || isNaN(cantidad) || cantidad <= 0) errs.cantidad = 'Introduce una cantidad válida'
    else if (origen && cantidad > origen.cantidad) errs.cantidad = `Solo hay ${origen.cantidad} ${articulo.unidad} disponibles en esta ubicación`
    if (!formMover.operador.trim()) errs.operador = 'El nombre es obligatorio'
    if (Object.keys(errs).length) { setErrorsMover(errs); return }

    try {
      await createTransferencia({
        stock_id: parseInt(formMover.stockId),
        proyecto_destino_id: parseInt(formMover.proyecto_destino),
        cantidad,
        operador: formMover.operador,
        motivo: formMover.motivo || null,
      })
      setModal(null)
      await cargar()
      showToast('Unidades transferidas')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleGuardarUbicacion() {
    try {
      const res = await updateStock(formUbicacion.stockId, {
        ubicacion: formUbicacion.ubicacion || null,
        sala_id: formUbicacion.sala_id ? parseInt(formUbicacion.sala_id) : null,
      })
      setModal(null)
      await cargar()
      showToast(res.fusionado ? 'Ubicación actualizada (se fusionó con una existente)' : 'Ubicación actualizada')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleReparar() {
    const errs = {}
    const cantidad = parseFloat(formReparar.cantidad)
    if (!formReparar.cantidad || isNaN(cantidad) || cantidad <= 0) errs.cantidad = 'Introduce una cantidad válida'
    else if (cantidad > formReparar.disponible) errs.cantidad = `Solo hay ${formReparar.disponible} ${articulo.unidad} de baja aquí`
    if (!formReparar.operador.trim()) errs.operador = 'El nombre es obligatorio'
    if (Object.keys(errs).length) { setErrorsReparar(errs); return }

    try {
      await createReparacion({
        stock_id: formReparar.stockId, cantidad,
        operador: formReparar.operador, motivo: formReparar.motivo || null,
        ubicacion_destino: formReparar.ubicacionDestino || null,
        sala_destino_id: formReparar.salaDestino ? parseInt(formReparar.salaDestino) : null,
      })
      setModal(null)
      await cargar()
      showToast('Material reparado')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  function abrirStock(tipo) {
    const ubicaciones = articulo.ubicaciones
    setFormStock({
      tipo,
      cantidad: '',
      operador: '',
      motivo: '',
      stockId: ubicaciones.length === 1 ? String(ubicaciones[0].stock_id) : '',
      ubicacionModo: ubicaciones.length > 0 ? 'existente' : 'nueva',
      ubicacionNueva: '',
      salaNueva: '',
      esBaja: false,
      ubicacionBaja: '',
      salaBaja: '',
    })
    setErrorsStock({})
    setModal('stock')
  }

  function abrirMover() {
    const ubicaciones = articulo.ubicaciones
    const stockId = ubicaciones.length === 1 ? String(ubicaciones[0].stock_id) : ''
    setFormMover({
      stockId,
      proyecto_destino: '',
      cantidad: stockId ? String(ubicaciones[0].cantidad) : '',
      operador: '', motivo: '',
    })
    setErrorsMover({})
    setModal('mover')
  }

  function abrirEditarUbicacion(u) {
    setFormUbicacion({ stockId: u.stock_id, ubicacion: u.ubicacion || '', sala_id: u.sala_id || '' })
    setErrorsUbicacion({})
    setModal('editarUbicacion')
  }

  function abrirReparar(b) {
    setFormReparar({ stockId: b.stock_id, disponible: b.cantidad, cantidad: '', operador: '', motivo: '', ubicacionDestino: '', salaDestino: '' })
    setErrorsReparar({})
    setModal('reparar')
  }

  function abrirFusionar() {
    setFusionQuery('')
    setFusionResultados([])
    setFusionSeleccionado(null)
    setModal('fusionar')
  }

  useEffect(() => {
    if (!fusionQuery.trim() || !articulo) { setFusionResultados([]); return }
    setFusionBuscando(true)
    const t = setTimeout(async () => {
      try {
        setFusionResultados(await buscarCatalogo(fusionQuery, articulo.id))
      } catch {
        setFusionResultados([])
      } finally {
        setFusionBuscando(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [fusionQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFusionar() {
    if (!fusionSeleccionado) return
    setFusionando(true)
    try {
      await fusionarArticulo(articulo.id, fusionSeleccionado.id)
      showToast(`Fusionado con "${fusionSeleccionado.nombre}"`)
      navigate(`/proyectos/${proyectoId}/articulos/${fusionSeleccionado.id}`, { replace: true })
    } catch (e) {
      showToast(e.message, 'error')
      setFusionando(false)
    }
  }

  async function handleSubirImagenes(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setSubiendoImagenes(true)
    try {
      await subirImagenesArticulo(articulo.id, files)
      await cargar()
      showToast(`${files.length} imagen${files.length !== 1 ? 'es' : ''} añadida${files.length !== 1 ? 's' : ''}`)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubiendoImagenes(false)
    }
  }

  function handleEliminarImagen(imagenId) {
    setConfirmDlg({
      title: '¿Eliminar esta imagen?',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmDlg(null)
        try {
          await eliminarImagenArticulo(imagenId)
          await cargar()
          showToast('Imagen eliminada')
        } catch (e) {
          showToast(e.message, 'error')
        }
      }
    })
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <Spinner />
    </div>
  )
  if (!articulo) return null

  const otrosProyectos = proyectos.filter(p => p.id !== parseInt(proyectoId))
  const hayUbicaciones = articulo.ubicaciones.length > 0
  const puedeTransferir = hayUbicaciones && otrosProyectos.length > 0

  const ubicacionSeleccionadaStock = (formStock.tipo === 'entrada' && formStock.ubicacionModo === 'nueva')
    ? null
    : articulo.ubicaciones.find(u => String(u.stock_id) === String(formStock.stockId))
  const cantidadActualStock = ubicacionSeleccionadaStock ? ubicacionSeleccionadaStock.cantidad : 0
  const cantidadValidaStock = formStock.cantidad && !isNaN(parseFloat(formStock.cantidad))
  const resultanteStock = cantidadValidaStock
    ? (formStock.tipo === 'entrada' ? cantidadActualStock + parseFloat(formStock.cantidad) : cantidadActualStock - parseFloat(formStock.cantidad))
    : null

  const origenMover = articulo.ubicaciones.find(u => String(u.stock_id) === String(formMover.stockId))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(`/proyectos/${proyectoId}`)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 dark:text-gray-50 truncate">{articulo.nombre}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {[articulo.marca, articulo.referencia].filter(Boolean).join(' · ') || articulo.categoria_nombre || 'Sin categoría'}
            </p>
          </div>
          <DarkModeToggle dark={dark} onToggle={toggleDark} />
          <button onClick={abrirFusionar} title="Fusionar con otro artículo"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Merge size={16} className="text-gray-400" />
          </button>
          <button onClick={handleEliminar} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Tarjeta principal de stock */}
        <div className={`rounded-2xl p-6 text-center ${
          articulo.bajo_minimo
            ? 'bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800'
            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
        }`}>
          {articulo.bajo_minimo && (
            <div className="flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400 text-sm font-medium mb-3">
              <AlertTriangle size={14} />
              Stock bajo mínimo
            </div>
          )}
          <div className={`text-6xl font-bold mb-1 ${articulo.bajo_minimo ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-50'}`}>
            {articulo.cantidad_total}
          </div>
          <div className="text-gray-400 dark:text-gray-500 text-sm">{articulo.unidad}</div>
          {articulo.stock_minimo != null && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mínimo: {articulo.stock_minimo} {articulo.unidad}</div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => abrirStock('salida')} disabled={!hayUbicaciones}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors">
              <Minus size={18} /> Retirar
            </button>
            <button onClick={() => abrirStock('entrada')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">
              <Plus size={18} /> Añadir
            </button>
            {puedeTransferir && (
              <button onClick={abrirMover} title="Transferir a otro proyecto"
                className="px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center">
                <ArrowRightLeft size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <ImageIcon size={16} className="text-gray-400 dark:text-gray-500" /> Imágenes
            </h2>
            <label className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
              <Plus size={14} /> Añadir
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleSubirImagenes} disabled={subiendoImagenes} />
            </label>
          </div>

          {subiendoImagenes && <Spinner />}

          {!subiendoImagenes && articulo.imagenes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Sin imágenes todavía</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {articulo.imagenes.map(img => (
                <div key={img.id} className="relative flex-shrink-0 group/img">
                  <img src={`/api/imagenes-articulos/${img.filename}`} alt={articulo.nombre}
                    onClick={() => setImagenAmpliada(img)}
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer" />
                  <button onClick={() => handleEliminarImagen(img.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ubicaciones */}
        {hayUbicaciones && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Ubicaciones {articulo.ubicaciones.length > 1 && <Badge>{articulo.ubicaciones.length}</Badge>}
            </h2>
            <div className="space-y-2">
              {articulo.ubicaciones.map(u => (
                <div key={u.stock_id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{u.ubicacion || SIN_UBICACION}</p>
                      {u.sala_nombre && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.sala_nombre}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{u.cantidad} {articulo.unidad}</span>
                    <button onClick={() => abrirEditarUbicacion(u)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                      <Edit2 size={13} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <button onClick={() => handleEliminarUbicacion(u)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900 transition-all">
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Información del artículo */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Información</h2>
            <button onClick={() => { setErrorsInfo({}); setModal('editar') }}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Edit2 size={14} /> Editar
            </button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Marca', value: articulo.marca },
              { label: 'Referencia', value: articulo.referencia },
              { label: 'Categoría', value: articulo.categoria_nombre },
              { label: 'Unidad de medida', value: articulo.unidad },
              { label: 'Stock mínimo', value: articulo.stock_minimo != null ? `${articulo.stock_minimo} ${articulo.unidad}` : null },
              { label: 'Notas', value: articulo.notas },
            ].map(({ label, value }) => value ? (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
              </div>
            ) : null)}
          </div>
        </div>

        {/* También en otros proyectos */}
        {stockOtrosProyectos.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">También en otros proyectos</h2>
            <div className="space-y-2">
              {stockOtrosProyectos.map(s => (
                <div key={s.proyecto_id}
                  onClick={() => navigate(`/proyectos/${s.proyecto_id}/articulos/${articulo.id}`)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.proyecto_nombre}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.cantidad_total} {articulo.unidad}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dado de baja */}
        {articulo.bajas.length > 0 && (
          <div className="bg-amber-50/40 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-200 dark:border-amber-800 p-5">
            <h2 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
              <Ban size={16} /> Dado de baja
            </h2>
            <div className="space-y-2">
              {articulo.bajas.map(b => (
                <div key={b.stock_id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{b.ubicacion || SIN_UBICACION}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{b.cantidad} {articulo.unidad}</p>
                  </div>
                  <button onClick={() => abrirReparar(b)}
                    className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium flex-shrink-0">
                    <Wrench size={14} /> Reparar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de movimientos */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button onClick={() => setShowHistorial(h => !h)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400 dark:text-gray-500" />
              <span className="font-semibold text-gray-800 dark:text-gray-100">Historial</span>
              <Badge>{movimientos.length}</Badge>
            </div>
            {showHistorial
              ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" />
              : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
          </button>

          {showHistorial && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              {movimientos.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Sin movimientos registrados</p>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {movimientos.map(mov => {
                    const esTransferencia = mov.tipo === 'transferencia'
                    const saliente = esTransferencia && mov.proyecto_origen_id === parseInt(proyectoId)
                    const otroProyectoNombre = esTransferencia
                      ? (saliente ? mov.proyecto_destino_nombre : mov.proyecto_origen_nombre)
                      : null

                    let icono = null, color = '', positivo = true, etiqueta = null
                    if (esTransferencia) {
                      icono = <ArrowRightLeft size={13} className="text-blue-600 dark:text-blue-400" />
                      color = 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      positivo = !saliente
                    } else if (mov.tipo === 'baja') {
                      icono = <Ban size={13} className="text-amber-600 dark:text-amber-400" />
                      color = 'bg-amber-100 dark:bg-amber-900'
                      positivo = false
                      etiqueta = 'Dado de baja'
                    } else if (mov.tipo === 'reparacion') {
                      icono = <Wrench size={13} className="text-green-600 dark:text-green-400" />
                      color = 'bg-green-100 dark:bg-green-900'
                      positivo = true
                      etiqueta = 'Reparado'
                    } else {
                      positivo = mov.tipo === 'entrada'
                      icono = positivo
                        ? <Plus size={13} className="text-green-600 dark:text-green-400" />
                        : <Minus size={13} className="text-red-600 dark:text-red-400" />
                      color = positivo ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                    }

                    return (
                      <div key={mov.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                          {icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {mov.operador}
                            {esTransferencia && (
                              <span className="text-gray-400 dark:text-gray-500 font-normal">
                                {' '}{saliente ? '→' : '←'} {otroProyectoNombre}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(mov.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {etiqueta && ` · ${etiqueta}`}
                            {mov.motivo && ` · ${mov.motivo}`}
                            {!esTransferencia && mov.proyecto_id !== parseInt(proyectoId) && ` · ${mov.proyecto_nombre}`}
                          </p>
                        </div>
                        <span className={`font-bold text-sm flex-shrink-0 ${
                          esTransferencia ? 'text-blue-600 dark:text-blue-400'
                          : mov.tipo === 'baja' ? 'text-amber-600 dark:text-amber-400'
                          : positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {positivo ? '+' : '-'}{mov.cantidad}
                        </span>
                      </div>
                    )
                  })}
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
            <Input label="Nombre *" value={formInfo.nombre} error={errorsInfo.nombre} list="dl-nombres"
              onChange={e => setFormInfo(f => ({ ...f, nombre: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Marca" value={formInfo.marca} list="dl-marcas"
                onChange={e => setFormInfo(f => ({ ...f, marca: e.target.value }))} />
              <Input label="Referencia" value={formInfo.referencia} list="dl-referencias"
                onChange={e => setFormInfo(f => ({ ...f, referencia: e.target.value }))} />
            </div>
            {(stockOtrosProyectos.length > 0 || articulo.ubicaciones.length > 1) && (
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
                Estos datos son compartidos por el catálogo: al guardar se actualizarán en todas las
                ubicaciones y proyectos donde existe este artículo.
              </p>
            )}
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
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas</label>
              <textarea value={formInfo.notas} onChange={e => setFormInfo(f => ({ ...f, notas: e.target.value }))}
                rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardarInfo} className="flex-1">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal movimiento de stock */}
      {modal === 'stock' && (
        <Modal
          title={formStock.tipo === 'entrada' ? 'Añadir stock' : 'Retirar stock'}
          onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['entrada', 'salida'].map(t => (
                <button key={t} onClick={() => setFormStock(f => ({ ...f, tipo: t }))}
                  disabled={t === 'salida' && !hayUbicaciones}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors border disabled:opacity-40 disabled:cursor-not-allowed
                    ${formStock.tipo === t
                      ? t === 'entrada' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  {t === 'entrada' ? '+ Añadir' : '- Retirar'}
                </button>
              ))}
            </div>

            {formStock.tipo === 'salida' && articulo.ubicaciones.length > 0 && (
              <Select label="¿De qué ubicación? *" value={formStock.stockId} error={errorsStock.stockId}
                onChange={e => setFormStock(f => ({ ...f, stockId: e.target.value }))}>
                <option value="">Selecciona una ubicación...</option>
                {articulo.ubicaciones.map(u => (
                  <option key={u.stock_id} value={u.stock_id}>
                    {u.ubicacion || SIN_UBICACION} ({u.cantidad} {articulo.unidad})
                  </option>
                ))}
              </Select>
            )}

            {formStock.tipo === 'entrada' && articulo.ubicaciones.length > 0 && (
              <Select label="¿En qué ubicación? *" value={formStock.ubicacionModo === 'nueva' ? NUEVA_UBICACION : formStock.stockId}
                error={errorsStock.stockId}
                onChange={e => {
                  const v = e.target.value
                  if (v === NUEVA_UBICACION) setFormStock(f => ({ ...f, ubicacionModo: 'nueva', stockId: '' }))
                  else setFormStock(f => ({ ...f, ubicacionModo: 'existente', stockId: v }))
                }}>
                {articulo.ubicaciones.map(u => (
                  <option key={u.stock_id} value={u.stock_id}>
                    {u.ubicacion || SIN_UBICACION} ({u.cantidad} {articulo.unidad})
                  </option>
                ))}
                <option value={NUEVA_UBICACION}>+ Nueva ubicación</option>
              </Select>
            )}

            {formStock.tipo === 'entrada' && (articulo.ubicaciones.length === 0 || formStock.ubicacionModo === 'nueva') && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ubicación" list="dl-ubicaciones"
                  value={formStock.ubicacionNueva}
                  onChange={e => setFormStock(f => ({ ...f, ubicacionNueva: e.target.value }))}
                  placeholder="Ej: Estantería A" />
                <Select label="Sala" value={formStock.salaNueva}
                  onChange={e => setFormStock(f => ({ ...f, salaNueva: e.target.value }))}>
                  <option value="">Sin sala</option>
                  {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </Select>
              </div>
            )}

            <Input
              label="Cantidad *"
              type="number" min="0.01" step="0.01"
              value={formStock.cantidad}
              error={errorsStock.cantidad}
              onChange={e => setFormStock(f => ({ ...f, cantidad: e.target.value }))}
              placeholder={`Cantidad en ${articulo.unidad}`}
            />

            {resultanteStock !== null && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Cantidad en esta ubicación tras la operación</p>
                <p className={`text-2xl font-bold ${resultanteStock < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                  {resultanteStock} {articulo.unidad}
                </p>
              </div>
            )}

            {formStock.tipo === 'salida' && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={formStock.esBaja}
                    onChange={e => setFormStock(f => ({ ...f, esBaja: e.target.checked }))}
                    className="rounded" />
                  Marcar como dado de baja (material roto)
                </label>
                {formStock.esBaja && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Ubicación" list="dl-ubicaciones" value={formStock.ubicacionBaja}
                      onChange={e => setFormStock(f => ({ ...f, ubicacionBaja: e.target.value }))}
                      placeholder="Ej: Caja de roturas (opcional)" />
                    <Select label="Sala" value={formStock.salaBaja}
                      onChange={e => setFormStock(f => ({ ...f, salaBaja: e.target.value }))}>
                      <option value="">Sin sala</option>
                      {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </Select>
                  </div>
                )}
              </div>
            )}

            {operadores.length > 0 ? (
              <Select label="Operador *" value={formStock.operador} error={errorsStock.operador}
                onChange={e => setFormStock(f => ({ ...f, operador: e.target.value }))}>
                <option value="">Selecciona operador...</option>
                {operadores.map(op => <option key={op.id} value={op.nombre}>{op.nombre}</option>)}
              </Select>
            ) : (
              <Input
                label="¿Quién realiza el movimiento? *"
                value={formStock.operador}
                error={errorsStock.operador}
                onChange={e => setFormStock(f => ({ ...f, operador: e.target.value }))}
                placeholder="Tu nombre"
              />
            )}

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
                {formStock.tipo === 'entrada' ? 'Añadir' : formStock.esBaja ? 'Dar de baja' : 'Retirar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal transferir a otro proyecto */}
      {modal === 'mover' && (
        <Modal title="Transferir a otro proyecto" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mueve unidades de <strong className="text-gray-700 dark:text-gray-300">{articulo.nombre}</strong> desde
              este proyecto a otro.
            </p>
            {articulo.ubicaciones.length > 0 && (
              <Select label="¿Desde qué ubicación? *" value={formMover.stockId} error={errorsMover.stockId}
                onChange={e => {
                  const u = articulo.ubicaciones.find(x => String(x.stock_id) === e.target.value)
                  setFormMover(f => ({ ...f, stockId: e.target.value, cantidad: u ? String(u.cantidad) : '' }))
                }}>
                <option value="">Selecciona una ubicación...</option>
                {articulo.ubicaciones.map(u => (
                  <option key={u.stock_id} value={u.stock_id}>
                    {u.ubicacion || SIN_UBICACION} ({u.cantidad} {articulo.unidad})
                  </option>
                ))}
              </Select>
            )}
            {origenMover && (
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
                Quedan {origenMover.cantidad} {articulo.unidad} disponibles en esta ubicación.
              </p>
            )}
            <Select label="Proyecto de destino *" value={formMover.proyecto_destino} error={errorsMover.proyecto_destino}
              onChange={e => setFormMover(f => ({ ...f, proyecto_destino: e.target.value }))}>
              <option value="">Selecciona un proyecto...</option>
              {otrosProyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
            <Input
              label="Cantidad a transferir *"
              type="number" min="0.01" max={origenMover?.cantidad} step="0.01"
              value={formMover.cantidad}
              error={errorsMover.cantidad}
              onChange={e => setFormMover(f => ({ ...f, cantidad: e.target.value }))}
              placeholder={`Cantidad en ${articulo.unidad}`}
            />
            {operadores.length > 0 ? (
              <Select label="Operador *" value={formMover.operador} error={errorsMover.operador}
                onChange={e => setFormMover(f => ({ ...f, operador: e.target.value }))}>
                <option value="">Selecciona operador...</option>
                {operadores.map(op => <option key={op.id} value={op.nombre}>{op.nombre}</option>)}
              </Select>
            ) : (
              <Input
                label="¿Quién realiza el movimiento? *"
                value={formMover.operador}
                error={errorsMover.operador}
                onChange={e => setFormMover(f => ({ ...f, operador: e.target.value }))}
                placeholder="Tu nombre"
              />
            )}
            <Input
              label="Motivo (opcional)"
              value={formMover.motivo}
              onChange={e => setFormMover(f => ({ ...f, motivo: e.target.value }))}
              placeholder="Reutilización en otro proyecto..."
            />
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleTransferir} className="flex-1">Transferir</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar ubicación */}
      {modal === 'editarUbicacion' && (
        <Modal title="Editar ubicación" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Si la ubicación coincide con otra que ya existe para este artículo en este proyecto, se fusionarán sumando cantidades.
            </p>
            <Input label="Armario / Balda" list="dl-ubicaciones" value={formUbicacion.ubicacion}
              onChange={e => setFormUbicacion(f => ({ ...f, ubicacion: e.target.value }))}
              placeholder="Ej: B/2" />
            <Select label="Sala" value={formUbicacion.sala_id}
              onChange={e => setFormUbicacion(f => ({ ...f, sala_id: e.target.value }))}>
              <option value="">Sin sala</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleGuardarUbicacion} className="flex-1">Guardar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal reparar */}
      {modal === 'reparar' && (
        <Modal title="Reparar material" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Devuelve unidades de <strong className="text-gray-700 dark:text-gray-300">{articulo.nombre}</strong> al
              stock funcional. Disponibles de baja aquí: {formReparar.disponible} {articulo.unidad}.
            </p>
            <Input
              label="Cantidad a reparar *"
              type="number" min="0.01" max={formReparar.disponible} step="0.01"
              value={formReparar.cantidad}
              error={errorsReparar.cantidad}
              onChange={e => setFormReparar(f => ({ ...f, cantidad: e.target.value }))}
              placeholder={`Cantidad en ${articulo.unidad}`}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ubicación" list="dl-ubicaciones" value={formReparar.ubicacionDestino}
                onChange={e => setFormReparar(f => ({ ...f, ubicacionDestino: e.target.value }))}
                placeholder="Igual que la baja (opcional)" />
              <Select label="Sala" value={formReparar.salaDestino}
                onChange={e => setFormReparar(f => ({ ...f, salaDestino: e.target.value }))}>
                <option value="">Sin sala</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
            </div>
            {operadores.length > 0 ? (
              <Select label="Operador *" value={formReparar.operador} error={errorsReparar.operador}
                onChange={e => setFormReparar(f => ({ ...f, operador: e.target.value }))}>
                <option value="">Selecciona operador...</option>
                {operadores.map(op => <option key={op.id} value={op.nombre}>{op.nombre}</option>)}
              </Select>
            ) : (
              <Input
                label="¿Quién realiza la reparación? *"
                value={formReparar.operador}
                error={errorsReparar.operador}
                onChange={e => setFormReparar(f => ({ ...f, operador: e.target.value }))}
                placeholder="Tu nombre"
              />
            )}
            <Input
              label="Motivo (opcional)"
              value={formReparar.motivo}
              onChange={e => setFormReparar(f => ({ ...f, motivo: e.target.value }))}
              placeholder="Reparado, pieza sustituida..."
            />
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleReparar} className="flex-1">Reparar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal fusionar con otro artículo */}
      {modal === 'fusionar' && (
        <Modal title="Fusionar con otro artículo" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Busca el artículo con el que quieres fusionar <strong className="text-gray-700 dark:text-gray-300">"{articulo.nombre}"</strong>.
              Se moverá todo su stock (y sus bajas) al artículo elegido: las ubicaciones coincidentes suman
              cantidad, las distintas se conservan por separado. "{articulo.nombre}" desaparecerá del catálogo.
              Esta acción no se puede deshacer.
            </p>

            <Input
              value={fusionQuery}
              onChange={e => setFusionQuery(e.target.value)}
              placeholder="Buscar por nombre, marca o referencia..."
              autoFocus
            />

            {fusionBuscando && <Spinner />}

            {!fusionBuscando && fusionQuery.trim() && fusionResultados.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">Sin resultados</p>
            )}

            {fusionResultados.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {fusionResultados.map(r => (
                  <button key={r.id} type="button" onClick={() => setFusionSeleccionado(r)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                      fusionSeleccionado?.id === r.id
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{r.nombre}</p>
                    {(r.marca || r.referencia) && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {[r.marca, r.referencia].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {fusionSeleccionado && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-400">
                Se fusionará "{articulo.nombre}" dentro de "{fusionSeleccionado.nombre}".
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button variant="danger" onClick={handleFusionar} disabled={!fusionSeleccionado || fusionando} className="flex-1">
                Fusionar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <datalist id="dl-nombres">{sugerencias.nombres.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="dl-marcas">{sugerencias.marcas.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="dl-referencias">{sugerencias.referencias.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="dl-ubicaciones">{sugerencias.ubicaciones.map(n => <option key={n} value={n} />)}</datalist>

      {/* Visor de imagen a pantalla completa */}
      {imagenAmpliada && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagenAmpliada(null)}>
          <img src={`/api/imagenes-articulos/${imagenAmpliada.filename}`} alt={articulo.nombre}
            className="max-w-full max-h-full rounded-lg object-contain" />
          <button onClick={() => setImagenAmpliada(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={22} />
          </button>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {confirmDlg && (
        <ConfirmDialog
          {...confirmDlg}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </div>
  )
}
