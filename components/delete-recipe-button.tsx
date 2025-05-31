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
  recipeName?: string
  onDelete: () => void
}

export function DeleteRecipeButton({
  recipeId,
  recipeUserId,
  recipeName = "esta receta",
  onDelete,
}: DeleteRecipeButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [menuInfo, setMenuInfo] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Verificar si el usuario puede eliminar esta receta
  const canDelete = user && recipeUserId && String(user.id) === String(recipeUserId)

  const checkMenuUsage = async () => {
    setIsChecking(true)
    try {
      console.log("🔍 Verificando si la receta está en menús:", { recipeId, recipeName })

      // Verificar si la receta está siendo usada en algún menú
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("recipe_id", recipeId)

      console.log("📋 Resultado de menu_items:", { menuItems, menuError })

      if (menuError) {
        console.error("❌ Error al consultar menu_items:", menuError)
        throw new Error(menuError.message || "Error al verificar menús")
      }

      if (menuItems && menuItems.length > 0) {
        console.log("🚫 Receta está en menús")

        // Obtener información de los menús
        const menuIds = menuItems.map((item) => item.menu_id)
        const { data: menus, error: menusError } = await supabase.from("menus").select("*").in("id", menuIds)

        console.log("📅 Información de menús:", { menus, menusError })

        if (menus && menus.length > 0) {
          const menuDescription = menus
            .map((menu) => {
              const weekStart = menu.week_start ? new Date(menu.week_start).toLocaleDateString() : "fecha desconocida"
              return `${menu.name || "Menú"} (semana del ${weekStart})`
            })
            .join(", ")
          setMenuInfo(menuDescription)
        } else {
          setMenuInfo("menús desconocidos")
        }

        // Mostrar toast inmediatamente
        toast({
          title: "No se puede eliminar",
          description: `La receta "${recipeName}" está siendo usada en menús. Por favor, elimínala primero de los menús.`,
          variant: "destructive",
          duration: 5000,
        })
        return false // No abrir el diálogo
      } else {
        console.log("✅ Receta no está en menús")
        setMenuInfo(null)
        return true // Puede abrir el diálogo
      }
    } catch (error: any) {
      console.error("❌ Error checking menu usage:", error)
      toast({
        title: "Error",
        description: "Error al verificar el uso en menús",
        variant: "destructive",
      })
      return false
    } finally {
      setIsChecking(false)
    }
  }

  const handleButtonClick = async () => {
    if (!canDelete) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar esta receta",
        variant: "destructive",
      })
      return
    }

    const canProceed = await checkMenuUsage()
    if (canProceed) {
      setIsOpen(true)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      console.log("🗑️ Eliminando receta:", { recipeId, recipeName })

      const { error } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id)

      if (error) {
        throw new Error(error.message || "Error al eliminar la receta")
      }

      console.log("🎉 Receta eliminada exitosamente")

      toast({
        title: "¡Éxito!",
        description: `La receta "${recipeName}" ha sido eliminada correctamente`,
        variant: "default",
      })

      setIsOpen(false)
      onDelete()
    } catch (error: any) {
      console.error("❌ Error deleting recipe:", error)
      toast({
        title: "Error",
        description: `Error al eliminar la receta "${recipeName}": ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={!canDelete || isChecking} onClick={handleButtonClick}>
          <Trash2 className="h-4 w-4 mr-2" />
          {isChecking ? "Verificando..." : "Eliminar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la receta "{recipeName}"?
            {menuInfo && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800">
                ⚠️ Esta receta está siendo usada en: {menuInfo}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
