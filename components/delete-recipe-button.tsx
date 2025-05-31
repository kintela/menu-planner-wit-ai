"use client"
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
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
import { Button } from "@/components/ui/button"

interface DeleteRecipeButtonProps {
  recipeId: string
  recipeUserId?: string
  recipeName?: string // Añadimos el nombre de la receta como prop
  onDelete: () => void
}

export function DeleteRecipeButton({
  recipeId,
  recipeUserId,
  recipeName = "esta receta",
  onDelete,
}: DeleteRecipeButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClientComponentClient()

  // Verificar si el usuario puede eliminar esta receta
  const canDelete = user && recipeUserId && String(user.id) === String(recipeUserId)

  const handleDelete = async () => {
    if (!user || !canDelete) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar esta receta",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      // Primero verificamos si la receta está siendo usada en algún menú
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select(`
          id, 
          menu_id,
          menus:menu_id (
            id,
            name,
            week_start
          )
        `)
        .eq("recipe_id", recipeId)

      if (menuError) {
        throw new Error(menuError.message || "Error al verificar menús")
      }

      // Si la receta está siendo usada en menús, prevenimos la eliminación
      if (menuItems && menuItems.length > 0) {
        // Formatear los nombres de los menús
        const menuNames = menuItems
          .map((item) => {
            const menu = item.menus
            const weekStart = menu?.week_start ? new Date(menu.week_start).toLocaleDateString() : "fecha desconocida"
            return `${menu?.name || "Menú"} (semana del ${weekStart})`
          })
          .join(", ")

        setIsOpen(false) // Cerrar el diálogo
        toast({
          title: "No se puede eliminar",
          description: `La receta "${recipeName}" está siendo usada en: ${menuNames}. Por favor, elimínala primero de estos menús.`,
          variant: "destructive",
          duration: 7000, // Mostrar por más tiempo
        })
        return
      }

      // Si no está siendo usada, procedemos con la eliminación
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id) // Doble verificación de seguridad

      if (error) {
        throw new Error(error.message || "Error al eliminar la receta")
      }

      // Mostrar toast de éxito
      toast({
        title: "¡Éxito!",
        description: `La receta "${recipeName}" ha sido eliminada correctamente`,
        variant: "default",
      })

      // Cerrar el diálogo y llamar al callback para actualizar la UI
      setIsOpen(false)
      onDelete()
    } catch (error: any) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error",
        description: `Error al eliminar la receta "${recipeName}": ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={!canDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la receta "{recipeName}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Verificando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
