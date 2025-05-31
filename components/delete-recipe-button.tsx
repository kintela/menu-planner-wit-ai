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
  const supabase = createClientComponentClient()

  // Verificar si el usuario puede eliminar esta receta
  const canDelete = user && recipeUserId && String(user.id) === String(recipeUserId)

  const handleDelete = async () => {
    if (!user || !canDelete) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar esta receta",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      console.log("🔍 Verificando si la receta está en menús:", { recipeId, recipeName })

      // Primero verificamos si la receta está siendo usada en algún menú
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("recipe_id", recipeId)

      console.log("📋 Resultado de menu_items:", { menuItems, menuError })

      if (menuError) {
        console.error("❌ Error al consultar menu_items:", menuError)
        throw new Error(menuError.message || "Error al verificar menús")
      }

      // Si la receta está siendo usada en menús, prevenimos la eliminación
      if (menuItems && menuItems.length > 0) {
        console.log("🚫 Receta está en menús, preveniendo eliminación")

        // Obtener información de los menús
        const menuIds = menuItems.map((item) => item.menu_id)
        console.log("📝 IDs de menús:", menuIds)

        const { data: menus, error: menusError } = await supabase.from("menus").select("*").in("id", menuIds)

        console.log("📅 Información de menús:", { menus, menusError })

        let menuDescription = "menús desconocidos"
        if (menus && menus.length > 0) {
          menuDescription = menus
            .map((menu) => {
              const weekStart = menu.week_start ? new Date(menu.week_start).toLocaleDateString() : "fecha desconocida"
              return `${menu.name || "Menú"} (semana del ${weekStart})`
            })
            .join(", ")
        }

        setIsOpen(false) // Cerrar el diálogo
        toast({
          title: "No se puede eliminar",
          description: `La receta "${recipeName}" está siendo usada en: ${menuDescription}. Por favor, elimínala primero de estos menús.`,
          variant: "destructive",
          duration: 7000,
        })
        return
      }

      console.log("✅ Receta no está en menús, procediendo con eliminación")

      // Si no está siendo usada, procedemos con la eliminación
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id)

      if (error) {
        throw new Error(error.message || "Error al eliminar la receta")
      }

      console.log("🎉 Receta eliminada exitosamente")

      // Mostrar toast de éxito
      toast({
        title: "¡Éxito!",
        description: `La receta "${recipeName}" ha sido eliminada correctamente`,
        variant: "default",
      })

      // Cerrar el diálogo y llamar al callback para actualizar la UI
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
        <Button variant="destructive" disabled={!canDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar la receta "{recipeName}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Verificando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
