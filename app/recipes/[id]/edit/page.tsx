import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import { RestrictedAccessMessage } from "@/components/restricted-access-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

interface EditRecipePageProps {
  params: {
    id: string
  }
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const supabase = createServerComponentClient({ cookies })

  // Verificar autenticación
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return (
      <RestrictedAccessMessage
        message="Necesitas iniciar sesión para poder editar únicamente tus recetas"
        redirectPath={`/recipes/${params.id}/edit`}
      />
    )
  }

  // Obtener la receta
  const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", params.id).single()

  if (error || !recipe) {
    redirect("/recipes")
  }

  // Verificar si el usuario es el autor o admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

  const isAuthor = recipe.user_id === session.user.id
  const isAdmin = profile?.role === "admin"

  if (!isAuthor && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="mt-4 text-xl font-semibold text-gray-900">Acceso Restringido</CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600">
              Solo puedes editar tus propias recetas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Obtener categorías para el formulario
  const { data: recipeCategories } = await supabase
    .from("recipe_categories")
    .select("category_id")
    .eq("recipe_id", recipe.id)

  const selectedCategoryIds = recipeCategories?.map((rc) => rc.category_id) || []

  const { data: categories } = await supabase.from("categories").select("*").order("name")

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Editar Receta</h1>
      <EditRecipeForm recipe={recipe} categories={categories || []} selectedCategoryIds={selectedCategoryIds} />
    </div>
  )
}
