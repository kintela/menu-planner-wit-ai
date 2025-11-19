import { SimpleNavigation } from "@/components/simple-navigation"
import {
  SeasonalProductsClient,
  type SeasonalProduct,
} from "@/components/seasonal-products/seasonal-products-client"
import { createServerClient } from "@/lib/supabase/server"
import { Sprout } from "lucide-react"

interface SeasonalProductsPageProps {
  searchParams?: {
    month?: string
  }
}

const clampMonth = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null
  }
  if (value < 1 || value > 12) {
    return null
  }
  return value
}

export default async function SeasonalProductsPage({ searchParams }: SeasonalProductsPageProps) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("productos_temporada")
    .select("id, mes, tipo, nombre, observaciones")
    .order("mes", { ascending: true })
    .order("tipo", { ascending: true })
    .order("nombre", { ascending: true })

  if (error) {
    console.error("[SeasonalProductsPage] Error fetching productos_temporada", error)
  }

  const normalizedProducts: SeasonalProduct[] =
    data?.map((product, index) => {
      const monthValue = clampMonth(
        typeof product.mes === "number" ? product.mes : Number.parseInt(String(product.mes ?? ""), 10),
      )
      return {
        id:
          typeof product.id === "number"
            ? product.id
            : Number.parseInt(String(product.id ?? ""), 10) || index + 1,
        mes: monthValue ?? 0,
        tipo: String(product.tipo ?? "Sin categoría"),
        nombre: String(product.nombre ?? "Producto sin nombre"),
        observaciones: product.observaciones ?? null,
      }
    }).filter((product) => product.mes >= 1 && product.mes <= 12) ?? []

  const defaultMonth = new Date().getMonth() + 1
  const requestedMonth = Number.parseInt(searchParams?.month ?? "", 10)
  const initialMonth = clampMonth(requestedMonth) ?? clampMonth(defaultMonth) ?? 1

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Productos de temporada</h1>
              <p className="text-gray-600">
                Consulta los ingredientes almacenados en la tabla según el mes seleccionado.
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Datos desde <span className="font-mono text-xs">public.productos_temporada</span>
          </div>
        </header>

        <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <SeasonalProductsClient products={normalizedProducts} initialMonth={initialMonth} />
        </section>
      </main>
    </div>
  )
}
