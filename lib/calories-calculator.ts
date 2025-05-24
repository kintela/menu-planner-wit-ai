// Base de datos simplificada de calorías por 100g de ingredientes comunes
const CALORIES_DATABASE: Record<string, number> = {
  // Carnes
  pollo: 165,
  "pechuga de pollo": 165,
  "muslo de pollo": 209,
  ternera: 250,
  cerdo: 242,
  jamón: 145,
  bacon: 541,
  chorizo: 455,
  salchichas: 301,

  // Pescados y mariscos
  salmón: 208,
  atún: 144,
  merluza: 90,
  bacalao: 82,
  gambas: 99,
  mejillones: 172,

  // Lácteos
  leche: 42,
  yogur: 59,
  queso: 402,
  mozzarella: 280,
  "queso fresco": 174,
  mantequilla: 717,
  nata: 345,

  // Huevos
  huevo: 155,
  huevos: 155,
  "clara de huevo": 52,
  "yema de huevo": 322,

  // Cereales y granos
  arroz: 130,
  pasta: 131,
  pan: 265,
  avena: 389,
  quinoa: 368,
  cuscús: 112,

  // Legumbres
  lentejas: 116,
  garbanzos: 164,
  judías: 127,
  alubias: 127,
  guisantes: 81,

  // Verduras
  tomate: 18,
  cebolla: 40,
  ajo: 149,
  pimiento: 31,
  zanahoria: 41,
  patata: 77,
  brócoli: 34,
  espinacas: 23,
  lechuga: 15,
  calabacín: 17,
  berenjena: 25,
  pepino: 16,

  // Frutas
  manzana: 52,
  plátano: 89,
  naranja: 47,
  limón: 29,
  aguacate: 160,
  tomate: 18,

  // Frutos secos
  almendras: 579,
  nueces: 654,
  pistachos: 560,
  cacahuetes: 567,

  // Aceites y grasas
  "aceite de oliva": 884,
  aceite: 884,
  oliva: 884,

  // Azúcares y endulzantes
  azúcar: 387,
  miel: 304,

  // Otros
  sal: 0,
  pimienta: 251,
  vinagre: 19,
  vino: 83,
}

// Palabras que indican cantidad y sus equivalencias en gramos
const QUANTITY_PATTERNS: Record<string, number> = {
  kg: 1000,
  kilo: 1000,
  kilos: 1000,
  g: 1,
  gr: 1,
  gramos: 1,
  gramo: 1,
  l: 1000, // Aproximación para líquidos
  litro: 1000,
  litros: 1000,
  ml: 1,
  mililitros: 1,
  taza: 240,
  tazas: 240,
  cucharada: 15,
  cucharadas: 15,
  cucharadita: 5,
  cucharaditas: 5,
  diente: 3, // diente de ajo
  dientes: 3,
  unidad: 100, // Aproximación general
  unidades: 100,
  pieza: 100,
  piezas: 100,
}

export function calculateCalories(ingredients: string): number {
  if (!ingredients || ingredients.trim() === "") {
    return 0
  }

  let totalCalories = 0
  const lines = ingredients.split("\n").filter((line) => line.trim() !== "")

  for (const line of lines) {
    const lineCalories = calculateLineCalories(line.toLowerCase().trim())
    totalCalories += lineCalories
  }

  return Math.round(totalCalories)
}

function calculateLineCalories(line: string): number {
  // Buscar patrones de cantidad
  let quantity = 100 // Cantidad por defecto en gramos
  let foundQuantity = false

  // Buscar números seguidos de unidades
  for (const [unit, grams] of Object.entries(QUANTITY_PATTERNS)) {
    const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, "i")
    const match = line.match(regex)
    if (match) {
      quantity = Number.parseFloat(match[1]) * grams
      foundQuantity = true
      break
    }
  }

  // Si no se encontró cantidad específica, buscar solo números
  if (!foundQuantity) {
    const numberMatch = line.match(/(\d+(?:\.\d+)?)/)
    if (numberMatch) {
      const number = Number.parseFloat(numberMatch[1])
      // Si el número es pequeño (< 10), probablemente sean unidades
      // Si es grande (> 50), probablemente sean gramos
      if (number < 10) {
        quantity = number * 100 // Asumir unidades de 100g cada una
      } else if (number > 50) {
        quantity = number // Asumir que ya son gramos
      } else {
        quantity = number * 50 // Valor intermedio
      }
    }
  }

  // Buscar el ingrediente en la base de datos
  let caloriesPer100g = 0
  let foundIngredient = false

  for (const [ingredient, calories] of Object.entries(CALORIES_DATABASE)) {
    if (line.includes(ingredient)) {
      caloriesPer100g = calories
      foundIngredient = true
      break
    }
  }

  // Si no se encuentra el ingrediente, usar un valor promedio
  if (!foundIngredient) {
    caloriesPer100g = 150 // Valor promedio para ingredientes desconocidos
  }

  // Calcular calorías para la cantidad especificada
  return (caloriesPer100g * quantity) / 100
}

// Función para obtener una estimación de calorías por porción
export function getCaloriesPerServing(totalCalories: number, servings = 4): number {
  return Math.round(totalCalories / servings)
}

// Función para categorizar el nivel calórico
export function getCalorieLevel(calories: number): { level: string; color: string } {
  if (calories < 200) {
    return { level: "Bajo", color: "text-green-600" }
  } else if (calories < 400) {
    return { level: "Moderado", color: "text-yellow-600" }
  } else if (calories < 600) {
    return { level: "Alto", color: "text-orange-600" }
  } else {
    return { level: "Muy Alto", color: "text-red-600" }
  }
}
