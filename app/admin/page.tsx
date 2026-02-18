"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

interface AlertItem {
  id: string
  nombre: string
  cantidad?: number | null
  unidad?: string | null
  categoria?: string | null
  estado?: string | null
  fecha_congelacion?: string | null
  fecha_caducidad?: string | null
  cajon?: {
    id?: string | null
    nombre?: string | null
    posicion?: number | null
    congelador_id?: string | null
    usuario_id?: string | null
  } | null
}

interface TestResult {
  ok: boolean
  sent: boolean
  message?: string
  error?: string
  eligibleItems?: number
  thresholdDate?: string
  items?: AlertItem[]
}

const formatHumanDate = (value?: string | null) => {
  if (!value) return "-"
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`))
  } catch {
    return value
  }
}

const formatQuantity = (cantidad?: number | null, unidad?: string | null) => {
  if (cantidad === null || cantidad === undefined) return "-"
  const qty = Number.isFinite(cantidad) ? `${cantidad}` : String(cantidad)
  const unit = unidad ? ` ${unidad}` : ""
  return `${qty}${unit}`.trim()
}

export default function AdminHomePage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSendTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/cron/freezer-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: true }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || `Error ${response.status}`)
      }

      setResult(payload as TestResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleSendAlert = async () => {
    setAlertLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/cron/freezer-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, testEmail: false }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || `Error ${response.status}`)
      }

      setResult(payload as TestResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setAlertLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container py-10 max-w-3xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Debes iniciar sesion para acceder a esta pagina.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (profile && profile.role !== "admin") {
    return (
      <div className="container py-10 max-w-3xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta pagina.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container py-10 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-2">Envio rapido de emails de prueba y alerta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails de congelador
          </CardTitle>
          <CardDescription>
            Envia un email de prueba o la alerta real para productos con 2 meses o mas congelados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSendTest} disabled={loading} className="w-full" variant="outline">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar email de prueba"
            )}
          </Button>

          <Button onClick={handleSendAlert} disabled={alertLoading} className="w-full">
            {alertLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando alerta...
              </>
            ) : (
              "Enviar alerta de congelador"
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>{result.message || "Email enviado."}</p>
                  {typeof result.eligibleItems === "number" && (
                    <p className="text-sm text-muted-foreground">
                      Elementos detectados: {result.eligibleItems}
                      {result.thresholdDate ? ` (antes de ${result.thresholdDate})` : ""}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result?.items && result.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items congelados (2 meses o mas)</CardTitle>
            <CardDescription>Listado de elementos que entran en el aviso.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 pr-3">Congelado</th>
                    <th className="py-2 pr-3">Cajon</th>
                    <th className="py-2 pr-3">Cantidad</th>
                    <th className="py-2 pr-3">Categoria</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{item.nombre}</td>
                      <td className="py-2 pr-3">{formatHumanDate(item.fecha_congelacion)}</td>
                      <td className="py-2 pr-3">
                        {item.cajon?.nombre
                          ? `${item.cajon.nombre}${item.cajon.posicion ? ` (pos. ${item.cajon.posicion})` : ""}`
                          : "-"}
                      </td>
                      <td className="py-2 pr-3">{formatQuantity(item.cantidad, item.unidad)}</td>
                      <td className="py-2 pr-3">{item.categoria ?? "-"}</td>
                      <td className="py-2">{item.estado ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
