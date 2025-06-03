"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"

interface DeleteRecipeButtonProps {
  recipeId: string
  onDelete?: () => void
}

const DeleteRecipeButton = ({ recipeId, onDelete }: DeleteRecipeButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const user = session?.user

  const handleDelete = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para eliminar recetas",
        variant: "destructive",
      })
      return
    }

    try {
      setIsDeleting(true)

      // Primer intento de eliminación (verificará si está en menús)
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        // Eliminación exitosa
        toast({
          title: "Éxito",
          description: data.message || "Receta eliminada correctamente",
        })

        if (onDelete) {
          onDelete()
        } else {
          router.push("/recipes")
          router.refresh()
        }
      } else if (response.status === 409 && data.error === "RECIPE_IN_MENU") {
        // La receta está en menús, pedir confirmación
        const confirmed = window.confirm(
          `${data.message}\n\nEsto eliminará la receta de todos los menús donde esté incluida.`,
        )

        if (confirmed) {
          // Eliminación forzada
          const forceResponse = await fetch(`/api/recipes/${recipeId}?force=true`, {
            method: "DELETE",
          })

          const forceData = await forceResponse.json()

          if (forceResponse.ok) {
            toast({
              title: "Éxito",
              description: forceData.message || "Receta eliminada correctamente de todos los menús",
            })

            if (onDelete) {
              onDelete()
            } else {
              router.push("/recipes")
              router.refresh()
            }
          } else {
            throw new Error(forceData.error || "Error al eliminar la receta")
          }
        }
      } else if (response.status === 403) {
        toast({
          title: "Error",
          description: "No tienes permisos para eliminar esta receta",
          variant: "destructive",
        })
      } else {
        throw new Error(data.error || "Error al eliminar la receta")
      }
    } catch (error) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar la receta",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "Eliminando..." : "Eliminar"}
    </button>
  )
}

export default DeleteRecipeButton
