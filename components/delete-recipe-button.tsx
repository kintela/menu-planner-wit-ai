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
  // Convertimos ambos IDs a string para asegurar una comparación correcta
  const canDelete = user && recipeUserId && String(user.id) === String(recipeUserId)

  // Para depuración
  console.log("User ID:", user?.id, "Recipe User ID:", recipeUserId, "Can Delete:", canDelete)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete recipe: ${response.status}`)
      }

      onDelete() // Call the onDelete callback to update the UI
    } catch (error: any) {
      console.error("Error deleting recipe:", error)
      alert("Failed to delete recipe. Please try again.")
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
