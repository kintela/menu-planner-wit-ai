export function HtmlNavigation() {
  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        padding: "1rem",
        backgroundColor: "white",
      }}
    >
      <nav>
        <ul
          style={{
            display: "flex",
            listStyle: "none",
            gap: "1rem",
            margin: 0,
            padding: 0,
            overflowX: "auto",
          }}
        >
          <li>
            <a
              href="/"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#111827",
                fontWeight: 500,
                display: "block",
              }}
            >
              Inicio
            </a>
          </li>
          <li>
            <a
              href="/weekly-menu"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#111827",
                fontWeight: 500,
                display: "block",
              }}
            >
              Menú Semanal
            </a>
          </li>
          <li>
            <a
              href="/recipes"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#111827",
                fontWeight: 500,
                display: "block",
              }}
            >
              Recetas
            </a>
          </li>
          <li>
            <a
              href="/recipes/add"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#111827",
                fontWeight: 500,
                display: "block",
              }}
            >
              Añadir Receta
            </a>
          </li>
          <li>
            <a
              href="/categories"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#111827",
                fontWeight: 500,
                display: "block",
              }}
            >
              Categorías
            </a>
          </li>
          <li>
            <a
              href="/history"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                textDecoration: "none",
                color: "#111827",
                fontWeight: 500,
                display: "block",
              }}
            >
              Historial
            </a>
          </li>
        </ul>
      </nav>
    </header>
  )
}
