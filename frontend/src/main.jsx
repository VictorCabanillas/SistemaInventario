import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Proyectos from './pages/Proyectos'
import Articulos from './pages/Articulos'
import DetalleArticulo from './pages/DetalleArticulo'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Proyectos />} />
      <Route path="/proyectos/:proyectoId" element={<Articulos />} />
      <Route path="/proyectos/:proyectoId/articulos/:articuloId" element={<DetalleArticulo />} />
    </Routes>
  </BrowserRouter>
)
