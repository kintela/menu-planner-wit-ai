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
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [showInitialConfirm, setShowInitialConfirm] = useState(false)
  const [showMenuWarning, setShowMenuWarning] = useState(false)
  const [menuMessage, setMenuMessage] = useState("")
  const [_, startTransition] = useTransition()
  const router = useRouter()

  // Usar la misma lógica que StarRating para verificar ownership
  const canDelete = user && (user.id === recipeUserId || user.email === recipeUserId)

  // Función para formatear fechas de yyyy-mm-dd a dd/mm/yyyy
  const formatDateToDDMMYYYY = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES")
  }

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
          const menuList = data.menus.map((menu) => `Menú del ${formatDateToDDMMYYYY(menu.start_date)}`).join(", ")

          setMenuMessage(
            data.message ||
              `Esta receta está incluida en ${data.menuCount} menú(s): ${menuList}. Debes quitarla de todos los menús antes de eliminarla.`,
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
    const inMenu = await checkIfRecipeInMenu()

    if (inMenu) {
      // Si está en menús, mostrar advertencia
      setShowMenuWarning(true)
    } else {
      // Si no está en menús, mostrar confirmación normal
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

      {/* Advertencia de receta en menús */}
      <ConfirmationDialog
        isOpen={showMenuWarning}
        onClose={() => setShowMenuWarning(false)}
        onConfirm={() => setShowMenuWarning(false)}
        title="No se puede eliminar la receta"
        description={menuMessage}
        confirmText="Entendido"
        showCancel={false}
        icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
      />
    </>
  )
}
