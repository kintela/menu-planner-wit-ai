"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Loader2, Plus, Boxes, Snowflake, Trash2, Search } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

const ITEM_STATES = ["fresco", "abierto", "bajo", "agotado"] as const
const DRAWER_OPTIONS = [1, 2, 3, 4, 5] as const

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
  imagen_url?: string | null
  creado_en?: string | null
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

const EMPTY_ITEM_FORM: ItemFormState = {
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
  cantidad?: number
  unidad?: string
  notas?: string
  categoria?: string
  fecha_compra?: string
  fecha_congelacion?: string
  fecha_caducidad?: string
}

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
  imagen_url: rawItem?.imagen_url ?? null,
  creado_en: rawItem?.creado_en ?? null,
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
  const [deletingItems, setDeletingItems] = useState<Record<string, boolean>>({})
  const [pendingDeletion, setPendingDeletion] = useState<{ drawerId: string; itemId: string; itemName: string } | null>(null)

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const isSearching = normalizedSearchTerm.length > 0

  useEffect(() => {
    let isActive = true

    if (!user) {
      setFreezer(null)
      setDrawers([])
      setDrawerCountValue("")
      setSearchTerm("")
      setItemForms({})
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("congeladores")
          .select(`
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
                imagen_url,
                creado_en
              )
            )
          `)
          .eq("usuario_id", user.id)
          .order("posicion", { ascending: true, foreignTable: "cajones_congelador" })
          .order("creado_en", { ascending: true, foreignTable: "cajones_congelador.elementos_cajon" })
          .maybeSingle()

        if (error && error.code !== "PGRST116") {
          throw error
        }

        let freezerData = data

        if (!freezerData) {
          const { data: createdFreezer, error: createError } = await supabase
            .from("congeladores")
            .insert({ usuario_id: user.id })
            .select("id, nombre, descripcion")
            .single()

          if (createError) {
            throw createError
          }

          freezerData = { ...createdFreezer, cajones_congelador: [] }
        }

        if (!isActive) return

        const normalizedDrawers = Array.isArray(freezerData.cajones_congelador)
          ? freezerData.cajones_congelador.map(normalizeDrawer).sort((a, b) => a.posicion - b.posicion)
          : []

        setFreezer({ id: String(freezerData.id), nombre: freezerData.nombre, descripcion: freezerData.descripcion })
        setDrawers(normalizedDrawers)
        setDrawerCountValue(normalizedDrawers.length ? String(normalizedDrawers.length) : "")
        setItemForms((prev) => {
          const next: Record<string, ItemFormState> = {}
          normalizedDrawers.forEach((drawer) => {
            next[drawer.id] = prev[drawer.id] ?? { ...EMPTY_ITEM_FORM }
          })
          return next
        })
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
  }, [supabase, toast, user])

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

      const { data, error } = await supabase
        .from("cajones_congelador")
        .insert(payload)
        .select(`
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
            imagen_url,
            creado_en
          )
        `)

      if (error) {
        throw error
      }

      const normalized = Array.isArray(data) ? data.map(normalizeDrawer) : []
      setDrawers((prev) => {
        const next = [...prev, ...normalized].sort((a, b) => a.posicion - b.posicion)
        setDrawerCountValue(next.length ? String(next.length) : "")
        setItemForms((forms) => {
          const updated = { ...forms }
          normalized.forEach((drawer) => {
            updated[drawer.id] = { ...EMPTY_ITEM_FORM }
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
        ...(prev[drawerId] ?? { ...EMPTY_ITEM_FORM }),
        ...changes,
      },
    }))
  }

  const handleAddItem = async (drawerId: string) => {
    if (!user) {
      toast({ variant: "destructive", description: "Debes iniciar sesión para agregar elementos." })
      return
    }

    const formState = itemForms[drawerId] ?? EMPTY_ITEM_FORM

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
          imagen_url,
          creado_en
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
                items: [...drawer.items, normalizedItem].sort((a, b) => {
                  const nameA = a.nombre.toLocaleLowerCase("es")
                  const nameB = b.nombre.toLocaleLowerCase("es")
                  return nameA.localeCompare(nameB)
                }),
              }
            : drawer,
        ),
      )
      setItemForms((prev) => ({ ...prev, [drawerId]: { ...EMPTY_ITEM_FORM } }))
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

  const promptDeleteItem = (drawerId: string, itemId: string, itemName: string) => {
    setPendingDeletion({ drawerId, itemId, itemName })
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
                  />
                </div>
              </div>
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
              const formState = itemForms[drawer.id] ?? EMPTY_ITEM_FORM
              const visibleItems = isSearching
                ? drawer.items.filter((item) => itemMatchesSearch(item, normalizedSearchTerm))
                : drawer.items
              const hasItems = drawer.items.length > 0
              const hasVisibleItems = visibleItems.length > 0
              return (
                <Card key={drawer.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Snowflake className="h-5 w-5 text-blue-500" />
                      {drawer.nombre}
                    </CardTitle>
                    <CardDescription>
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
                          {visibleItems.map((item) => (
                            <li key={item.id} className="flex items-start justify-between rounded-md border p-3">
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => promptDeleteItem(drawer.id, item.id, item.nombre)}
                                disabled={Boolean(deletingItems[item.id])}
                                aria-label={`Eliminar ${item.nombre}`}
                              >
                                {deletingItems[item.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </li>
                          ))}
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
                          <div className="sm:flex-1">
                            <Label htmlFor={`item-cantidad-${drawer.id}`}>Cantidad</Label>
                            <Input
                              id={`item-cantidad-${drawer.id}`}
                              value={formState.cantidad}
                              onChange={(event) => handleItemInputChange(drawer.id, { cantidad: event.target.value })}
                              placeholder="Ej. 2"
                            />
                          </div>
                          <div className="sm:w-32">
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
    </div>
  )
}
