"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, Eye, Flame, Plus, RotateCcw, Snowflake, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { RecipeSelector } from "@/components/recipe-selector"
import { useToast } from "@/hooks/use-toast"
import { useUnsavedMenuGuard } from "@/hooks/use-unsaved-menu-guard"
import type { MenuSlot } from "@/lib/weekly-menu/weekly-menu-domain"
import { hasUnsavedChanges } from "@/lib/weekly-menu/weekly-menu-domain"
import type { WeeklyMenuDto } from "@/lib/weekly-menu/weekly-menu-server-operations"
import {
  buildConceptualSlots,
  buildCopyRequest,
  buildSaveRequest,
  reduceDraft,
  type DraftAction,
} from "@/lib/weekly-menu/weekly-menu-presentation"

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const SLOT_LABELS: Record<string, string> = { "comida:1": "Primer plato", "comida:2": "Segundo plato", "cena:1": "Cena" }

type PublicRecipe = WeeklyMenuDto["recipes"][number]
type Source = { start_date: string; end_date: string; label: string }
type Target = { ref: string; label: string }

export interface WeeklyMenuActionState {
  dirty: boolean
  editable: boolean
  savedSnapshot: MenuSlot[]
  draft: MenuSlot[]
  actionInProgress: boolean
}

interface WeeklyMenuViewProps {
  initialMenu: WeeklyMenuDto
  onActionStateChange?: (state: WeeklyMenuActionState) => void
}

function targetQuery(target: string | null) {
  return target ? `&target=${encodeURIComponent(target)}` : ""
}

function shiftWeek(week: string, days: number) {
  const date = new Date(`${week}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}

async function responsePayload(response: Response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || "No se pudo completar la operación")
  return payload
}

export const WeeklyMenuView = React.memo(function WeeklyMenuView({ initialMenu, onActionStateChange }: WeeklyMenuViewProps) {
  const [menu, setMenu] = useState(initialMenu)
  const [savedSnapshot, setSavedSnapshot] = useState<MenuSlot[]>(initialMenu.saved_snapshot)
  const [draft, setDraft] = useState<MenuSlot[]>(initialMenu.saved_snapshot)
  const [target, setTarget] = useState<string | null>(initialMenu.target?.ref ?? null)
  const [sources, setSources] = useState<Source[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [selectedSource, setSelectedSource] = useState("")
  const [selector, setSelector] = useState<{ day: number; mealType: "comida" | "cena"; dishOrder: 1 | 2 } | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showEmptyConfirmation, setShowEmptyConfirmation] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const editable = menu.editable && menu.week.classification !== "past"
  const dirty = useMemo(
    () => editable && hasUnsavedChanges(savedSnapshot, draft, new Date()),
    [draft, editable, savedSnapshot],
  )
  const recipesById = useMemo(() => new Map(menu.recipes.map((recipe) => [recipe.id, recipe])), [menu.recipes])
  const conceptualSlots = useMemo(() => buildConceptualSlots(draft), [draft])

  useEffect(() => {
    onActionStateChange?.({ dirty, editable, savedSnapshot, draft, actionInProgress: busy || loading })
  }, [busy, dirty, draft, editable, loading, onActionStateChange, savedSnapshot])

  const notifyError = useCallback((error: unknown) => {
    toast({
      title: "No se pudo completar la operación",
      description: error instanceof Error ? error.message : "Inténtalo de nuevo más tarde.",
      variant: "destructive",
    })
  }, [toast])

  const fetchSources = useCallback(async (selectedTarget: string | null) => {
    const response = await fetch(`/api/weekly-menu/sources?${selectedTarget ? `target=${encodeURIComponent(selectedTarget)}` : ""}`, {
      cache: "no-store",
    })
    const payload = await responsePayload(response)
    setSources(Array.isArray(payload.sources) ? payload.sources : [])
  }, [])

  useEffect(() => {
    void fetchSources(target).catch(notifyError)
  }, [fetchSources, notifyError, target])

  useEffect(() => {
    void fetch("/api/weekly-menu/admin-targets", { cache: "no-store" })
      .then(async (response) => response.ok ? responsePayload(response) : null)
      .then((payload) => setTargets(Array.isArray(payload?.targets) ? payload.targets : []))
      .catch(() => setTargets([]))
  }, [])

  const applyDraftAction = useCallback((action: DraftAction) => {
    setDraft((current) => reduceDraft(current, action, editable))
  }, [editable])

  const discardDraft = useCallback(() => {
    setDraft(savedSnapshot)
    setSelector(null)
  }, [savedSnapshot])
  const { runGuardedAction } = useUnsavedMenuGuard({ dirty, discardDraft })

  const loadMenu = useCallback(async (selectedTarget: string | null) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/weekly-menu?week=${menu.week.start_date}${targetQuery(selectedTarget)}`, { cache: "no-store" })
      const nextMenu = await responsePayload(response) as WeeklyMenuDto
      setMenu(nextMenu)
      setSavedSnapshot(nextMenu.saved_snapshot)
      setDraft(nextMenu.saved_snapshot)
      setTarget(selectedTarget)
      setSelectedSource("")
    } catch (error) {
      notifyError(error)
    } finally {
      setLoading(false)
    }
  }, [menu.week.start_date, notifyError])

  const save = async () => {
    if (!editable || !dirty || busy) return
    setBusy(true)
    try {
      const response = await fetch("/api/weekly-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSaveRequest(menu.week.start_date, target, draft)),
      })
      const payload = await responsePayload(response)
      const persisted = payload.menu as WeeklyMenuDto
      setMenu(persisted)
      setSavedSnapshot(persisted.saved_snapshot)
      setDraft(persisted.saved_snapshot)
      await fetchSources(target)
      toast({ title: "Menú guardado", description: "Los cambios se han guardado correctamente." })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  const emptyImmediately = async () => {
    if (!editable || busy) return
    setBusy(true)
    try {
      const response = await fetch(`/api/weekly-menu?week=${menu.week.start_date}${targetQuery(target)}`, { method: "DELETE" })
      await responsePayload(response)
      const cleared = { ...menu, exists: false, is_saved: false, saved_at: null, saved_snapshot: [] }
      setMenu(cleared)
      setSavedSnapshot([])
      setDraft([])
      setSelectedSource("")
      await fetchSources(target)
      toast({ title: "Semana vaciada", description: "El menú se ha eliminado de forma inmediata." })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
      setShowEmptyConfirmation(false)
    }
  }

  const performCopySource = async () => {
    if (!editable || !selectedSource || busy) return
    setBusy(true)
    try {
      const response = await fetch("/api/weekly-menu/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCopyRequest(selectedSource, menu.week.start_date, target)),
      })
      const payload = await responsePayload(response)
      applyDraftAction({ type: "copy", slots: payload.draft.saved_snapshot })
      toast({ title: "Menú copiado al borrador", description: "Pulsa Guardar para persistirlo en esta semana." })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  const copySource = () => {
    runGuardedAction(() => void performCopySource())
  }

  const restoreDraft = () => {
    runGuardedAction(() => applyDraftAction({ type: "restore", slots: savedSnapshot }))
  }

  const navigateToWeek = (week: string) => {
    runGuardedAction(() => {
      const query = target ? `?target=${encodeURIComponent(target)}` : ""
      router.push(`/weekly-menu/${week}${query}`)
    })
  }

  const navigateToCurrentWeek = () => {
    runGuardedAction(() => router.push("/weekly-menu"))
  }

  const changeTarget = (value: string) => {
    const selectedTarget = value === "__own" ? null : value
    if (selectedTarget === target) return
    runGuardedAction(() => void loadMenu(selectedTarget))
  }

  return (
    <div className="space-y-6" data-menu-dirty={dirty ? "true" : "false"} data-menu-editable={editable ? "true" : "false"}>
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-semibold">Semana del {formatDate(menu.week.start_date)} al {formatDate(menu.week.end_date)}</p>
          <p className="text-sm text-muted-foreground">
            {editable ? (dirty ? "Hay cambios pendientes" : "Todos los cambios están guardados") : "Semana pasada: solo lectura"}
          </p>
          {menu.target && <p className="text-sm">Planificando para: {menu.target.label}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigateToWeek(shiftWeek(menu.week.start_date, -7))}>Anterior</Button>
          <Button variant="outline" onClick={navigateToCurrentWeek}>Actual</Button>
          <Button variant="outline" onClick={() => navigateToWeek(shiftWeek(menu.week.start_date, 7))}>Siguiente</Button>
        </div>
      </div>

      {targets.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <span className="text-sm font-medium">Objetivo administrativo</span>
            <Select value={target ?? "__own"} onValueChange={changeTarget} disabled={busy || loading}>
              <SelectTrigger className="sm:w-80"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__own">Mi menú</SelectItem>
                {targets.map((item) => <SelectItem key={item.ref} value={item.ref}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Planificador semanal</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedSource} onValueChange={setSelectedSource} disabled={!editable || busy || sources.length === 0}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Reutilizar menú guardado" /></SelectTrigger>
                <SelectContent>{sources.filter((source) => source.start_date !== menu.week.start_date).map((source) => (
                  <SelectItem key={source.start_date} value={source.start_date}>{source.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              <Button variant="outline" onClick={copySource} disabled={!editable || !selectedSource || busy}>Copiar al borrador</Button>
              <Button variant="outline" onClick={restoreDraft} disabled={!editable || !dirty || busy}>
                <RotateCcw className="mr-2 h-4 w-4" />Restaurar
              </Button>
              <Button variant="destructive" onClick={() => setShowEmptyConfirmation(true)} disabled={!editable || busy}>
                Vaciar semana
              </Button>
              <Button onClick={save} disabled={!editable || !dirty || busy}>{busy ? "Procesando..." : "Guardar"}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            {DAYS.map((day, dayIndex) => (
              <section key={day} className="space-y-3" aria-label={day}>
                <h2 className="text-center text-sm font-semibold">{day}</h2>
                {conceptualSlots.filter((slot) => slot.day_of_week === dayIndex).map((concept) => {
                  const slot = concept.slot
                  const recipe: PublicRecipe | undefined = slot ? recipesById.get(slot.recipe_id) : undefined
                  const identity = { day_of_week: concept.day_of_week, meal_type: concept.meal_type, dish_order: concept.dish_order }
                  return (
                    <div key={`${concept.meal_type}:${concept.dish_order}`} className="flex h-44 flex-col rounded-lg border-2 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium">{SLOT_LABELS[`${concept.meal_type}:${concept.dish_order}`]}</span>
                        {recipe && (
                          <button type="button" aria-label="Alternar sacado del congelador" aria-pressed={slot?.sacado_del_congelador} disabled={!editable}
                            onClick={() => applyDraftAction({ type: "toggle-freezer", ...identity })}
                            className={slot?.sacado_del_congelador ? "text-blue-700" : "text-gray-400"}>
                            <Snowflake className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {recipe ? (
                        <div className="flex min-h-0 flex-1 flex-col justify-between">
                          <div>
                            <p className="line-clamp-3 text-sm font-medium">{recipe.name}</p>
                            {recipe.calories != null && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Flame className="h-3 w-3" />{recipe.calories} cal</p>}
                            <p className="mt-1 truncate text-xs text-muted-foreground">{recipe.author_alias || "Usuario"}</p>
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button asChild size="icon" variant="ghost" title="Ver receta">
                              <Link href={`/recipes/${recipe.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button size="icon" variant="ghost" title="Retirar receta" disabled={!editable}
                              onClick={() => applyDraftAction({ type: "remove", ...identity })}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                            <Button size="sm" variant="outline" disabled={!editable} onClick={() => setSelector({ day: dayIndex, mealType: concept.meal_type, dishOrder: concept.dish_order })}>Cambiar</Button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" disabled={!editable} onClick={() => setSelector({ day: dayIndex, mealType: concept.meal_type, dishOrder: concept.dish_order })}
                          className="flex flex-1 flex-col items-center justify-center text-sm text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400">
                          <Plus className="mb-1 h-4 w-4" />Añadir
                        </button>
                      )}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </CardContent>
      </Card>

      {selector && editable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <RecipeSelector
            recipes={menu.recipes}
            day={DAYS[selector.day]}
            mealType={`${selector.mealType}-${selector.dishOrder}`}
            allowAiSuggestion={false}
            onSelect={(recipeId) => {
              applyDraftAction({
                type: "set",
                day_of_week: selector.day,
                meal_type: selector.mealType,
                dish_order: selector.dishOrder,
                recipe_id: recipeId,
              })
              setSelector(null)
            }}
            onCancel={() => setSelector(null)}
          />
        </div>
      )}

      {showEmptyConfirmation && (
        <ConfirmationDialog
          isOpen
          onClose={() => setShowEmptyConfirmation(false)}
          onConfirm={emptyImmediately}
          title="Vaciar semana"
          description="Se eliminarán inmediatamente el menú guardado y todos los cambios pendientes de esta semana."
          confirmText="Vaciar semana"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}
    </div>
  )
})
