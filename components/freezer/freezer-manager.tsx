"use client"

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Loader2, Plus, Boxes, Snowflake, Trash2, Search, Pencil, Printer, Bookmark } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

const ITEM_STATES = ["fresco", "abierto", "bajo", "agotado"] as const
const DRAWER_OPTIONS = [1, 2, 3, 4, 5] as const
const QUANTITY_OPTIONS = [1, 2, 3, 4, 5] as const

type ItemState = (typeof ITEM_STATES)[number]

interface Freezer {
  id: string
  nombre: string
  descripcion?: string | null
}

interface FreezerItem {
  id: string
  cajon_id: string
  nombre: string
  cantidad?: number | null
  unidad?: string | null
  estado: ItemState
  categoria?: string | null
  fecha_compra?: string | null
  fecha_congelacion?: string | null
  fecha_caducidad?: string | null
  notas?: string | null
  reservado?: boolean | null
  imagen_url?: string | null
  creado_en?: string | null
  actualizado_en?: string | null
}

interface FreezerDrawer {
  id: string
  nombre: string
  posicion: number
  descripcion?: string | null
  creado_en?: string | null
  items: FreezerItem[]
}

interface ItemFormState {
  cajon_id: string
  nombre: string
  cantidad: string
  unidad: string
  notas: string
  categoria: string
  estado: ItemState
  fecha_compra: string
  fecha_congelacion: string
  fecha_caducidad: string
}

const getTodayISO = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const EMPTY_ITEM_FORM: ItemFormState = {
  cajon_id: "",
  nombre: "",
  cantidad: "",
  unidad: "",
  notas: "",
  categoria: "",
  estado: "fresco",
  fecha_compra: "",
  fecha_congelacion: "",
  fecha_caducidad: "",
}

const buildNewItemForm = (): ItemFormState => {
  const today = getTodayISO()
  return {
    ...EMPTY_ITEM_FORM,
    fecha_compra: today,
    fecha_congelacion: today,
  }
}

const maybeRandomId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random()}`
  }
}

type DrawerPayload = {
  nombre: string
  posicion: number
  descripcion?: string | null
  congelador_id: string
}

type ItemPayload = {
  cajon_id: string
  nombre: string
  estado: ItemState
  cantidad?: number | null
  unidad?: string | null
  notas?: string | null
  categoria?: string | null
  fecha_compra?: string | null
  fecha_congelacion?: string | null
  fecha_caducidad?: string | null
  reservado?: boolean | null
}

type ItemUpdatePayload = Partial<ItemPayload>

const normalizeItem = (rawItem: any): FreezerItem => ({
  id: rawItem?.id ? String(rawItem.id) : maybeRandomId(),
  cajon_id: rawItem?.cajon_id ? String(rawItem.cajon_id) : "",
  nombre: rawItem?.nombre ?? "",
  cantidad:
    rawItem?.cantidad === null || rawItem?.cantidad === undefined
      ? null
      : Number.parseFloat(String(rawItem.cantidad)),
  unidad: rawItem?.unidad ?? null,
  estado: ITEM_STATES.includes(rawItem?.estado as ItemState) ? (rawItem.estado as ItemState) : "fresco",
  categoria: rawItem?.categoria ?? null,
  fecha_compra: rawItem?.fecha_compra ?? null,
  fecha_congelacion: rawItem?.fecha_congelacion ?? null,
  fecha_caducidad: rawItem?.fecha_caducidad ?? null,
  notas: rawItem?.notas ?? null,
  reservado: Boolean(rawItem?.reservado),
  imagen_url: rawItem?.imagen_url ?? null,
  creado_en: rawItem?.creado_en ?? null,
  actualizado_en: rawItem?.actualizado_en ?? null,
})

const normalizeDrawer = (rawDrawer: any): FreezerDrawer => ({
  id: rawDrawer?.id ? String(rawDrawer.id) : maybeRandomId(),
  nombre: rawDrawer?.nombre ?? "Cajón",
  posicion: typeof rawDrawer?.posicion === "number" ? rawDrawer.posicion : 0,
  descripcion: rawDrawer?.descripcion ?? null,
  creado_en: rawDrawer?.creado_en ?? null,
  items: Array.isArray(rawDrawer?.elementos_cajon)
    ? rawDrawer.elementos_cajon.map((item: any) => normalizeItem({ ...item, cajon_id: rawDrawer.id }))
    : [],
})

const formatDate = (dateString?: string | null) => {
  if (!dateString) return ""
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

const sortItemsByName = (items: FreezerItem[]) =>
  [...items].sort((a, b) => {
    const nameA = a.nombre.toLocaleLowerCase("es")
    const nameB = b.nombre.toLocaleLowerCase("es")
    return nameA.localeCompare(nameB, "es")
  })

const itemMatchesSearch = (item: FreezerItem, search: string) => {
  if (!search) return true
  const haystack: string[] = []
  if (item.nombre) haystack.push(item.nombre)
  if (item.categoria) haystack.push(item.categoria)
  if (item.notas) haystack.push(item.notas)
  if (item.unidad) haystack.push(item.unidad)
  if (item.estado) haystack.push(item.estado)
  if (item.fecha_compra) haystack.push(item.fecha_compra)
  if (item.fecha_congelacion) haystack.push(item.fecha_congelacion)
  if (item.fecha_caducidad) haystack.push(item.fecha_caducidad)
  if (item.cantidad !== null && item.cantidad !== undefined) {
    haystack.push(String(item.cantidad))
  }
  return haystack.some((value) => value.toLowerCase().includes(search))
}

const buildItemFormState = (item: FreezerItem): ItemFormState => ({
  cajon_id: item.cajon_id ?? "",
  nombre: item.nombre ?? "",
  cantidad: item.cantidad === null || item.cantidad === undefined ? "" : String(item.cantidad),
  unidad: item.unidad ?? "",
  notas: item.notas ?? "",
  categoria: item.categoria ?? "",
  estado: item.estado ?? "fresco",
  fecha_compra: item.fecha_compra ?? "",
  fecha_congelacion: item.fecha_congelacion ?? "",
  fecha_caducidad: item.fecha_caducidad ?? "",
})

export function FreezerManager() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const supabase = useMemo(() => getSupabaseClient(), [])

  const [freezer, setFreezer] = useState<Freezer | null>(null)
  const [drawers, setDrawers] = useState<FreezerDrawer[]>([])
  const [drawerCountValue, setDrawerCountValue] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [creatingDrawers, setCreatingDrawers] = useState(false)
  const [itemForms, setItemForms] = useState<Record<string, ItemFormState>>({})
  const [addingItems, setAddingItems] = useState<Record<string, boolean>>({})
  const [editingItems, setEditingItems] = useState<Record<string, boolean>>({})
  const [editForms, setEditForms] = useState<Record<string, ItemFormState>>({})
  const [savingEdits, setSavingEdits] = useState<Record<string, boolean>>({})
  const [deletingItems, setDeletingItems] = useState<Record<string, boolean>>({})
  const [reservingItems, setReservingItems] = useState<Record<string, boolean>>({})
  const [clearingDrawers, setClearingDrawers] = useState<Record<string, boolean>>({})
  const [pendingDeletion, setPendingDeletion] = useState<{ drawerId: string; itemId: string; itemName: string } | null>(null)
  const [pendingDrawerClear, setPendingDrawerClear] = useState<{
    drawerId: string
    drawerName: string
    itemCount: number
  } | null>(null)

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const isSearching = normalizedSearchTerm.length > 0

  useEffect(() => {
    let isActive = true

    if (authLoading) {
      return
    }

    if (!user) {
      setFreezer(null)
      setDrawers([])
      setDrawerCountValue("")
      setSearchTerm("")
      setItemForms({})
      setEditingItems({})
      setEditForms({})
      setSavingEdits({})
      setReservingItems({})
      setLoading(false)
      return
    }

    const fetchData = async () => {
      if (authLoading) {
        return
      }
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("congeladores")
          .select(
            `
              id,
              nombre,
              descripcion,
              cajones_congelador (
                id,
                nombre,
                posicion,
                descripcion,
                creado_en,
                elementos_cajon (
                  id,
                  cajon_id,
                  nombre,
                  cantidad,
                  unidad,
                  estado,
                  categoria,
                  fecha_compra,
                  fecha_congelacion,
                  fecha_caducidad,
                  notas,
                  reservado,
                  imagen_url,
                  creado_en
                )
              )
            `,
          )
          .eq("usuario_id", user.id)
          .order("posicion", { ascending: true, foreignTable: "cajones_congelador" })
          .order("creado_en", { ascending: true, foreignTable: "cajones_congelador.elementos_cajon" })
          .maybeSingle()
        //console.log("[FreezerManager] Supabase data: ", JSON.stringify(data))
        console.log("[FreezerManager] Supabase error: ", error)

        if (!isActive) return

        if (error && error.code !== "PGRST116") {
          throw error
        }

        const freezerData = data ?? { id: null, nombre: "", descripcion: null, cajones_congelador: [] }

        const normalizedDrawers = Array.isArray(freezerData.cajones_congelador)
          ? freezerData.cajones_congelador.map(normalizeDrawer).sort((a, b) => a.posicion - b.posicion)
          : []

        setFreezer(
          freezerData?.id
            ? { id: String(freezerData.id), nombre: freezerData.nombre, descripcion: freezerData.descripcion }
            : null,
        )
        setDrawers(normalizedDrawers)
        setDrawerCountValue(normalizedDrawers.length ? String(normalizedDrawers.length) : "")
        setItemForms((prev) => {
          const next: Record<string, ItemFormState> = {}
          normalizedDrawers.forEach((drawer) => {
            next[drawer.id] = prev[drawer.id] ?? buildNewItemForm()
          })
          return next
        })
        setEditingItems({})
        setEditForms({})
        setSavingEdits({})
        setReservingItems({})
        if (isActive) {
          setLoading(false)
        }
        return
      } catch (error: any) {
        if (!isActive) return
        console.error("[FreezerManager] Error loading freezer", error)
        toast({
          variant: "destructive",
          title: "No se pudo cargar el congelador",
          description: error?.message ?? "Inténtalo de nuevo más tarde",
        })
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isActive = false
    }
  }, [supabase, toast, user, authLoading])

  const handleDrawerCountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      toast({ variant: "destructive", description: "Debes iniciar sesión para gestionar el congelador." })
      return
    }

    if (!freezer) {
      toast({ variant: "destructive", description: "No se encontró un congelador asociado. Recarga la página." })
      return
    }

    if (!drawerCountValue) {
      toast({ variant: "destructive", description: "Selecciona cuántos cajones quieres gestionar." })
      return
    }

    const targetCount = Number.parseInt(drawerCountValue, 10)

    if (Number.isNaN(targetCount) || targetCount < 1) {
      toast({ variant: "destructive", description: "Selecciona un número válido de cajones." })
      setDrawerCountValue(drawers.length ? String(drawers.length) : "")
      return
    }

    const currentCount = drawers.length

    if (targetCount === currentCount) {
      toast({ description: "El número de cajones ya coincide con el valor indicado." })
      return
    }

    if (targetCount < currentCount) {
      toast({
        variant: "destructive",
        title: "Acción no disponible",
        description: "Reducir cajones no está soportado todavía.",
      })
      setDrawerCountValue(currentCount ? String(currentCount) : "")
      return
    }

    const toCreate = targetCount - currentCount
    if (toCreate <= 0) return

    const maxPosition = drawers.reduce((max, drawer) => Math.max(max, drawer.posicion), -1)

    setCreatingDrawers(true)
    try {
      const payload: DrawerPayload[] = Array.from({ length: toCreate }).map((_, index) => ({
        nombre: `Cajón ${currentCount + index + 1}`,
        posicion: maxPosition + index + 1,
        descripcion: null,
        congelador_id: freezer.id,
      }))

      const response = await fetch("/api/freezer/drawers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freezerId: freezer.id, drawers: payload }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || `Error ${response.status}`)
      }

      const { drawers: createdDrawers } = await response.json()

      const normalized = Array.isArray(createdDrawers)
        ? createdDrawers.map((drawer: any) => ({
            ...normalizeDrawer({ ...drawer, elementos_cajon: [] }),
          }))
        : []
      setDrawers((prev) => {
        const next = [...prev, ...normalized].sort((a, b) => a.posicion - b.posicion)
        setDrawerCountValue(next.length ? String(next.length) : "")
        setItemForms((forms) => {
          const updated = { ...forms }
          normalized.forEach((drawer) => {
            updated[drawer.id] = buildNewItemForm()
          })
          return updated
        })
        return next
      })

      toast({ title: "Cajones creados", description: `Se añadieron ${toCreate} nuevo(s) cajón(es).` })
    } catch (error: any) {
      console.error("[FreezerManager] Error creating drawers", error)
      toast({
        variant: "destructive",
        title: "No se pudieron crear los cajones",
        description: error?.message ?? "Inténtalo de nuevo más tarde",
      })
      setDrawerCountValue(drawers.length ? String(drawers.length) : "")
    } finally {
      setCreatingDrawers(false)
    }
  }

  const handleItemInputChange = (drawerId: string, changes: Partial<ItemFormState>) => {
    setItemForms((prev) => ({
      ...prev,
      [drawerId]: {
        ...(prev[drawerId] ?? buildNewItemForm()),
        ...changes,
      },
    }))
  }

  const handleAddItem = async (drawerId: string) => {
    if (!user) {
      toast({ variant: "destructive", description: "Debes iniciar sesión para agregar elementos." })
      return
    }

    const formState = itemForms[drawerId] ?? buildNewItemForm()

    if (!formState.nombre.trim()) {
      toast({ variant: "destructive", description: "El nombre del elemento es obligatorio." })
      return
    }

    setAddingItems((prev) => ({ ...prev, [drawerId]: true }))

    try {
      const payload: ItemPayload = {
        cajon_id: drawerId,
        nombre: formState.nombre.trim(),
        estado: formState.estado,
      }

      if (formState.cantidad) {
        const parsedQuantity = Number(formState.cantidad.replace(",", "."))
        if (!Number.isNaN(parsedQuantity)) {
          payload.cantidad = parsedQuantity
        }
      }

      if (formState.unidad) payload.unidad = formState.unidad.trim()
      if (formState.notas) payload.notas = formState.notas.trim()
      if (formState.categoria) payload.categoria = formState.categoria.trim()
      if (formState.fecha_compra) payload.fecha_compra = formState.fecha_compra
      if (formState.fecha_congelacion) payload.fecha_congelacion = formState.fecha_congelacion
      if (formState.fecha_caducidad) payload.fecha_caducidad = formState.fecha_caducidad

      const { data, error } = await supabase
        .from("elementos_cajon")
        .insert(payload)
        .select(`
          id,
          cajon_id,
          nombre,
          cantidad,
          unidad,
          estado,
          categoria,
          fecha_compra,
          fecha_congelacion,
          fecha_caducidad,
          notas,
          reservado,
          imagen_url,
          creado_en,
          actualizado_en
        `)
        .single()

      if (error) {
        throw error
      }

      const normalizedItem = normalizeItem(data)

      setDrawers((prev) =>
        prev.map((drawer) =>
          drawer.id === drawerId
            ? {
                ...drawer,
                items: sortItemsByName([...drawer.items, normalizedItem]),
              }
            : drawer,
        ),
      )
      setItemForms((prev) => ({ ...prev, [drawerId]: buildNewItemForm() }))
      toast({ title: "Elemento añadido", description: `${normalizedItem.nombre} se guardó en el cajón.` })
    } catch (error: any) {
      console.error("[FreezerManager] Error adding item", error)
      toast({
        variant: "destructive",
        title: "No se pudo guardar el elemento",
        description: error?.message ?? "Inténtalo de nuevo más tarde",
      })
    } finally {
      setAddingItems((prev) => ({ ...prev, [drawerId]: false }))
    }
  }

  const handleEditInputChange = (itemId: string, changes: Partial<ItemFormState>) => {
    setEditForms((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? { ...EMPTY_ITEM_FORM }),
        ...changes,
      },
    }))
  }

  const handleToggleEditItem = (item: FreezerItem) => {
    setEditingItems((prev) => {
      const isEditing = Boolean(prev[item.id])
      if (isEditing) {
        const { [item.id]: _, ...rest } = prev
        setEditForms((forms) => {
          const { [item.id]: __, ...remaining } = forms
          return remaining
        })
        setSavingEdits((prevSaving) => {
          const { [item.id]: __, ...remaining } = prevSaving
          return remaining
        })
        return rest
      }
      setEditForms((forms) => ({
        ...forms,
        [item.id]: buildItemFormState(item),
      }))
      return { ...prev, [item.id]: true }
    })
  }

  const handleCancelEdit = (itemId: string) => {
    setEditingItems((prev) => {
      const { [itemId]: _, ...rest } = prev
      return rest
    })
    setEditForms((prev) => {
      const { [itemId]: _, ...rest } = prev
      return rest
    })
    setSavingEdits((prev) => {
      const { [itemId]: _, ...rest } = prev
      return rest
    })
  }

  const handleUpdateItem = async (drawerId: string, itemId: string) => {
    if (!user) {
      toast({ variant: "destructive", description: "Debes iniciar sesión para editar elementos." })
      return
    }

    const formState = editForms[itemId]

    if (!formState) {
      return
    }

    if (!formState.nombre.trim()) {
      toast({ variant: "destructive", description: "El nombre del elemento es obligatorio." })
      return
    }

    const targetDrawerId = formState.cajon_id || drawerId
    const targetDrawer = drawers.find((drawer) => drawer.id === targetDrawerId)

    if (!targetDrawer) {
      toast({ variant: "destructive", description: "Selecciona un cajón válido." })
      return
    }

    const rawQuantity = formState.cantidad.trim()
    let quantityValue: number | null = null
    if (rawQuantity) {
      const parsed = Number(rawQuantity.replace(",", "."))
      if (Number.isNaN(parsed)) {
        toast({ variant: "destructive", description: "Introduce un número válido en la cantidad." })
        return
      }
      quantityValue = parsed
    }

    const updates: ItemUpdatePayload = {
      cajon_id: targetDrawerId,
      nombre: formState.nombre.trim(),
      estado: formState.estado,
      cantidad: rawQuantity ? quantityValue : null,
      unidad: formState.unidad.trim() || null,
      notas: formState.notas.trim() || null,
      categoria: formState.categoria.trim() || null,
      fecha_compra: formState.fecha_compra || null,
      fecha_congelacion: formState.fecha_congelacion || null,
      fecha_caducidad: formState.fecha_caducidad || null,
    }

    setSavingEdits((prev) => ({ ...prev, [itemId]: true }))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(`/api/freezer/items/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ drawerId, updates }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error || "No se pudo actualizar el elemento.")
      }

      const normalizedItem = normalizeItem(payload.item)

      setDrawers((prev) =>
        prev.map((drawer) => {
          const filteredItems = drawer.items.filter((item) => item.id !== itemId)
          if (drawer.id !== normalizedItem.cajon_id) {
            return filteredItems.length === drawer.items.length ? drawer : { ...drawer, items: filteredItems }
          }
          return {
            ...drawer,
            items: sortItemsByName([...filteredItems, normalizedItem]),
          }
        }),
      )

      setEditForms((prev) => ({ ...prev, [itemId]: buildItemFormState(normalizedItem) }))
      setEditingItems((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
      toast({
        title: "Elemento actualizado",
        description:
          normalizedItem.cajon_id !== drawerId
            ? `${normalizedItem.nombre} se movió a ${targetDrawer.nombre}.`
            : `${normalizedItem.nombre} se actualizó correctamente.`,
      })
    } catch (error: any) {
      console.error("[FreezerManager] Error updating item", error)
      toast({
        variant: "destructive",
        title: "No se pudo actualizar el elemento",
        description: error?.message ?? "Inténtalo más tarde.",
      })
    } finally {
      setSavingEdits((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleToggleReserved = async (drawerId: string, item: FreezerItem) => {
    if (!user) {
      toast({ variant: "destructive", description: "Debes iniciar sesión para actualizar elementos." })
      return
    }

    setReservingItems((prev) => ({ ...prev, [item.id]: true }))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(`/api/freezer/items/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ drawerId, updates: { reservado: !item.reservado } }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error || "No se pudo actualizar el estado del elemento.")
      }

      const normalizedItem = normalizeItem(payload.item)

      setDrawers((prev) =>
        prev.map((drawer) =>
          drawer.id === drawerId
            ? {
                ...drawer,
                items: drawer.items.map((current) => (current.id === item.id ? normalizedItem : current)),
              }
            : drawer,
        ),
      )

      toast({
        description: normalizedItem.reservado
          ? `${normalizedItem.nombre} marcado como reservado.`
          : `${normalizedItem.nombre} liberado.`,
      })
    } catch (error: any) {
      console.error("[FreezerManager] Error updating reserved status", error)
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description: error?.message ?? "Inténtalo más tarde.",
      })
    } finally {
      setReservingItems((prev) => {
        const { [item.id]: _, ...rest } = prev
        return rest
      })
    }
  }

  const promptDeleteItem = (drawerId: string, itemId: string, itemName: string) => {
    setPendingDeletion({ drawerId, itemId, itemName })
  }

  const promptClearDrawer = (drawerId: string, drawerName: string, itemCount: number) => {
    if (itemCount === 0) {
      return
    }
    setPendingDrawerClear({ drawerId, drawerName, itemCount })
  }

  const deleteItem = async ({ drawerId, itemId, itemName }: { drawerId: string; itemId: string; itemName: string }) => {
    setDeletingItems((prev) => ({ ...prev, [itemId]: true }))

    try {
      const { error } = await supabase
        .from("elementos_cajon")
        .delete()
        .eq("id", itemId)
        .eq("cajon_id", drawerId)

      if (error) {
        throw error
      }

      setDrawers((prev) =>
        prev.map((drawer) =>
          drawer.id === drawerId
            ? { ...drawer, items: drawer.items.filter((item) => item.id !== itemId) }
            : drawer,
        ),
      )
      setEditingItems((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
      setEditForms((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
      setSavingEdits((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
      setReservingItems((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
      toast({ description: `${itemName} eliminado` })
    } catch (error: any) {
      console.error("[FreezerManager] Error deleting item", error)
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: error?.message ?? "Vuelve a intentarlo",
      })
    } finally {
      setDeletingItems((prev) => {
        const { [itemId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleConfirmDelete = () => {
    if (!pendingDeletion) return
    const deletion = pendingDeletion
    void deleteItem(deletion)
  }

  const clearDrawerItems = async ({
    drawerId,
    drawerName,
    itemCount,
  }: {
    drawerId: string
    drawerName: string
    itemCount: number
  }) => {
    setClearingDrawers((prev) => ({ ...prev, [drawerId]: true }))

    const drawerToClear = drawers.find((drawer) => drawer.id === drawerId)
    const drawerItemIds = drawerToClear?.items.map((item) => item.id) ?? []

    try {
      const { error } = await supabase.from("elementos_cajon").delete().eq("cajon_id", drawerId)

      if (error) {
        throw error
      }

      setDrawers((prev) =>
        prev.map((drawer) => (drawer.id === drawerId ? { ...drawer, items: [] } : drawer)),
      )

      if (drawerItemIds.length > 0) {
        setDeletingItems((prev) => {
          const next = { ...prev }
          for (const itemId of drawerItemIds) {
            delete next[itemId]
          }
          return next
        })
        setEditingItems((prev) => {
          const next = { ...prev }
          for (const itemId of drawerItemIds) {
            delete next[itemId]
          }
          return next
        })
        setEditForms((prev) => {
          const next = { ...prev }
          for (const itemId of drawerItemIds) {
            delete next[itemId]
          }
          return next
        })
        setSavingEdits((prev) => {
          const next = { ...prev }
          for (const itemId of drawerItemIds) {
            delete next[itemId]
          }
          return next
        })
        setReservingItems((prev) => {
          const next = { ...prev }
          for (const itemId of drawerItemIds) {
            delete next[itemId]
          }
          return next
        })
      }

      toast({
        title: "Cajón vaciado",
        description:
          itemCount === 1
            ? `Se eliminó 1 elemento de ${drawerName}.`
            : `Se eliminaron ${itemCount} elementos de ${drawerName}.`,
      })
    } catch (error: any) {
      console.error("[FreezerManager] Error clearing drawer items", error)
      toast({
        variant: "destructive",
        title: "No se pudo vaciar el cajón",
        description: error?.message ?? "Inténtalo más tarde.",
      })
    } finally {
      setClearingDrawers((prev) => {
        const { [drawerId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleConfirmDrawerClear = () => {
    if (!pendingDrawerClear) return
    const request = pendingDrawerClear
    void clearDrawerItems(request)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Gestiona tu congelador</CardTitle>
          <CardDescription>
            Inicia sesión para crear cajones y organizar los alimentos guardados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Una vez autenticado podrás configurar los cajones de tu congelador y registrar qué guardas en cada uno.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const freezerName = freezer?.nombre ?? "Tu congelador"
  const freezerDescription = freezer?.descripcion

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{freezerName}</h1>
            <p className="text-gray-600">
              {freezerDescription || "Define tus cajones y controla el contenido de cada uno."}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurar cajones</CardTitle>
            <CardDescription>
              Indica cuántos cajones quieres gestionar. De momento solo se pueden añadir nuevos cajones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end md:flex-nowrap md:gap-3"
              onSubmit={handleDrawerCountSubmit}
            >
              <div className="w-full sm:w-44">
                <Label htmlFor="drawer-count">Número de cajones</Label>
                <select
                  id="drawer-count"
                  value={drawerCountValue}
                  onChange={(event) => setDrawerCountValue(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona...</option>
                  {DRAWER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={creatingDrawers} className="sm:w-auto">
                {creatingDrawers ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Snowflake className="mr-2 h-4 w-4" />
                    Actualizar cajones
                  </>
                )}
              </Button>
              <div className="w-full sm:flex-1 md:w-64 md:flex-none">
                <Label htmlFor="drawer-search">Buscar elementos</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <Input
                    id="drawer-search"
                    type="search"
                    placeholder="Nombre, notas, categoría..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                    aria-label="Buscar elementos del congelador"
                  />
                </div>
              </div>
              <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/freezer/print" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  <span className="text-sm font-medium">Imprimir</span>
                </Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Cajones existentes</h2>
          <p className="text-sm text-gray-600">{drawers.length} cajón(es) configurado(s)</p>
        </div>

        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : drawers.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Sin cajones todavía</CardTitle>
              <CardDescription>Utiliza el formulario superior para crear tus primeros cajones.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {drawers.map((drawer) => {
              const formState = itemForms[drawer.id] ?? buildNewItemForm()
              const visibleItems = isSearching
                ? drawer.items.filter((item) => itemMatchesSearch(item, normalizedSearchTerm))
                : drawer.items
              const hasItems = drawer.items.length > 0
              const hasVisibleItems = visibleItems.length > 0
              return (
                <Card key={drawer.id} className="flex flex-col">
                  <CardHeader className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-4"
                      onClick={() => promptClearDrawer(drawer.id, drawer.nombre, drawer.items.length)}
                      disabled={!hasItems || Boolean(clearingDrawers[drawer.id])}
                      aria-label={`Vaciar ${drawer.nombre}`}
                    >
                      {clearingDrawers[drawer.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <CardTitle className="flex items-center gap-2 pr-12">
                      <Snowflake className="h-5 w-5 text-blue-500" />
                      {drawer.nombre}
                    </CardTitle>
                    <CardDescription className="pr-12">
                      {!hasItems
                        ? "Este cajón está vacío. Añade tu primer elemento."
                        : isSearching
                          ? hasVisibleItems
                            ? `${visibleItems.length} coincidencia(s) en este cajón.`
                            : "Sin coincidencias para tu búsqueda en este cajón."
                          : `${drawer.items.length} elemento(s) guardado(s).`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 flex-1">
                    <div className="space-y-3">
                      {!hasItems ? (
                        <p className="text-sm text-gray-600">No hay elementos registrados en este cajón.</p>
                      ) : !hasVisibleItems ? (
                        <p className="text-sm text-gray-600">
                          {`No hay elementos que coincidan con "${searchTerm}".`}
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {visibleItems.map((item) => {
                            const isEditing = Boolean(editingItems[item.id])
                            const editFormState = editForms[item.id] ?? buildItemFormState(item)
                            const isSavingEdit = Boolean(savingEdits[item.id])
                            const isDeletingItem = Boolean(deletingItems[item.id])
                            const isReservingItem = Boolean(reservingItems[item.id])
                            const isReserved = Boolean(item.reservado)
                            const baseEditId = `item-edit-${item.id}`
                            const fieldId = (suffix: string) => `${baseEditId}-${suffix}`

                            return (
                              <li
                                key={item.id}
                                className={`rounded-md border p-3 ${
                                  isReserved ? "border-gray-200 bg-gray-100" : "bg-white"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{item.nombre}</p>
                                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                                      {item.estado && <p>Estado: {item.estado}</p>}
                                      {item.cantidad != null && item.cantidad !== undefined && (
                                        <p>
                                          Cantidad: {item.cantidad}
                                          {item.unidad ? ` ${item.unidad}` : ""}
                                        </p>
                                      )}
                                      {item.categoria && <p>Categoría: {item.categoria}</p>}
                                      {item.fecha_compra && <p>Comprado: {formatDate(item.fecha_compra)}</p>}
                                      {item.fecha_congelacion && <p>Congelado: {formatDate(item.fecha_congelacion)}</p>}
                                      {item.fecha_caducidad && <p>Caduca: {formatDate(item.fecha_caducidad)}</p>}
                                      {item.notas && <p>Notas: {item.notas}</p>}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleToggleReserved(drawer.id, item)}
                                      disabled={isDeletingItem || isSavingEdit || isReservingItem}
                                      aria-pressed={isReserved}
                                      aria-label={
                                        isReserved
                                          ? `Quitar reserva de ${item.nombre}`
                                          : `Marcar ${item.nombre} como reservado`
                                      }
                                    >
                                      {isReservingItem ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Bookmark className={`h-4 w-4 ${isReserved ? "text-gray-900" : "text-gray-400"}`} />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleToggleEditItem(item)}
                                      disabled={isDeletingItem || isSavingEdit}
                                      aria-label={`${isEditing ? "Cerrar formulario de" : "Editar"} ${item.nombre}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => promptDeleteItem(drawer.id, item.id, item.nombre)}
                                      disabled={isDeletingItem}
                                      aria-label={`Eliminar ${item.nombre}`}
                                    >
                                      {isDeletingItem ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                {isEditing && (
                                  <div className="mt-3 space-y-3 rounded-md border border-dashed border-gray-200 bg-gray-50 p-3">
                                    <div>
                                      <Label htmlFor={fieldId("nombre")}>Nombre</Label>
                                      <Input
                                        id={fieldId("nombre")}
                                        value={editFormState.nombre}
                                        onChange={(event) =>
                                          handleEditInputChange(item.id, { nombre: event.target.value })
                                        }
                                      />
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                      <div className="sm:w-24">
                                        <Label htmlFor={fieldId("cantidad")}>Cantidad</Label>
                                        <select
                                          id={fieldId("cantidad")}
                                          value={editFormState.cantidad}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { cantidad: event.target.value })
                                          }
                                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="">Sin cantidad</option>
                                          {QUANTITY_OPTIONS.map((quantity) => (
                                            <option key={quantity} value={quantity}>
                                              {quantity}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="sm:flex-1">
                                        <Label htmlFor={fieldId("unidad")}>Unidad</Label>
                                        <Input
                                          id={fieldId("unidad")}
                                          value={editFormState.unidad}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { unidad: event.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                      <div className="min-w-0">
                                        <Label htmlFor={fieldId("categoria")}>Categoría</Label>
                                        <Input
                                          id={fieldId("categoria")}
                                          value={editFormState.categoria}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { categoria: event.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <Label htmlFor={fieldId("estado")}>Estado</Label>
                                        <select
                                          id={fieldId("estado")}
                                          value={editFormState.estado}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { estado: event.target.value as ItemState })
                                          }
                                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                          {ITEM_STATES.map((state) => (
                                            <option key={state} value={state}>
                                              {state}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="min-w-0">
                                        <Label htmlFor={fieldId("cajon")}>Cajón</Label>
                                        <select
                                          id={fieldId("cajon")}
                                          value={editFormState.cajon_id || drawer.id}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { cajon_id: event.target.value })
                                          }
                                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                          {drawers.map((drawerOption) => (
                                            <option key={drawerOption.id} value={drawerOption.id}>
                                              {drawerOption.nombre}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      <div className="min-w-0">
                                        <Label htmlFor={fieldId("fecha-compra")}>Fª compra</Label>
                                        <Input
                                          id={fieldId("fecha-compra")}
                                          type="date"
                                          value={editFormState.fecha_compra}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { fecha_compra: event.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <Label htmlFor={fieldId("fecha-congelacion")}>Fª congelación</Label>
                                        <Input
                                          id={fieldId("fecha-congelacion")}
                                          type="date"
                                          value={editFormState.fecha_congelacion}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { fecha_congelacion: event.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <Label htmlFor={fieldId("fecha-caducidad")}>Fª caducidad</Label>
                                        <Input
                                          id={fieldId("fecha-caducidad")}
                                          type="date"
                                          value={editFormState.fecha_caducidad}
                                          onChange={(event) =>
                                            handleEditInputChange(item.id, { fecha_caducidad: event.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor={fieldId("notas")}>Notas</Label>
                                      <Textarea
                                        id={fieldId("notas")}
                                        value={editFormState.notas}
                                        onChange={(event) => handleEditInputChange(item.id, { notas: event.target.value })}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleCancelEdit(item.id)}
                                        disabled={isSavingEdit}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() => handleUpdateItem(drawer.id, item.id)}
                                        disabled={isSavingEdit}
                                      >
                                        {isSavingEdit ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                          </>
                                        ) : (
                                          "Guardar cambios"
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-md bg-gray-50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-800">Añadir elemento</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`item-nombre-${drawer.id}`}>Nombre</Label>
                          <Input
                            id={`item-nombre-${drawer.id}`}
                            value={formState.nombre}
                            onChange={(event) => handleItemInputChange(drawer.id, { nombre: event.target.value })}
                            placeholder="Ej. Pechugas de pollo"
                          />
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="sm:w-24">
                            <Label htmlFor={`item-cantidad-${drawer.id}`}>Cantidad</Label>
                            <select
                              id={`item-cantidad-${drawer.id}`}
                              value={formState.cantidad}
                              onChange={(event) => handleItemInputChange(drawer.id, { cantidad: event.target.value })}
                              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Selecciona</option>
                              {QUANTITY_OPTIONS.map((quantity) => (
                                <option key={quantity} value={quantity}>
                                  {quantity}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:flex-1">
                            <Label htmlFor={`item-unidad-${drawer.id}`}>Unidad</Label>
                            <Input
                              id={`item-unidad-${drawer.id}`}
                              value={formState.unidad}
                              onChange={(event) => handleItemInputChange(drawer.id, { unidad: event.target.value })}
                              placeholder="kg, ud..."
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="sm:flex-1">
                            <Label htmlFor={`item-categoria-${drawer.id}`}>Categoría</Label>
                            <Input
                              id={`item-categoria-${drawer.id}`}
                              value={formState.categoria}
                              onChange={(event) => handleItemInputChange(drawer.id, { categoria: event.target.value })}
                              placeholder="Ej. Carnes, Postres..."
                            />
                          </div>
                          <div className="sm:w-40">
                            <Label htmlFor={`item-estado-${drawer.id}`}>Estado</Label>
                            <select
                              id={`item-estado-${drawer.id}`}
                              value={formState.estado}
                              onChange={(event) =>
                                handleItemInputChange(drawer.id, { estado: event.target.value as ItemState })
                              }
                              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {ITEM_STATES.map((state) => (
                                <option key={state} value={state}>
                                  {state}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="min-w-0">
                            <Label htmlFor={`item-fecha-compra-${drawer.id}`}>Fª compra</Label>
                            <Input
                              id={`item-fecha-compra-${drawer.id}`}
                              type="date"
                              value={formState.fecha_compra}
                              onChange={(event) => handleItemInputChange(drawer.id, { fecha_compra: event.target.value })}
                            />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor={`item-fecha-congelacion-${drawer.id}`}>Fª congelación</Label>
                            <Input
                              id={`item-fecha-congelacion-${drawer.id}`}
                              type="date"
                              value={formState.fecha_congelacion}
                              onChange={(event) =>
                                handleItemInputChange(drawer.id, { fecha_congelacion: event.target.value })
                              }
                            />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor={`item-fecha-caducidad-${drawer.id}`}>Fª caducidad</Label>
                            <Input
                              id={`item-fecha-caducidad-${drawer.id}`}
                              type="date"
                              value={formState.fecha_caducidad}
                              onChange={(event) =>
                                handleItemInputChange(drawer.id, { fecha_caducidad: event.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`item-notas-${drawer.id}`}>Notas</Label>
                          <Textarea
                            id={`item-notas-${drawer.id}`}
                            value={formState.notas}
                            onChange={(event) => handleItemInputChange(drawer.id, { notas: event.target.value })}
                            placeholder="Detalles relevantes: marca, preparado, etc."
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleAddItem(drawer.id)}
                          disabled={Boolean(addingItems[drawer.id])}
                          className="w-full"
                        >
                          {addingItems[drawer.id] ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Añadir al cajón
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
      {pendingDeletion && (
        <ConfirmationDialog
          isOpen
          onClose={() => setPendingDeletion(null)}
          onConfirm={handleConfirmDelete}
          title="Eliminar elemento"
          description={`¿Seguro que quieres eliminar ${pendingDeletion.itemName}? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}
      {pendingDrawerClear && (
        <ConfirmationDialog
          isOpen
          onClose={() => setPendingDrawerClear(null)}
          onConfirm={handleConfirmDrawerClear}
          title="Vaciar cajón"
          description={`¿Eliminar todos los elementos de ${pendingDrawerClear.drawerName}? Se eliminarán ${
            pendingDrawerClear.itemCount === 1
              ? "1 elemento"
              : `${pendingDrawerClear.itemCount} elementos`
          } y no se puede deshacer.`}
          confirmText="Vaciar cajón"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}
    </div>
  )
}
