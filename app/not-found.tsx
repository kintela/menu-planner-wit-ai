import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h2 className="text-4xl font-bold mb-4">404</h2>
      <h3 className="text-2xl font-semibold mb-2">Página no encontrada</h3>
      <p className="text-muted-foreground mb-6">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
