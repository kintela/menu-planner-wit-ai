"use client"

import { useEffect, useState } from "react"

export function SafariCompatibleNav() {
  const [currentPath, setCurrentPath] = useState("")

  // Actualizar la ruta actual cuando el componente se monta
  useEffect(() => {
    setCurrentPath(window.location.pathname)
  }, [])

  // Función para navegar manualmente
  const navigate = (path: string) => {
    window.location.href = path
  }

  // Estilos para los enlaces
  const getLinkStyle = (path: string) => {
    const baseStyle = {
      display: "inline-block",
      padding: "8px 16px",
      margin: "0 4px",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: 500,
      fontSize: "14px",
    }

    const activeStyle = {
      ...baseStyle,
      backgroundColor: "var(--primary)",
      color: "white",
    }

    const inactiveStyle = {
      ...baseStyle,
      backgroundColor: "transparent",
      color: "var(--foreground)",
    }

    return currentPath === path || (path !== "/" && currentPath.startsWith(path)) ? activeStyle : inactiveStyle
  }

  return (
    <header style={{ borderBottom: "1px solid #e5e7eb", padding: "8px 0", backgroundColor: "white" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>
        <nav style={{ display: "flex", overflowX: "auto", padding: "8px 0" }}>
          <div onClick={() => navigate("/")} style={getLinkStyle("/")}>
            Inicio
          </div>
          <div onClick={() => navigate("/weekly-menu")} style={getLinkStyle("/weekly-menu")}>
            Menú Semanal
          </div>
          <div onClick={() => navigate("/recipes")} style={getLinkStyle("/recipes")}>
            Recetas
          </div>
          <div onClick={() => navigate("/recipes/add")} style={getLinkStyle("/recipes/add")}>
            Añadir Receta
          </div>
          <div onClick={() => navigate("/categories")} style={getLinkStyle("/categories")}>
            Categorías
          </div>
          <div onClick={() => navigate("/history")} style={getLinkStyle("/history")}>
            Historial
          </div>
        </nav>
      </div>
    </header>
  )
}
