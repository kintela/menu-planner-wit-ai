"use client"

import { useState } from "react"
import { useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-provider"

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
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [_, startTransition] = useTransition()
  const router = useRouter()

  // Usar la misma lógica que StarRating para verificar ownership
  const canDelete = user && (user.id === recipeUserId || user.email === recipeUserId)

  async function handleDelete() {
    if (!canDelete || !user) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar esta receta",
        variant: "destructive",
      })
      return
    }

    // SIEMPRE pedir confirmación inicial
    const initialConfirmation = window.confirm(
      `¿Estás seguro de que quieres eliminar la receta "${recipeName}"?\n\nEsta acción no se puede deshacer.`,
    )

    if (!initialConfirmation) {
      return // Usuario canceló
    }

    setIsDeleting(true)

    try {
      // Primer intento de eliminación (verificará si está en menús)
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user.email || "",
        },
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
        // La receta está en menús, pedir confirmación adicional
        const menuConfirmation = window.confirm(
          `${data.message || "Esta receta está incluida en uno o más menús."}\n\n¿Deseas eliminarla de todos los menús y borrarla permanentemente?`,
        )

        if (menuConfirmation) {
          // Eliminación forzada
          const forceResponse = await fetch(`/api/recipes/${recipeId}?force=true`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id || user.email || "",
            },
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
          // Usuario canceló la eliminación forzada
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
        description: error instanceof Error ? error.message : "Hubo un problema eliminando la receta.",
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
