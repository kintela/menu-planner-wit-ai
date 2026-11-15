"use client"

import { useState } from "react"
import { useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmationDialog } from "./confirmation-dialog"
import { cn } from "@/lib/utils"
import { buildJsonRequest } from "@/lib/recipes/recipe-ui"

interface DeleteRecipeButtonProps {
  recipeId: string
  recipeName: string
  onDelete?: () => void
  iconOnly?: boolean
}

export function DeleteRecipeButton({
  recipeId,
  recipeName,
  onDelete,
  iconOnly = false,
}: DeleteRecipeButtonProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [showInitialConfirm, setShowInitialConfirm] = useState(false)
  const [_, startTransition] = useTransition()
  const router = useRouter()

  async function handleDeleteClick() {
    setIsChecking(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}/check-menu-usage`, { method: "GET" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "No se pudo comprobar el uso en menús. El borrado queda bloqueado.")
      if (data.inMenu) {
        toast({
          title: "Receta incluida en menús",
          description: data.message || "Debes retirarla manualmente de todos los menús antes de eliminarla.",
          variant: "destructive",
        })
        return
      }
      setShowInitialConfirm(true)
    } catch (error) {
      toast({ title: "Borrado bloqueado", description: error instanceof Error ? error.message : "No se pudo comprobar el uso en menús.", variant: "destructive" })
    } finally {
      setIsChecking(false)
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, buildJsonRequest("DELETE"))

      const data = await response.json()

      if (response.ok || (response.status === 207 && data.deleted === true)) {
        toast({
          title: response.ok ? "Receta eliminada" : "Receta eliminada con aviso",
          description: response.ok
            ? `${recipeName} ha sido eliminada de tu recetario.`
            : `${recipeName} ha sido eliminada, pero la limpieza de su imagen queda pendiente.`,
          variant: response.ok ? undefined : "destructive",
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
        // Si por alguna razón aún hay un error (poco probable)
        throw new Error(data.error || "Error al eliminar la receta")
      }
    } catch (error: unknown) {
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
    <>
            <Button
              variant="destructive"
              size={iconOnly ? "sm" : "default"}
              onClick={handleDeleteClick}
              disabled={isDeleting || isChecking}
              className={cn(
                iconOnly ? "h-8 w-8 p-0" : "",
                ""
              )}
            >
              {isDeleting || isChecking ? (
                iconOnly ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isChecking ? "Verificando..." : "Eliminando..."}
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

      {/* Confirmación normal de eliminación */}
  <ConfirmationDialog
        isOpen={showInitialConfirm}
        onClose={() => setShowInitialConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar receta"
        description={`¿Estás seguro de que quieres eliminar la receta "${recipeName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

    </>
  )
}
