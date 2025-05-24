import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Esta función generaría un menú semanal utilizando IA
// Por ahora, simplemente selecciona recetas aleatorias
export async function POST(request: Request) {
  try {
    const { weeklyMenuId } = await request.json()

    if (!weeklyMenuId) {
      return NextResponse.json({ error: "Se requiere el ID del menú semanal" }, { status: 400 })
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Obtener todas las recetas
    const { data: recipes, error: recipesError } = await supabase.from("recipes").select("id")

    if (recipesError || !recipes || recipes.length === 0) {
      return NextResponse.json({ error: "No hay recetas disponibles" }, { status: 400 })
    }

    // Eliminar los platos existentes
    await supabase.from("menu_items").delete().eq("weekly_menu_id", weeklyMenuId)

    // Crear nuevos platos aleatorios
    const menuItems = []

    for (let day = 0; day < 7; day++) {
      // Comida - 2 platos
      for (let dishOrder = 1; dishOrder <= 2; dishOrder++) {
        const lunchIndex = Math.floor(Math.random() * recipes.length)
        menuItems.push({
          weekly_menu_id: weeklyMenuId,
          recipe_id: recipes[lunchIndex].id,
          day_of_week: day,
          meal_type: "comida",
          dish_order: dishOrder,
        })
      }

      // Cena - 1 plato
      const dinnerIndex = Math.floor(Math.random() * recipes.length)
      menuItems.push({
        weekly_menu_id: weeklyMenuId,
        recipe_id: recipes[dinnerIndex].id,
        day_of_week: day,
        meal_type: "cena",
        dish_order: 1,
      })
    }

    const { error: insertError } = await supabase.from("menu_items").insert(menuItems)

    if (insertError) {
      return NextResponse.json({ error: "Error al generar el menú" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error generating menu:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
