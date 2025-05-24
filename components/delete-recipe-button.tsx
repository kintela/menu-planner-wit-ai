"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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

interface DeleteRecipeButtonProps {
  recipeId: number
  recipeName: string
}

export function DeleteRecipeButton({ recipeId, recipeName }: DeleteRecipeButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const supabase = getSupabaseClient()

      // Primero, eliminar las relaciones con categorías
      await supabase.from("recipe_categories").delete().eq("recipe_id", recipeId)

      // Luego, eliminar los elementos del menú que usan esta receta
      await supabase.from("menu_items").delete().eq("recipe_id", recipeId)

      // Finalmente, eliminar la receta
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId)

      if (error) throw error

      toast({
        title: "Receta eliminada",
        description: "La receta ha sido eliminada correctamente.",
      })

      // Cerrar el diálogo
      setIsOpen(false)

      // Redirigir a la página de recetas
      router.push("/recipes")
      router.refresh()
    } catch (error) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al eliminar la receta.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la receta "{recipeName}" de tu colección.
            También se eliminará de cualquier menú semanal que la incluya.
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
