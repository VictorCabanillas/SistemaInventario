import {
  X, AlertCircle, CheckCircle, Sun, Moon,
  Package, Boxes, Archive, Wrench, Cpu, Zap, Shield, Layers,
  Folder, Truck, Settings, Hammer, CircuitBoard, Cable, Battery,
  FlaskConical, Building2, Car, Star, Bookmark, Gauge, Cog, HardHat
} from 'lucide-react'
import { useState, useEffect } from 'react'

// ── Modal base ──────────────────────────────────────────────
export function Modal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-slide-up
      ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  )
}

// ── Input ────────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <input
        className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-colors outline-none
          dark:text-gray-100 dark:placeholder-gray-500
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          ${error
            ? 'border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-700'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          }`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────
export function Select({ label, error, children, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <select
        className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-colors outline-none
          dark:text-gray-100
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          ${error
            ? 'border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-700'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Button ───────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      className={`rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Badge ────────────────────────────────────────────────────
export function Badge({ children, color = 'gray', hex }) {
  if (hex) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: hex + '20', color: hex }}>
        {children}
      </span>
    )
  }
  const colors = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

// ── EmptyState ───────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">{description}</p>
      {action}
    </div>
  )
}

// ── ConfirmDialog ────────────────────────────────────────────
export function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', confirmVariant = 'danger', onConfirm, onCancel }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 pb-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h2>
          {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button variant={confirmVariant} onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

// ── DarkModeToggle ───────────────────────────────────────────
export function DarkModeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

// ── Icons map ────────────────────────────────────────────────
export const ICONS = {
  Package, Boxes, Archive, Wrench, Cpu, Zap, Shield, Layers,
  Folder, Truck, Settings, Hammer, CircuitBoard, Cable, Battery,
  FlaskConical, Building2, Car, Star, Bookmark, Gauge, Cog, HardHat
}

// ── ProyectoIcon ─────────────────────────────────────────────
export function ProyectoIcon({ icono, color, size = 22 }) {
  if (icono && icono.startsWith('custom:')) {
    const url = `/api/iconos/${icono.replace('custom:', '')}`
    return (
      <div style={{
        width: size, height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${url})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${url})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }} />
    )
  }
  const Icon = ICONS[icono] || ICONS.Package
  return <Icon size={size} style={{ color }} />
}

// ── IconPicker ───────────────────────────────────────────────
export function IconPicker({ value, onChange, color = '#3B82F6' }) {
  const [customIconos, setCustomIconos] = useState([])

  useEffect(() => {
    fetch('/api/iconos')
      .then(r => r.json())
      .then(data => setCustomIconos(data))
      .catch(() => {})
  }, [])

  const selectedStyle = (active) => active ? { backgroundColor: color + '30', color } : {}

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icono del proyecto</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${value === name
                  ? 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              style={selectedStyle(value === name)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {customIconos.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Iconos personalizados</label>
          <div className="flex flex-wrap gap-1.5">
            {customIconos.map(filename => {
              const key = `custom:${filename}`
              return (
                <button
                  key={key}
                  type="button"
                  title={filename.replace('.svg', '')}
                  onClick={() => onChange(key)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center p-1.5 transition-all
                    ${value === key
                      ? 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  style={selectedStyle(value === key)}
                >
                  <div style={{
                    width: 20, height: 20,
                    backgroundColor: value === key ? color : 'currentColor',
                    WebkitMaskImage: `url(/api/iconos/${filename})`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: `url(/api/iconos/${filename})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                  }} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── ColorPicker ──────────────────────────────────────────────
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6B7280'
]

export function ColorPicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color del proyecto</label>
      <div className="flex gap-2 flex-wrap">
        {COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-8 h-8 rounded-full transition-transform ${value === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  )
}
