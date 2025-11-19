"use client"

import { type ChangeEvent, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export type SeasonalProduct = {
  id: number
  mes: number
  tipo: string
  nombre: string
  observaciones?: string | null
}

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
]

const getMonthName = (value: number) => MONTHS.find((month) => month.value === value)?.label ?? `Mes ${value}`

interface SeasonalProductsClientProps {
  products: SeasonalProduct[]
  initialMonth: number
}

export function SeasonalProductsClient({ products, initialMonth }: SeasonalProductsClientProps) {
  const sanitizedInitialMonth = MONTHS.some((month) => month.value === initialMonth)
    ? initialMonth
    : new Date().getMonth() + 1
  const [selectedMonth, setSelectedMonth] = useState<number>(sanitizedInitialMonth)

  const productsForMonth = useMemo(
    () => products.filter((product) => product.mes === selectedMonth),
    [products, selectedMonth],
  )

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, SeasonalProduct[]>()
    for (const product of productsForMonth) {
      const key = product.tipo?.trim() || "Sin categoría"
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)?.push(product)
    }

    return Array.from(groups.entries())
      .map(([type, items]) => ({
        type,
        items: items
          .slice()
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
      }))
      .sort((a, b) => a.type.localeCompare(b.type, "es", { sensitivity: "base" }))
  }, [productsForMonth])

  const totalEntries = products.length
  const selectedMonthName = getMonthName(selectedMonth)

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number.parseInt(event.target.value, 10)
    if (!Number.isNaN(value)) {
      setSelectedMonth(value)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-60">
          <Label htmlFor="seasonal-month">Selecciona un mes</Label>
          <select
            id="seasonal-month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="mt-1 block w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {totalEntries === 0
            ? "Aún no hay productos guardados en la tabla."
            : `${totalEntries} producto${totalEntries === 1 ? "" : "s"} registrados en total.`}
        </div>
      </div>

      {productsForMonth.length === 0 ? (
        <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-6 py-10 text-center text-sm text-emerald-900">
          <p className="font-medium">No hay productos guardados para {selectedMonthName}.</p>
          <p className="mt-1 text-emerald-800">
            Añade registros en <span className="font-mono text-xs">public.productos_temporada</span> para verlos aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groupedProducts.map((group) => (
            <Card key={group.type} className="border-emerald-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-900">
                  <span>{group.type}</span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {group.items.length} producto{group.items.length === 1 ? "" : "s"}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-500">Disponibles en {selectedMonthName}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={`${item.id}-${item.nombre}`}
                    className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm"
                  >
                    <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                    {item.observaciones && <p className="text-sm text-gray-600">{item.observaciones}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
