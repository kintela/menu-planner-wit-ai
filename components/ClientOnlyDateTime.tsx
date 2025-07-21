import React from "react"

/**
 * Muestra una fecha y hora formateada solo en el cliente para evitar hydration errors.
 */
export function ClientOnlyDateTime({ date, options }: { date: string | number | Date, options?: Intl.DateTimeFormatOptions }) {
  const [formatted, setFormatted] = React.useState<string>("")
  React.useEffect(() => {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    setFormatted(d.toLocaleString(undefined, options))
  }, [date, options])
  // Renderiza vacío en SSR, solo muestra en cliente
  return <>{formatted}</>
}
