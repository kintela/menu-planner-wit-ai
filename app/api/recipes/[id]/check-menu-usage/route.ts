import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: recipeId } = await params

  if (!recipeId) {
    return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar si la receta está en algún menú
    const {
      data: menuItems,
      error: menuError,
      count,
    } = await supabase.from("menu_items").select("*", { count: "exact" }).eq("recipe_id", recipeId)

    if (menuError) {
      console.error("Error checking menu usage:", menuError)
      return NextResponse.json({ error: "Error checking if recipe is in menus" }, { status: 500 })
    }

    const inMenu = menuItems && menuItems.length > 0
    const menuCount = count || menuItems?.length || 0

    return NextResponse.json({
      inMenu,
      menuCount,
      message: inMenu
        ? `Esta receta está incluida en ${menuCount} menú${menuCount === 1 ? "" : "s"}. Debes quitarla de ${menuCount === 1 ? "ese menú" : "todos los menús"} antes de eliminarla.`
        : null,
    })
  } catch (error) {
    console.error("Error in check-menu-usage route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
