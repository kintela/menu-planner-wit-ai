import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function EditRecipePage({ params }: { params: { id: string } }) {
  const { id } = params
  const userProfile = await getCurrentUserProfile()

  // Fetch the recipe to check ownership
  const supabase = createServerClient()
  const { data: recipe } = await supabase.from("recipes").select("*").eq("id", id).single()

  if (!recipe) {
    return notFound()
  }

  // Check if the current user is the creator of the recipe or an admin
  const isCreator = userProfile && userProfile.id === recipe.user_id
  const isAdmin = userProfile?.role === "admin"

  // If not the creator or admin, redirect to the recipe view page
  if (!isCreator && !isAdmin) {
    redirect(`/recipes/${id}`)
  }

  // Continue with the existing code...
  return (
    <div>
      <h1>Edit Recipe Page</h1>
      <p>Recipe ID: {id}</p>
    </div>
  )
}
