"use client"

import { useState } from "react"
import { useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"

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

  const canDelete = session?.user.id === recipeUserId

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete recipe")
      }

      toast({
        title: "Receta eliminada.",
        description: `${recipeName} ha sido eliminada de tu recetario.`,
      })

      startTransition(() => {
        onDelete?.()
      })
    } catch (error: any) {
      toast({
        title: "Error eliminando la receta.",
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
