import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const recipeId = params.id

  if (!recipeId) {
    return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar si la receta está en algún menú
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select(`
        weekly_menu_id,
        weekly_menus (
          start_date,
          end_date
        )
      `)
      .eq("recipe_id", recipeId)

    if (menuError) {
      console.error("Error checking menu usage:", menuError)
      return NextResponse.json({ error: "Error checking if recipe is in menus" }, { status: 500 })
    }

    const inMenu = menuItems && menuItems.length > 0
    const menuCount = menuItems?.length || 0

    // Extraer información de los menús
    const menus = menuItems?.map((item) => item.weekly_menus) || []

    return NextResponse.json({
      inMenu,
      menuCount,
      menus,
      message: inMenu
        ? `Esta receta está incluida en ${menuCount} menú${menuCount === 1 ? "" : "s"}: ${menus
            .map((menu) => `Menú del ${menu.start_date}`)
            .join(", ")}. Debes quitarla de todos los menús antes de eliminarla.`
        : null,
    })
  } catch (error) {
    console.error("Error in check-menu-usage route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
