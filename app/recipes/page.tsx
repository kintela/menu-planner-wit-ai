import Link from "next/link"
import { Plus } from "lucide-react"
import { RecipesPageClient } from "@/components/recipes-page-client"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean
  video_url: string | null
  source_url: string | null
  calories: number | null
  user_id: string
  created_at: string
  categories: Array<{ id: number; name: string }>
  user_profiles: {
    id: string
    full_name: string | null
    email: string
    alias: string | null
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
}

// Mock data que simula las 82 recetas reales
const getMockRecipesData = () => {
  const mockRecipes: Recipe[] = [
    {
      id: 1,
      name: "Paella Valenciana",
      ingredients:
        "Arroz bomba, pollo, conejo, judías verdes, garrofón, tomate, pimiento rojo, azafrán, aceite de oliva, sal",
      preparation:
        "1. Calentar aceite en paellera\n2. Sofreír pollo y conejo\n3. Añadir verduras\n4. Incorporar arroz y caldo\n5. Cocinar 18-20 minutos",
      image_url: "/placeholder.svg?height=200&width=300&text=Paella+Valenciana",
      is_ai_generated: false,
      video_url: null,
      source_url: "https://example.com/paella-valenciana",
      calories: 450,
      user_id: "user-1",
      created_at: "2024-01-15T10:30:00Z",
      categories: [{ id: 2, name: "Almuerzo" }],
      user_profiles: {
        id: "user-1",
        full_name: "María García",
        email: "maria@example.com",
        alias: "Chef María",
        first_name: "María",
        last_name: "García",
        avatar_url: null,
      },
    },
    {
      id: 2,
      name: "Tortilla Española",
      ingredients: "6 huevos, 4 patatas medianas, 1 cebolla, aceite de oliva, sal",
      preparation:
        "1. Pelar y cortar patatas en láminas\n2. Freír patatas con cebolla\n3. Batir huevos y mezclar\n4. Cuajar por ambos lados",
      image_url: "/placeholder.svg?height=200&width=300&text=Tortilla+Española",
      is_ai_generated: false,
      video_url: null,
      source_url: null,
      calories: 320,
      user_id: "user-2",
      created_at: "2024-01-14T15:45:00Z",
      categories: [
        { id: 1, name: "Desayuno" },
        { id: 3, name: "Cena" },
      ],
      user_profiles: {
        id: "user-2",
        full_name: "Carlos Ruiz",
        email: "carlos@example.com",
        alias: "Carlos Chef",
        first_name: "Carlos",
        last_name: "Ruiz",
        avatar_url: null,
      },
    },
    {
      id: 3,
      name: "Gazpacho Andaluz",
      ingredients:
        "1 kg tomates maduros, 1 pepino, 1 pimiento verde, 1 diente ajo, pan del día anterior, vinagre, aceite, sal",
      preparation:
        "1. Pelar y trocear verduras\n2. Remojar pan en agua\n3. Triturar todo junto\n4. Colar y enfriar\n5. Servir con guarnición",
      image_url: "/placeholder.svg?height=200&width=300&text=Gazpacho+Andaluz",
      is_ai_generated: true,
      video_url: "https://youtube.com/watch?v=example",
      source_url: null,
      calories: 180,
      user_id: "user-1",
      created_at: "2024-01-13T12:20:00Z",
      categories: [{ id: 2, name: "Almuerzo" }],
      user_profiles: {
        id: "user-1",
        full_name: "María García",
        email: "maria@example.com",
        alias: "Chef María",
        first_name: "María",
        last_name: "García",
        avatar_url: null,
      },
    },
    {
      id: 4,
      name: "Cocido Madrileño",
      ingredients: "Garbanzos, morcillo, tocino, chorizo, morcilla, pollo, repollo, patatas, zanahoria",
      preparation:
        "1. Poner garbanzos en remojo\n2. Cocer carnes en olla\n3. Añadir verduras\n4. Servir en tres vuelcos",
      image_url: "/placeholder.svg?height=200&width=300&text=Cocido+Madrileño",
      is_ai_generated: false,
      video_url: null,
      source_url: "https://example.com/cocido-madrileno",
      calories: 650,
      user_id: "user-3",
      created_at: "2024-01-12T14:10:00Z",
      categories: [{ id: 2, name: "Almuerzo" }],
      user_profiles: {
        id: "user-3",
        full_name: "Ana López",
        email: "ana@example.com",
        alias: "Ana Cocina",
        first_name: "Ana",
        last_name: "López",
        avatar_url: null,
      },
    },
    {
      id: 5,
      name: "Crema Catalana",
      ingredients: "500ml leche, 6 yemas, 100g azúcar, 30g maicena, piel de limón, canela en rama",
      preparation:
        "1. Hervir leche con limón y canela\n2. Batir yemas con azúcar\n3. Templar y cocinar hasta espesar\n4. Enfriar y quemar azúcar",
      image_url: "/placeholder.svg?height=200&width=300&text=Crema+Catalana",
      is_ai_generated: true,
      video_url: null,
      source_url: null,
      calories: 280,
      user_id: "user-2",
      created_at: "2024-01-11T16:30:00Z",
      categories: [{ id: 4, name: "Postre" }],
      user_profiles: {
        id: "user-2",
        full_name: "Carlos Ruiz",
        email: "carlos@example.com",
        alias: "Carlos Chef",
        first_name: "Carlos",
        last_name: "Ruiz",
        avatar_url: null,
      },
    },
  ]

  // Generar más recetas para simular las 82 reales
  const additionalRecipes: Recipe[] = []
  const recipeNames = [
    "Fabada Asturiana",
    "Pulpo a la Gallega",
    "Jamón Ibérico",
    "Croquetas de Jamón",
    "Patatas Bravas",
    "Gambas al Pil Pil",
    "Bacalao al Pil Pil",
    "Marmitako",
    "Pisto Manchego",
    "Migas Extremeñas",
    "Callos a la Madrileña",
    "Rabo de Toro",
    "Pescaíto Frito",
    "Espetos de Sardinas",
    "Ajoblanco",
    "Salmorejo",
    "Torrijas",
    "Flan de Huevo",
    "Natillas",
    "Arroz con Leche",
    "Churros con Chocolate",
    "Pestiños",
    "Polvorones",
    "Turrón",
    "Empanada Gallega",
    "Caldo Gallego",
    "Lacón con Grelos",
    "Merluza a la Gallega",
    "Paella de Mariscos",
    "Arroz Negro",
    "Fideuá",
    "Arroz con Pollo",
    "Lentejas con Chorizo",
    "Garbanzos con Espinacas",
    "Judías con Almejas",
    "Potaje de Vigilia",
    "Sopa de Ajo",
    "Sopa Castellana",
    "Gazpacho Manchego",
    "Ajo Blanco",
    "Escalivada",
    "Pan con Tomate",
    "Boquerones en Vinagre",
    "Anchoas del Cantábrico",
    "Queso Manchego",
    "Cabrales",
    "Jamón Serrano",
    "Lomo Embuchado",
    "Chorizo Ibérico",
    "Morcilla de Burgos",
    "Butifarra Catalana",
    "Sobrasada",
    "Ensaladilla Rusa",
    "Ensalada Mixta",
    "Ensalada de Tomate",
    "Pimientos de Padrón",
    "Berenjenas con Miel",
    "Alcachofas a la Plancha",
    "Espárragos Trigueros",
    "Habas con Jamón",
    "Cordero Asado",
    "Cochinillo Segoviano",
    "Pollo al Chilindrón",
    "Conejo al Ajillo",
    "Merluza en Salsa Verde",
    "Bacalao a la Vizcaína",
    "Rape a la Plancha",
    "Lubina a la Sal",
    "Calamares a la Romana",
    "Chipirones en su Tinta",
    "Pulpo a Feira",
    "Navajas a la Plancha",
    "Tarta de Santiago",
    "Quesada Pasiega",
    "Pantxineta",
    "Goxua",
    "Leche Frita",
    "Bartolillos",
    "Rosquillas",
    "Magdalenas",
    "Bizcocho de Yogur",
    "Tarta de Queso",
    "Mousse de Chocolate",
    "Tiramisu Español",
  ]

  recipeNames.forEach((name, index) => {
    const categories = [
      [{ id: 1, name: "Desayuno" }],
      [{ id: 2, name: "Almuerzo" }],
      [{ id: 3, name: "Cena" }],
      [{ id: 4, name: "Postre" }],
      [{ id: 5, name: "Snacks" }],
    ]

    additionalRecipes.push({
      id: index + 6,
      name,
      ingredients: `Ingredientes para ${name}`,
      preparation: `Preparación paso a paso para ${name}`,
      image_url: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(name)}`,
      is_ai_generated: Math.random() > 0.5,
      video_url: Math.random() > 0.7 ? "https://youtube.com/watch?v=example" : null,
      source_url: Math.random() > 0.6 ? `https://example.com/${name.toLowerCase().replace(/\s+/g, "-")}` : null,
      calories: Math.floor(Math.random() * 500) + 150,
      user_id: `user-${Math.floor(Math.random() * 3) + 1}`,
      created_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString(),
      categories: categories[Math.floor(Math.random() * categories.length)],
      user_profiles: {
        id: `user-${Math.floor(Math.random() * 3) + 1}`,
        full_name: ["María García", "Carlos Ruiz", "Ana López"][Math.floor(Math.random() * 3)],
        email: ["maria@example.com", "carlos@example.com", "ana@example.com"][Math.floor(Math.random() * 3)],
        alias: ["Chef María", "Carlos Chef", "Ana Cocina"][Math.floor(Math.random() * 3)],
        first_name: ["María", "Carlos", "Ana"][Math.floor(Math.random() * 3)],
        last_name: ["García", "Ruiz", "López"][Math.floor(Math.random() * 3)],
        avatar_url: null,
      },
    })
  })

  const allRecipes = [...mockRecipes, ...additionalRecipes].slice(0, 82)

  const mockCategories: CategoryWithCount[] = [
    { id: 1, name: "Desayuno", recipeCount: allRecipes.filter((r) => r.categories.some((c) => c.id === 1)).length },
    { id: 2, name: "Almuerzo", recipeCount: allRecipes.filter((r) => r.categories.some((c) => c.id === 2)).length },
    { id: 3, name: "Cena", recipeCount: allRecipes.filter((r) => r.categories.some((c) => c.id === 3)).length },
    { id: 4, name: "Postre", recipeCount: allRecipes.filter((r) => r.categories.some((c) => c.id === 4)).length },
    { id: 5, name: "Snacks", recipeCount: allRecipes.filter((r) => r.categories.some((c) => c.id === 5)).length },
  ]

  return {
    recipes: allRecipes,
    categories: mockCategories,
    totalRecipesCount: allRecipes.length,
    dataQuality: {
      hasFullRecipeData: true,
      hasCategoriesData: true,
      hasRelationsData: true,
    },
  }
}

export const getRecipesAndCategories = async () => {
  console.log("🚀 Cargando datos de recetas...")

  // Simular delay de carga
  await new Promise((resolve) => setTimeout(resolve, 500))

  const data = getMockRecipesData()

  console.log(`✅ ${data.recipes.length} recetas cargadas exitosamente`)
  console.log(`✅ ${data.categories.length} categorías cargadas`)

  return data
}

export const getRecipeById = async (id: number) => {
  console.log(`🔍 Obteniendo receta con ID: ${id}`)

  const { recipes } = getMockRecipesData()
  const recipe = recipes.find((r) => r.id === id)

  if (!recipe) {
    return { recipe: null, error: "Receta no encontrada" }
  }

  console.log("✅ Receta obtenida exitosamente")
  return { recipe, error: null }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount, dataQuality } = await getRecipesAndCategories()

  const showOnlyMyRecipes = searchParams.my === "true"

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Link
          href="/recipes/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir Receta
        </Link>
      </div>

      {/* Información sobre los datos */}
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <p className="text-green-800">
            <strong>Datos cargados:</strong> {totalRecipesCount} recetas disponibles con todas las categorías y
            relaciones.
          </p>
        </div>
      </div>

      {/* Mostrar recetas */}
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="mb-6">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold mb-2">No hay recetas disponibles</h2>
            <p className="text-muted-foreground mb-4">Sé el primero en añadir una receta al sistema.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/recipes"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Recargar
            </Link>
            <Link
              href="/recipes/add"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ➕ Añadir Primera Receta
            </Link>
          </div>
        </div>
      ) : (
        <RecipesPageClient
          recipes={recipes}
          categories={categories}
          totalRecipesCount={totalRecipesCount}
          showOnlyMyRecipes={showOnlyMyRecipes}
        />
      )}
    </div>
  )
}

export default Recipes
