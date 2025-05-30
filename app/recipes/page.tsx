import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function RecipesPage() {
  return (
    <div className="container relative">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Recetas</h2>
          <p className="text-sm text-muted-foreground">Aquí encontrarás todas las recetas disponibles.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/recipes/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Receta
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
