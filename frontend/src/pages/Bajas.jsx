import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Ban, CheckCircle2 } from 'lucide-react'
import { getBajas } from '../utils/api'
import { Spinner, EmptyState, DarkModeToggle } from '../components/ui'
import { useDarkMode } from '../hooks/useDarkMode'

export default function Bajas() {
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [bajas, setBajas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setBajas(await getBajas())
    } catch {
      setBajas([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 dark:text-gray-50">Material dado de baja</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {loading ? 'Cargando...' : `${bajas.length} elemento${bajas.length !== 1 ? 's' : ''} no funcional${bajas.length !== 1 ? 'es' : ''}`}
            </p>
          </div>
          <DarkModeToggle dark={dark} onToggle={toggleDark} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? <Spinner /> : bajas.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Sin bajas" description="No hay material marcado como no funcional" />
        ) : (
          <div className="space-y-2">
            {bajas.map(b => (
              <div key={b.stock_id}
                onClick={() => navigate(`/proyectos/${b.proyecto_id}/articulos/${b.articulo_id}`)}
                className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/30 p-4 flex items-center gap-4 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.proyecto_color || '#F59E0B' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{b.nombre}</span>
                    <Ban size={13} className="text-amber-500 flex-shrink-0" />
                  </div>
                  {(b.marca || b.referencia) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {[b.marca, b.referencia].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {b.proyecto_nombre}{(b.sala_nombre || b.ubicacion) && ` · ${[b.sala_nombre, b.ubicacion].filter(Boolean).join(' · ')}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                    {b.cantidad} {b.unidad}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
