import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getAlertas } from '../utils/api'
import { Spinner, EmptyState, DarkModeToggle } from '../components/ui'
import { useDarkMode } from '../hooks/useDarkMode'

export default function Alertas() {
  const navigate = useNavigate()
  const [dark, toggleDark] = useDarkMode()
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setAlertas(await getAlertas())
    } catch {
      setAlertas([])
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
            <h1 className="font-bold text-gray-900 dark:text-gray-50">Alertas de stock</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {loading ? 'Cargando...' : `${alertas.length} artículo${alertas.length !== 1 ? 's' : ''} bajo mínimo`}
            </p>
          </div>
          <DarkModeToggle dark={dark} onToggle={toggleDark} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? <Spinner /> : alertas.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Todo en orden" description="No hay artículos por debajo de su stock mínimo" />
        ) : (
          <div className="space-y-2">
            {alertas.map(art => (
              <div key={`${art.id}-${art.proyecto_id}`}
                onClick={() => navigate(`/proyectos/${art.proyecto_id}/articulos/${art.id}`)}
                className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30 p-4 flex items-center gap-4 cursor-pointer hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm transition-all">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: art.proyecto_color || '#EF4444' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{art.nombre}</span>
                    <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{art.proyecto_nombre} · {art.categoria_nombre || 'Sin categoría'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                    {art.cantidad} {art.unidad}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">mín. {art.stock_minimo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
