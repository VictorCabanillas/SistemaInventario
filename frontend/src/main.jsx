import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Proyectos from './pages/Proyectos'
import Articulos from './pages/Articulos'
import DetalleArticulo from './pages/DetalleArticulo'
import Alertas from './pages/Alertas'
import Bajas from './pages/Bajas'

// Evita que el scroll del ratón cambie el valor de un input numérico
// enfocado (comportamiento nativo del navegador que pasa desapercibido
// y desajusta cantidades en pasos de "step").
document.addEventListener('wheel', () => {
  const el = document.activeElement
  if (el instanceof HTMLInputElement && el.type === 'number') el.blur()
}, { passive: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Proyectos />} />
      <Route path="/alertas" element={<Alertas />} />
      <Route path="/bajas" element={<Bajas />} />
      <Route path="/proyectos/:proyectoId" element={<Articulos />} />
      <Route path="/proyectos/:proyectoId/articulos/:articuloId" element={<DetalleArticulo />} />
    </Routes>
  </BrowserRouter>
)
