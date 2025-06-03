"use client"

import { useState } from "react"
import { useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"

interface DeleteRecipeButtonProps {
  recipeId: string
  recipeUserId: string
  recipeName: string
  onDelete?: () => void
  iconOnly?: boolean
}

export function DeleteRecipeButton({
  recipeId,
  recipeUserId,
  recipeName,
  onDelete,
  iconOnly = false,
}: DeleteRecipeButtonProps) {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [isDeleting, setIsDeleting] = useState(false)
  const [_, startTransition] = useTransition()
  const router = useRouter()

  const canDelete = session?.user.id === recipeUserId

  async function handleDelete() {
    if (!canDelete) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar esta receta",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)

    try {
      // Primer intento de eliminación (verificará si está en menús)
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        // Eliminación exitosa
        toast({
          title: "Receta eliminada",
          description: `${recipeName} ha sido eliminada de tu recetario.`,
        })

        startTransition(() => {
          if (onDelete) {
            onDelete()
          } else {
            router.push("/recipes")
            router.refresh()
          }
        })
      } else if (response.status === 409 && data.error === "RECIPE_IN_MENU") {
        // La receta está en menús, pedir confirmación
        const confirmed = window.confirm(
          `${data.message || "Esta receta está incluida en uno o más menús."}\n\n¿Deseas eliminarla de todos los menús y borrarla permanentemente?`,
        )

        if (confirmed) {
          // Eliminación forzada
          const forceResponse = await fetch(`/api/recipes/${recipeId}?force=true`, {
            method: "DELETE",
          })

          const forceData = await forceResponse.json()

          if (forceResponse.ok) {
            toast({
              title: "Receta eliminada",
              description: `${recipeName} ha sido eliminada de tu recetario y de todos los menús donde estaba incluida.`,
            })

            startTransition(() => {
              if (onDelete) {
                onDelete()
              } else {
                router.push("/recipes")
                router.refresh()
              }
            })
          } else {
            throw new Error(forceData.error || "Error al eliminar la receta")
          }
        } else {
          // Usuario canceló la eliminación
          toast({
            title: "Eliminación cancelada",
            description: "La receta no ha sido eliminada.",
          })
        }
      } else {
        throw new Error(data.error || "Error al eliminar la receta")
      }
    } catch (error: any) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error eliminando la receta",
        description: error?.message || "Hubo un problema eliminando la receta.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size={iconOnly ? "sm" : "default"}
      onClick={handleDelete}
      disabled={!canDelete || isDeleting}
    >
      {isDeleting ? (
        iconOnly ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Eliminando...
          </>
        )
      ) : iconOnly ? (
        <Trash2 className="h-4 w-4" />
      ) : (
        <>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </>
      )}
    </Button>
  )
}
