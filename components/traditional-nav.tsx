"use client"

import { useEffect } from "react"
import "../app/safari-nav.css"

export function TraditionalNav() {
  // Script para añadir la clase 'active' a los enlaces activos
  useEffect(() => {
    const currentPath = window.location.pathname
    const links = document.querySelectorAll(".safari-nav-link")

    links.forEach((link) => {
      const href = link.getAttribute("href")
      if (href === currentPath || (href !== "/" && currentPath.startsWith(href as string))) {
        link.classList.add("active")
      }
    })
  }, [])

  return (
    <header className="safari-nav">
      <div className="safari-nav-container">
        <nav>
          <ul className="safari-nav-list">
            <li className="safari-nav-item">
              <a href="/" className="safari-nav-link">
                Inicio
              </a>
            </li>
            <li className="safari-nav-item">
              <a href="/weekly-menu" className="safari-nav-link">
                Menú Semanal
              </a>
            </li>
            <li className="safari-nav-item">
              <a href="/recipes" className="safari-nav-link">
                Recetas
              </a>
            </li>
            <li className="safari-nav-item">
              <a href="/recipes/add" className="safari-nav-link">
                Añadir Receta
              </a>
            </li>
            <li className="safari-nav-item">
              <a href="/categories" className="safari-nav-link">
                Categorías
              </a>
            </li>
            <li className="safari-nav-item">
              <a href="/history" className="safari-nav-link">
                Historial
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
