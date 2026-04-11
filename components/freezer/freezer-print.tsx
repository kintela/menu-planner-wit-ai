"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { getSupabaseClient } from "@/lib/supabase/client"

interface FreezerItem {
  id: string
  nombre: string
  cantidad?: number | null
  unidad?: string | null
  estado?: string | null
  categoria?: string | null
  fecha_compra?: string | null
  fecha_congelacion?: string | null
  fecha_caducidad?: string | null
  notas?: string | null
  reservado?: boolean | null
}

interface FreezerDrawer {
  id: string
  nombre: string
  posicion: number
  items: FreezerItem[]
}

const maybeRandomId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random()}`
  }
}

const normalizeItem = (rawItem: any): FreezerItem => ({
  id: rawItem?.id ? String(rawItem.id) : maybeRandomId(),
  nombre: rawItem?.nombre ?? "",
  cantidad:
    rawItem?.cantidad === null || rawItem?.cantidad === undefined
      ? null
      : Number.parseFloat(String(rawItem.cantidad)),
  unidad: rawItem?.unidad ?? null,
  estado: rawItem?.estado ?? null,
  categoria: rawItem?.categoria ?? null,
  fecha_compra: rawItem?.fecha_compra ?? null,
  fecha_congelacion: rawItem?.fecha_congelacion ?? null,
  fecha_caducidad: rawItem?.fecha_caducidad ?? null,
  notas: rawItem?.notas ?? null,
  reservado: Boolean(rawItem?.reservado),
})

const normalizeDrawer = (rawDrawer: any): FreezerDrawer => ({
  id: rawDrawer?.id ? String(rawDrawer.id) : maybeRandomId(),
  nombre: rawDrawer?.nombre ?? "Cajón",
  posicion: typeof rawDrawer?.posicion === "number" ? rawDrawer.posicion : 0,
  items: Array.isArray(rawDrawer?.elementos_cajon)
    ? rawDrawer.elementos_cajon.map((item: any) => normalizeItem(item))
    : [],
})

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—"
  try {
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) {
      return dateString
    }
    return parsed.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "2-digit" })
  } catch {
    return dateString
  }
}

const getApiHeaders = async (supabase: ReturnType<typeof getSupabaseClient>) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    /* fallback to cookie auth */
  }

  return headers
}

export function FreezerPrintView() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [freezerName, setFreezerName] = useState("")
  const [drawers, setDrawers] = useState<FreezerDrawer[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const titleRef = useRef("")

  useEffect(() => {
    if (typeof document !== "undefined") {
      titleRef.current = document.title
    }
  }, [])

  useEffect(() => {
    const handleAfterPrint = () => {
      if (typeof document !== "undefined" && titleRef.current) {
        document.title = titleRef.current
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("afterprint", handleAfterPrint)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("afterprint", handleAfterPrint)
      }
    }
  }, [])

  useEffect(() => {
    let isActive = true

    if (authLoading) {
      return
    }

    if (!user) {
      setFreezerName("")
      setDrawers([])
      setLoading(false)
      return
    }

    const fetchData = async () => {
      if (authLoading) {
        return
      }
      setLoading(true)
      setErrorMessage(null)
      try {
        const response = await fetch("/api/freezer", {
          method: "GET",
          credentials: "include",
          headers: await getApiHeaders(supabase),
          cache: "no-store",
        })
        const payload = await response.json().catch(() => ({}))

        if (!isActive) return

        if (!response.ok) {
          throw new Error(payload?.error || `Error ${response.status}`)
        }

        const freezerData = payload?.freezer ?? { id: null, nombre: "", cajones_congelador: [] }
        const normalizedDrawers = Array.isArray(freezerData.cajones_congelador)
          ? freezerData.cajones_congelador.map(normalizeDrawer).sort((a, b) => a.posicion - b.posicion)
          : []

        setFreezerName(freezerData?.nombre ?? "")
        setDrawers(normalizedDrawers)
        setGeneratedAt(new Date())
        setLoading(false)
      } catch (error: any) {
        if (!isActive) return
        console.error("[FreezerPrintView] Error loading freezer", error)
        setErrorMessage(error?.message ?? "No se pudo cargar el congelador.")
        toast({
          variant: "destructive",
          title: "No se pudo cargar el congelador",
          description: error?.message ?? "Inténtalo de nuevo más tarde",
        })
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isActive = false
    }
  }, [authLoading, supabase, toast, user])

  const handlePrint = (mode: "print" | "pdf") => {
    if (typeof window === "undefined") return
    if (mode === "pdf" && typeof document !== "undefined") {
      const dateStamp = new Date().toISOString().slice(0, 10)
      const nameSlug = (freezerName || "congelador").trim().replace(/\s+/g, "-")
      document.title = `Listado-${nameSlug}-${dateStamp}`
    }
    window.print()
  }

  const formattedGeneratedAt = generatedAt
    ? generatedAt.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })
    : null

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="border-b bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/freezer" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al congelador
              </Link>
            </Button>
            <div>
              <p className="text-sm font-semibold text-gray-900">Imprimir congelador</p>
              <p className="text-xs text-gray-500">Vista optimizada para impresión.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => handlePrint("print")} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button type="button" variant="outline" onClick={() => handlePrint("pdf")} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Guardar PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 print:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Listado del congelador</h1>
          <p className="text-sm text-gray-600">
            {freezerName ? `Congelador: ${freezerName}` : "Congelador"}
            {formattedGeneratedAt ? ` · Generado el ${formattedGeneratedAt}` : ""}
          </p>
          <p className="mt-2 text-xs text-gray-500 print:hidden">
            En el diálogo de impresión puedes elegir imprimir en papel o guardar como PDF.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle>Inicia sesión</CardTitle>
              <CardDescription>Necesitas una sesión activa para ver el listado del congelador.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">Ir a iniciar sesión</Link>
              </Button>
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card>
            <CardHeader>
              <CardTitle>No se pudo cargar el congelador</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
          </Card>
        ) : drawers.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Sin cajones todavía</CardTitle>
              <CardDescription>No hay cajones configurados para imprimir.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {drawers.map((drawer) => (
              <section key={drawer.id} className="break-inside-avoid rounded-md border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">{drawer.nombre}</h2>
                  <span className="text-xs text-gray-500">
                    {drawer.items.length} {drawer.items.length === 1 ? "elemento" : "elementos"}
                  </span>
                </div>
                {drawer.items.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Sin elementos en este cajón.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase text-gray-500">
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Nombre</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Cantidad</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Unidad</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Estado</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Categoría</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Fª compra</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Fª congelación</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Fª caducidad</th>
                          <th className="border-b border-gray-200 px-2 py-2 font-semibold">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-800">
                        {drawer.items.map((item) => (
                          <tr
                            key={item.id}
                            className={`align-top ${item.reservado ? "bg-gray-100" : ""}`}
                          >
                            <td className="border-b border-gray-100 px-2 py-2 font-medium text-gray-900">
                              {item.nombre || "—"}
                            </td>
                            <td className="border-b border-gray-100 px-2 py-2">{item.cantidad ?? "—"}</td>
                            <td className="border-b border-gray-100 px-2 py-2">{item.unidad || "—"}</td>
                            <td className="border-b border-gray-100 px-2 py-2">{item.estado || "—"}</td>
                            <td className="border-b border-gray-100 px-2 py-2">{item.categoria || "—"}</td>
                            <td className="border-b border-gray-100 px-2 py-2">{formatDate(item.fecha_compra)}</td>
                            <td className="border-b border-gray-100 px-2 py-2">
                              {formatDate(item.fecha_congelacion)}
                            </td>
                            <td className="border-b border-gray-100 px-2 py-2">
                              {formatDate(item.fecha_caducidad)}
                            </td>
                            <td className="border-b border-gray-100 px-2 py-2">{item.notas || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
