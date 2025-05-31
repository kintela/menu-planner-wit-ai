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
      console.log("Attempting to delete recipe:", { recipeId, userId: user.id })

      // Eliminar directamente usando el cliente de Supabase
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id) // Doble verificación de seguridad

      if (error) {
        console.error("Error deleting recipe:", error)
        throw new Error(error.message || "Error al eliminar la receta")
      }

      console.log("Recipe deleted successfully")

      // Mostrar toast de éxito
      toast({
        title: "¡Éxito!",
        description: "Receta eliminada correctamente",
        variant: "default",
      })

      // Llamar al callback para actualizar la UI
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
    <AlertDialog>
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
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting || !canDelete}>
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
