import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EditRecipeForm } from "@/components/edit-recipe-form"
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

  // Si no hay sesión, redirigir al login
  if (!session) {
    redirect(`/login?redirect=/recipes/${params.id}/edit`)
  }

  try {
    // Obtener la receta
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", params.id).single()

    if (recipeError || !recipe) {
      redirect("/recipes")
    }

    // Verificar si el usuario es el autor
    const isAuthor = recipe.user_id === session.user.id

    // Verificar si es admin (intentar con diferentes nombres de tabla)
    let isAdmin = false
    try {
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", session.user.id).single()

      isAdmin = profile?.role === "admin"
    } catch (error) {
      // Si falla con user_profiles, intentar con profiles
      try {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

        isAdmin = profile?.role === "admin"
      } catch (error2) {
        // Si ambas fallan, asumir que no es admin
        isAdmin = false
      }
    }

    console.log("Permission check:", {
      userId: session.user.id,
      recipeAuthor: recipe.user_id,
      isAuthor,
      isAdmin,
      hasPermission: isAuthor || isAdmin,
    })

    // Si no tiene permisos, mostrar mensaje de acceso restringido
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

    // Si tiene permisos, obtener categorías y mostrar formulario
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
  } catch (error) {
    console.error("Error in edit page:", error)
    redirect("/recipes")
  }
}
