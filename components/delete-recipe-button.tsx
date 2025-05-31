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
  const [isInMenu, setIsInMenu] = useState(false)
  const supabase = createClientComponentClient()

  // Verificar si el usuario puede eliminar esta receta
  const canDelete = user && recipeUserId && String(user.id) === String(recipeUserId)

  const checkMenuUsage = async () => {
    setIsChecking(true)
    try {
      // Convertir recipeId a número para la consulta
      const recipeIdNumber = Number.parseInt(recipeId)
      console.log("🔍 Verificando si la receta está en menús:", { recipeId, recipeIdNumber, recipeName })

      // Verificar si la receta está siendo usada en menu_items
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("recipe_id", recipeIdNumber)

      console.log("📋 Resultado de menu_items:", { menuItems, menuError })

      if (menuError) {
        console.error("❌ Error al consultar menu_items:", menuError)
        throw new Error(menuError.message || "Error al verificar menús")
      }

      if (menuItems && menuItems.length > 0) {
        console.log("🚫 Receta está en menús, obteniendo detalles...")

        // Obtener los IDs de los menús semanales
        const weeklyMenuIds = menuItems.map((item) => item.weekly_menu_id)
        console.log("📝 IDs de menús semanales:", weeklyMenuIds)

        // Obtener información de los menús semanales
        const { data: weeklyMenus, error: menusError } = await supabase
          .from("weekly_menus")
          .select("*")
          .in("id", weeklyMenuIds)

        console.log("📅 Información de weekly_menus:", { weeklyMenus, menusError })

        let menuDescription = "menús desconocidos"
        if (weeklyMenus && weeklyMenus.length > 0) {
          menuDescription = weeklyMenus
            .map((menu) => {
              const weekStart = menu.week_start ? new Date(menu.week_start).toLocaleDateString() : "fecha desconocida"
              return `${menu.name || "Menú semanal"} (semana del ${weekStart})`
            })
            .join(", ")
        } else {
          // Si no encontramos info de menús, mostrar al menos los IDs
          menuDescription = `menú(s) con ID: ${weeklyMenuIds.join(", ")}`
        }

        setMenuInfo(menuDescription)
        setIsInMenu(true)
        setIsOpen(true) // Abrir el diálogo pero con mensaje diferente
        return false
      }

      console.log("✅ Receta no está en menús")
      setMenuInfo(null)
      setIsInMenu(false)
      setIsOpen(true) // Abrir el diálogo normal
      return true
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

    await checkMenuUsage()
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
          <AlertDialogTitle>{isInMenu ? "No se puede eliminar" : "¿Estás completamente seguro?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isInMenu ? (
              <>
                La receta "{recipeName}" está asignada al siguiente menú: <strong>{menuInfo}</strong>.
                <br />
                <br />
                No se puede eliminar una receta que ya está asignada a un menú. Por favor, elimínala primero del menú si
                deseas borrarla.
              </>
            ) : (
              <>Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la receta "{recipeName}"?</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isInMenu ? (
            <AlertDialogCancel>Entendido</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
