"use client"

import { useState } from "react"
import { useTransition } from "react"
import { Trash2, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { ConfirmationDialog } from "./confirmation-dialog"

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
  const { user, profile } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [showInitialConfirm, setShowInitialConfirm] = useState(false)
  const [showMenuWarning, setShowMenuWarning] = useState(false)
  const [showForceConfirm, setShowForceConfirm] = useState(false)
  const [menuMessage, setMenuMessage] = useState("")
  const [_, startTransition] = useTransition()
  const router = useRouter()

  const isAdmin = profile && profile.role === "admin"
  const canDelete = isAdmin || (user && (user.id === recipeUserId || user.email === recipeUserId))

  // Función para verificar si la receta está en menús
  async function checkIfRecipeInMenu() {
    if (!user) return false

    setIsChecking(true)

    try {
      // Consulta específica para verificar si la receta está en menús
      const response = await fetch(`/api/recipes/${recipeId}/check-menu-usage`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user.email || "",
        },
      })

      const data = await response.json()

      if (response.ok) {
        if (data.inMenu) {
          // La receta está en menús
          setMenuMessage(
            data.message ||
              `Esta receta está incluida en ${data.menuCount} menú(s). Debes quitarla de todos los menús antes de eliminarla.`,
          )
          return true
        }
        return false
      } else {
        throw new Error(data.error || "Error al verificar uso de la receta")
      }
    } catch (error) {
      console.error("Error checking recipe usage:", error)
      return false
    } finally {
      setIsChecking(false)
    }
  }

  async function handleDeleteClick() {
    if (!canDelete || !user) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar esta receta",
        variant: "destructive",
      })
      return
    }

    setIsChecking(true)

    // Verificar primero si la receta está en menús
    const response = await fetch(`/api/recipes/${recipeId}/check-menu-usage`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id || user.email || "",
      },
    })
    const data = await response.json()

    if (response.ok && data.inMenu) {
      setMenuMessage(
        data.message ||
          `Esta receta está incluida en ${data.menuCount} menú(s). ¿Quieres eliminarla de todos los menús y de la base de datos?`
      )
      setShowForceConfirm(true)
    } else if (response.status === 409 && data.error === "RECIPE_IN_MENU") {
      setMenuMessage(
        data.message ||
          `Esta receta está incluida en ${data.menuCount} menú(s). ¿Quieres eliminarla de todos los menús y de la base de datos?`
      )
      setShowForceConfirm(true)
    } else {
      setShowInitialConfirm(true)
    }

    setIsChecking(false)
  }

  async function handleConfirmDelete() {
    if (!user) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user.email || "",
        },
      })

      const data = await response.json()

      if (response.ok) {
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
      } else {
        // Si por alguna razón aún hay un error (poco probable)
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

  async function handleForceDelete() {
    if (!user) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}?force=true`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user.email || "",
        },
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: "Receta eliminada",
          description: `${recipeName} y todas sus referencias en menús han sido eliminadas.`,
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
        throw new Error(data.error || "Error al eliminar la receta")
      }
    } catch (error: any) {
      toast({
        title: "Error eliminando la receta",
        description: error instanceof Error ? error.message : "Hubo un problema eliminando la receta.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowForceConfirm(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size={iconOnly ? "sm" : "default"}
        onClick={handleDeleteClick}
        disabled={!canDelete || isDeleting || isChecking}
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

      {/* Advertencia de receta en menús y confirmación forzada */}
      <ConfirmationDialog
        isOpen={showForceConfirm}
        onClose={() => setShowForceConfirm(false)}
        onConfirm={handleForceDelete}
        title="Eliminar receta y referencias en menús"
        description={menuMessage}
        confirmText="Eliminar de menús y receta"
        cancelText="Cancelar"
        variant="destructive"
        icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
      />
    </>
  )
}
