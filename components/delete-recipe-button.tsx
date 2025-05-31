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
  onDelete: () => void
}

export function DeleteRecipeButton({ recipeId, recipeUserId, onDelete }: DeleteRecipeButtonProps) {
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
        .select("id, menu_id")
        .eq("recipe_id", recipeId)

      if (menuError) {
        throw new Error(menuError.message || "Error al verificar menús")
      }

      // Si la receta está siendo usada en menús, prevenimos la eliminación
      if (menuItems && menuItems.length > 0) {
        setIsOpen(false) // Cerrar el diálogo
        toast({
          title: "No se puede eliminar",
          description: `Esta receta está siendo usada en ${menuItems.length} menú(s). Por favor, elimínala primero de los menús.`,
          variant: "destructive",
          duration: 5000, // Mostrar por más tiempo
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
        description: "Receta eliminada correctamente",
        variant: "default",
      })

      // Cerrar el diálogo y llamar al callback para actualizar la UI
      setIsOpen(false)
      onDelete()
    } catch (error: any) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error",
        description: `Error al eliminar la receta: ${error.message}`,
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
            Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta receta?
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
