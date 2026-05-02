"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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

interface AdminRecipeOption {
  id: number
  name: string
  created_at?: string | null
  calories?: number | null
}

interface AdminUserOption {
  id: string
  email: string
  alias?: string | null
  full_name?: string | null
  role?: string | null
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

const formatUserLabel = (user: AdminUserOption) => user.alias || user.full_name || user.email

const formatRecipeDate = (value?: string | null) => {
  if (!value) return ""
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function AdminHomePage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualSuccess, setManualSuccess] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<AdminRecipeOption[]>([])
  const [users, setUsers] = useState<AdminUserOption[]>([])
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [recipeSearch, setRecipeSearch] = useState("")

  useEffect(() => {
    if (!user || (profile && profile.role !== "admin")) return

    let ignore = false

    const loadOptions = async () => {
      setOptionsLoading(true)
      setManualError(null)

      try {
        const response = await fetch("/api/admin/recipe-notifications", {
          method: "GET",
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || `Error ${response.status}`)
        }

        if (!ignore) {
          setRecipes(Array.isArray(payload?.recipes) ? payload.recipes : [])
          setUsers(Array.isArray(payload?.users) ? payload.users : [])
        }
      } catch (err) {
        if (!ignore) {
          setManualError(err instanceof Error ? err.message : "No se pudieron cargar recetas y usuarios.")
        }
      } finally {
        if (!ignore) setOptionsLoading(false)
      }
    }

    void loadOptions()

    return () => {
      ignore = true
    }
  }, [user, profile])

  const filteredRecipes = useMemo(() => {
    const term = recipeSearch.trim().toLowerCase()
    if (!term) return recipes

    return recipes.filter((recipe) => {
      const haystack = `${recipe.name} ${recipe.id}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [recipeSearch, recipes])

  const allRecipesSelected = useMemo(
    () => filteredRecipes.length > 0 && filteredRecipes.every((recipe) => selectedRecipeIds.includes(recipe.id)),
    [filteredRecipes, selectedRecipeIds]
  )
  const allUsersSelected = useMemo(
    () => users.length > 0 && selectedUserIds.length === users.length,
    [users.length, selectedUserIds.length]
  )

  const toggleRecipe = (recipeId: number, checked: boolean) => {
    setSelectedRecipeIds((prev) =>
      checked ? Array.from(new Set([...prev, recipeId])) : prev.filter((id) => id !== recipeId)
    )
  }

  const toggleUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked ? Array.from(new Set([...prev, userId])) : prev.filter((id) => id !== userId)
    )
  }

  const toggleAllRecipes = (checked: boolean) => {
    setSelectedRecipeIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...filteredRecipes.map((recipe) => recipe.id)]))
      }
      return prev.filter((id) => !filteredRecipes.some((recipe) => recipe.id === id))
    })
  }

  const toggleAllUsers = (checked: boolean) => {
    setSelectedUserIds(checked ? users.map((entry) => entry.id) : [])
  }

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

  const handleSendManualRecipeEmail = async () => {
    setManualLoading(true)
    setManualError(null)
    setManualSuccess(null)

    try {
      const response = await fetch("/api/admin/recipe-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeIds: selectedRecipeIds,
          recipientIds: selectedUserIds,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || `Error ${response.status}`)
      }

      setManualSuccess(payload?.message || "Email enviado correctamente.")
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setManualLoading(false)
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
    <div className="container py-10 max-w-6xl space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envío manual de recetas
          </CardTitle>
          <CardDescription>
            Selecciona una o varias recetas y uno o varios usuarios para probar el correo manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {optionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando recetas y usuarios...
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Recetas</h3>
                    <p className="text-sm text-muted-foreground">{selectedRecipeIds.length} seleccionada(s)</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allRecipesSelected} onCheckedChange={(checked) => toggleAllRecipes(Boolean(checked))} />
                    Todas
                  </label>
                </div>
                <Input
                  value={recipeSearch}
                  onChange={(event) => setRecipeSearch(event.target.value)}
                  placeholder="Buscar receta por nombre o ID..."
                />
                <div className="max-h-80 overflow-auto space-y-3 pr-1">
                  {filteredRecipes.map((recipe) => (
                    <label key={recipe.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                      <Checkbox
                        checked={selectedRecipeIds.includes(recipe.id)}
                        onCheckedChange={(checked) => toggleRecipe(recipe.id, Boolean(checked))}
                      />
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{recipe.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID {recipe.id}
                          {recipe.created_at ? ` · ${formatRecipeDate(recipe.created_at)}` : ""}
                          {recipe.calories ? ` · ${recipe.calories} kcal` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                  {recipes.length === 0 && <p className="text-sm text-muted-foreground">No hay recetas disponibles.</p>}
                  {recipes.length > 0 && filteredRecipes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay recetas que coincidan con la búsqueda.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Usuarios destinatarios</h3>
                    <p className="text-sm text-muted-foreground">{selectedUserIds.length} seleccionado(s)</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allUsersSelected} onCheckedChange={(checked) => toggleAllUsers(Boolean(checked))} />
                    Todos
                  </label>
                </div>
                <div className="max-h-80 overflow-auto space-y-3 pr-1">
                  {users.map((entry) => (
                    <label key={entry.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                      <Checkbox
                        checked={selectedUserIds.includes(entry.id)}
                        onCheckedChange={(checked) => toggleUser(entry.id, Boolean(checked))}
                      />
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{formatUserLabel(entry)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.email}
                          {entry.role ? ` · ${entry.role}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                  {users.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios disponibles.</p>}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSendManualRecipeEmail}
            disabled={manualLoading || optionsLoading || selectedRecipeIds.length === 0 || selectedUserIds.length === 0}
            className="w-full"
          >
            {manualLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando recetas...
              </>
            ) : (
              "Enviar recetas seleccionadas"
            )}
          </Button>

          {manualError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{manualError}</AlertDescription>
            </Alert>
          )}

          {manualSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{manualSuccess}</AlertDescription>
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
