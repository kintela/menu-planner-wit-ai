"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Edit2, Plus, MoveRight, AlertTriangle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface CategoryWithCount extends Category {
  recipe_count: number
}

interface DuplicateCategory {
  name: string
  categories: CategoryWithCount[]
}

interface CategoryManagerProps {
  categories: CategoryWithCount[]
  duplicateCategories: DuplicateCategory[]
}

export function CategoryManager({ categories: initialCategories, duplicateCategories }: CategoryManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)
  const [editName, setEditName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const [selectedSourceCategory, setSelectedSourceCategory] = useState<number | null>(null)
  const [selectedTargetCategory, setSelectedTargetCategory] = useState<number | null>(null)

  const handleDeleteCategory = async (categoryId: number, categoryName: string, recipeCount: number) => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      if (recipeCount > 0) {
        toast({
          title: "No se puede eliminar",
          description: `La categoría "${categoryName}" está siendo usada por ${recipeCount} receta(s). Usa la función de fusionar categorías primero.`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Eliminar la categoría
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)

      if (error) throw error

      // Actualizar la lista local
      setCategories(categories.filter((cat) => cat.id !== categoryId))

      toast({
        title: "Categoría eliminada",
        description: `La categoría "${categoryName}" ha sido eliminada.`,
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al eliminar la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !editName.trim()) return

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Verificar que no exista otra categoría con el mismo nombre
      const normalizedName = editName.trim().toLowerCase()
      const existingCategory = categories.find(
        (cat) => cat.id !== editingCategory.id && cat.name.toLowerCase() === normalizedName,
      )

      if (existingCategory) {
        toast({
          title: "Nombre duplicado",
          description: `Ya existe una categoría llamada "${existingCategory.name}".`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Actualizar la categoría
      const { error } = await supabase.from("categories").update({ name: editName.trim() }).eq("id", editingCategory.id)

      if (error) throw error

      // Actualizar la lista local
      setCategories(categories.map((cat) => (cat.id === editingCategory.id ? { ...cat, name: editName.trim() } : cat)))

      toast({
        title: "Categoría actualizada",
        description: `La categoría ha sido actualizada a "${editName.trim()}".`,
      })

      setIsEditDialogOpen(false)
      setEditingCategory(null)
      setEditName("")
      router.refresh()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al actualizar la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Verificar que no exista una categoría con el mismo nombre
      const normalizedName = newCategoryName.trim().toLowerCase()
      const existingCategory = categories.find((cat) => cat.name.toLowerCase() === normalizedName)

      if (existingCategory) {
        toast({
          title: "Categoría existente",
          description: `Ya existe una categoría llamada "${existingCategory.name}".`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Crear la nueva categoría
      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({ name: newCategoryName.trim() })
        .select()
        .single()

      if (error) throw error

      // Actualizar la lista local
      setCategories([...categories, { ...newCategory, recipe_count: 0 }])

      toast({
        title: "Categoría añadida",
        description: `La categoría "${newCategoryName.trim()}" ha sido añadida.`,
      })

      setIsAddDialogOpen(false)
      setNewCategoryName("")
      router.refresh()
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al añadir la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMergeCategories = async () => {
    if (!selectedSourceCategory || !selectedTargetCategory) {
      toast({
        title: "Selección incompleta",
        description: "Debes seleccionar una categoría de origen y una de destino.",
        variant: "destructive",
      })
      return
    }

    if (selectedSourceCategory === selectedTargetCategory) {
      toast({
        title: "Selección inválida",
        description: "Las categorías de origen y destino no pueden ser la misma.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      const sourceCategory = categories.find((cat) => cat.id === selectedSourceCategory)
      const targetCategory = categories.find((cat) => cat.id === selectedTargetCategory)

      if (!sourceCategory || !targetCategory) {
        throw new Error("Categoría no encontrada")
      }

      // Obtener todas las recetas asociadas a la categoría de origen
      const { data: recipeCategories, error: fetchError } = await supabase
        .from("recipe_categories")
        .select("recipe_id")
        .eq("category_id", selectedSourceCategory)

      if (fetchError) throw fetchError

      // Si hay recetas asociadas, actualizarlas para usar la categoría de destino
      if (recipeCategories && recipeCategories.length > 0) {
        // Primero, verificar si alguna receta ya tiene la categoría de destino para evitar duplicados
        for (const rc of recipeCategories) {
          const { data: existingMapping, error: checkError } = await supabase
            .from("recipe_categories")
            .select("*")
            .eq("recipe_id", rc.recipe_id)
            .eq("category_id", selectedTargetCategory)
            .maybeSingle()

          if (checkError) throw checkError

          // Si la receta no tiene ya la categoría de destino, actualizar
          if (!existingMapping) {
            const { error: updateError } = await supabase
              .from("recipe_categories")
              .update({ category_id: selectedTargetCategory })
              .eq("recipe_id", rc.recipe_id)
              .eq("category_id", selectedSourceCategory)

            if (updateError) throw updateError
          } else {
            // Si ya existe, eliminar la asociación con la categoría de origen
            const { error: deleteError } = await supabase
              .from("recipe_categories")
              .delete()
              .eq("recipe_id", rc.recipe_id)
              .eq("category_id", selectedSourceCategory)

            if (deleteError) throw deleteError
          }
        }
      }

      // Ahora la categoría de origen debería estar vacía, así que podemos eliminarla
      const { error: deleteError } = await supabase.from("categories").delete().eq("id", selectedSourceCategory)

      if (deleteError) throw deleteError

      // Actualizar la lista local
      setCategories(
        categories
          .map((cat) => {
            if (cat.id === selectedTargetCategory) {
              return {
                ...cat,
                recipe_count: cat.recipe_count + sourceCategory.recipe_count,
              }
            }
            return cat
          })
          .filter((cat) => cat.id !== selectedSourceCategory),
      )

      toast({
        title: "Categorías fusionadas",
        description: `Las recetas de "${sourceCategory.name}" han sido movidas a "${targetCategory.name}" y la categoría original ha sido eliminada.`,
      })

      setIsMergeDialogOpen(false)
      setSelectedSourceCategory(null)
      setSelectedTargetCategory(null)
      router.refresh()
    } catch (error) {
      console.error("Error merging categories:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al fusionar las categorías.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (category: CategoryWithCount) => {
    setEditingCategory(category)
    setEditName(category.name)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Gestiona las categorías de tus recetas. Puedes añadir, editar o eliminar categorías.
        </p>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Añadir Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir nueva categoría</DialogTitle>
                <DialogDescription>Crea una nueva categoría para clasificar tus recetas.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-category-name">Nombre de la categoría</Label>
                  <Input
                    id="new-category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Postres, Vegetariano, Sin gluten..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddCategory} disabled={isLoading}>
                  {isLoading ? "Añadiendo..." : "Añadir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MoveRight className="h-4 w-4 mr-2" />
                Fusionar Categorías
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fusionar categorías</DialogTitle>
                <DialogDescription>
                  Mueve todas las recetas de una categoría a otra y elimina la categoría vacía.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="source-category">Categoría de origen (se eliminará)</Label>
                  <Select
                    value={selectedSourceCategory?.toString() || ""}
                    onValueChange={(value) => setSelectedSourceCategory(Number(value))}
                  >
                    <SelectTrigger id="source-category">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={`source-${category.id}`} value={category.id.toString()}>
                          {category.name} ({category.recipe_count} recetas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-category">Categoría de destino (se mantendrá)</Label>
                  <Select
                    value={selectedTargetCategory?.toString() || ""}
                    onValueChange={(value) => setSelectedTargetCategory(Number(value))}
                  >
                    <SelectTrigger id="target-category">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={`target-${category.id}`} value={category.id.toString()}>
                          {category.name} ({category.recipe_count} recetas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleMergeCategories} disabled={isLoading}>
                  {isLoading ? "Fusionando..." : "Fusionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {duplicateCategories.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Categorías duplicadas detectadas
            </CardTitle>
            <CardDescription>
              Se han detectado categorías con nombres similares. Considera fusionarlas para mantener tu colección
              organizada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {duplicateCategories.map((group, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>
                    Grupo: {group.name} ({group.categories.length} categorías)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {group.categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex justify-between items-center p-2 bg-background rounded-md"
                        >
                          <div>
                            <span className="font-medium">{category.name}</span>
                            <span className="ml-2 text-sm text-muted-foreground">(ID: {category.id})</span>
                          </div>
                          <Badge variant="outline">{category.recipe_count} recetas</Badge>
                        </div>
                      ))}
                      <Button
                        className="w-full mt-2"
                        onClick={() => {
                          setIsMergeDialogOpen(true)
                          // Preseleccionar la categoría con menos recetas como origen
                          const sorted = [...group.categories].sort((a, b) => a.recipe_count - b.recipe_count)
                          setSelectedSourceCategory(sorted[0].id)
                          setSelectedTargetCategory(sorted[sorted.length - 1].id)
                        }}
                      >
                        Fusionar estas categorías
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className={category.recipe_count > 0 ? "" : "border-green-200"}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{category.name}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(category)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {category.recipe_count > 0 ? (
                            <>
                              Esta categoría tiene {category.recipe_count} recetas asociadas. No se puede eliminar
                              directamente. Usa la función "Fusionar Categorías" para mover las recetas a otra categoría
                              primero.
                            </>
                          ) : (
                            <>
                              Esta acción no se puede deshacer. Se eliminará permanentemente la categoría "
                              {category.name}".
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCategory(category.id, category.name, category.recipe_count)}
                          disabled={isLoading || category.recipe_count > 0}
                        >
                          {isLoading ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">ID: {category.id}</p>
                <Badge variant={category.recipe_count > 0 ? "default" : "outline"}>
                  {category.recipe_count} recetas
                </Badge>
              </div>
            </CardContent>
            {category.recipe_count > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setIsMergeDialogOpen(true)
                    setSelectedSourceCategory(category.id)
                  }}
                >
                  <MoveRight className="h-4 w-4 mr-2" />
                  Mover recetas a otra categoría
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {/* Dialog para editar categoría */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>Modifica el nombre de la categoría.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Nombre de la categoría</Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCategory} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
