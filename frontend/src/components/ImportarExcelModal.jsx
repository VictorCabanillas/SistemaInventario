import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Modal, Button, Spinner } from './ui'
import { descargarPlantillaImportacion, importarExcel, importarExcelGlobal } from '../utils/api'

// Modal de importación masiva desde Excel, reutilizado por la vista de un
// proyecto concreto (proyectoId presente: las filas sin columna Proyecto van
// ahí) y por la importación global de Configuración (proyectoId ausente:
// las filas sin columna Proyecto van al Almacén general).
export default function ImportarExcelModal({ proyectoId, nombreProyecto, onClose, onImportado, showToast }) {
  const [file, setFile] = useState(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)

  async function handleDescargarPlantilla() {
    try {
      await descargarPlantillaImportacion()
    } catch {
      showToast('Error al descargar la plantilla', 'error')
    }
  }

  async function handleImportar() {
    if (!file) return
    setImportando(true)
    setResultado(null)
    try {
      const res = proyectoId ? await importarExcel(proyectoId, file) : await importarExcelGlobal(file)
      setResultado(res)
      setFile(null)
      await onImportado?.()
      showToast(
        res.errores.length > 0
          ? `${res.procesadas} artículo${res.procesadas !== 1 ? 's' : ''} importado${res.procesadas !== 1 ? 's' : ''}, ${res.errores.length} fila${res.errores.length !== 1 ? 's' : ''} con error`
          : `${res.procesadas} artículo${res.procesadas !== 1 ? 's' : ''} importado${res.procesadas !== 1 ? 's' : ''}`,
        res.errores.length > 0 ? 'error' : 'success'
      )
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setImportando(false)
    }
  }

  return (
    <Modal title="Importar desde Excel" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {proyectoId
            ? <>Sube un Excel con artículos. Las filas sin columna Proyecto se añaden a <strong className="text-gray-700 dark:text-gray-300">"{nombreProyecto}"</strong>; si una fila indica otro proyecto, va ahí (se crea si no existe).</>
            : <>Sube un Excel con artículos para varios proyectos a la vez. Cada fila decide su proyecto con la columna Proyecto (se crea si no existe); si se deja vacía, va al Almacén general.</>}
          {' '}Si un artículo ya existe (mismo nombre, marca, referencia, ubicación y proyecto), se suma la cantidad en vez de duplicarlo.
        </p>

        <button onClick={handleDescargarPlantilla}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Download size={14} /> Descargar plantilla de ejemplo
        </button>

        <label className="block">
          <div className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 text-center cursor-pointer transition-colors">
            <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {file ? file.name : 'Selecciona un archivo .xlsx'}
            </p>
          </div>
          <input type="file" accept=".xlsx" className="hidden"
            onChange={e => { setFile(e.target.files?.[0] || null); setResultado(null) }} />
        </label>

        {importando && <Spinner />}

        {resultado && (
          <div className={`rounded-xl p-3 text-sm ${resultado.errores.length > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400'}`}>
            <p className="font-medium">
              {resultado.procesadas} artículo{resultado.procesadas !== 1 ? 's' : ''} importado{resultado.procesadas !== 1 ? 's' : ''}
              {resultado.errores.length > 0 && `, ${resultado.errores.length} fila${resultado.errores.length !== 1 ? 's' : ''} con error`}
            </p>
            {resultado.errores.length > 0 && (
              <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto text-xs">
                {resultado.errores.map(e => (
                  <li key={e.fila}>Fila {e.fila}: {e.motivo}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cerrar</Button>
          <Button onClick={handleImportar} disabled={!file || importando} className="flex-1">Importar</Button>
        </div>
      </div>
    </Modal>
  )
}
