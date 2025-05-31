"use client"
import { useState } from "react"
import { Trash2 } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
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
  const [isDeleting, setIsDeleting] = useState(false)

  // Verificar si el usuario puede eliminar esta receta
  const canDelete = user && recipeUserId && String(user.id) === String(recipeUserId)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      console.log("Attempting to delete recipe:", { recipeId, userId: user?.id })

      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Delete response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Delete error response:", errorData)
        throw new Error(errorData.error || `Failed to delete recipe: ${response.status}`)
      }

      const successData = await response.json()
      console.log("Delete success:", successData)

      // Mostrar mensaje de éxito
      alert("Receta eliminada correctamente")

      // Llamar al callback para actualizar la UI
      onDelete()
    } catch (error: any) {
      console.error("Error deleting recipe:", error)
      alert(`Error al eliminar la receta: ${error.message}`)
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
