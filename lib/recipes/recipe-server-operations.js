const { buildRecipeMutation, normalizeCategoryName, parseCategoryId, parseRecipeId, toPublicRecipe, validateRating } = require("./recipe-domain")

const PUBLIC_RECIPE_ERROR = { error: "No se pudieron obtener las recetas" }

async function readPublicRecipes(client) {
  try {
    const { data, error } = await client.rpc("get_public_recipes", { p_recipe_id: null })
    if (error) return { status: 500, body: PUBLIC_RECIPE_ERROR }
    return { status: 200, body: { recipes: (Array.isArray(data) ? data : []).map(toPublicRecipe) } }
  } catch {
    return { status: 500, body: PUBLIC_RECIPE_ERROR }
  }
}

async function readPublicRecipe(client, rawId) {
  const recipeId = parseRecipeId(rawId)
  if (!recipeId) return { status: 400, body: { error: "ID de receta inválido" } }
  try {
    const { data, error } = await client.rpc("get_public_recipes", { p_recipe_id: recipeId })
    if (error) return { status: 500, body: { error: "No se pudo obtener la receta" } }
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return { status: 404, body: { error: "Receta no encontrada" } }
    return { status: 200, body: { recipe: toPublicRecipe(row) } }
  } catch {
    return { status: 500, body: { error: "No se pudo obtener la receta" } }
  }
}

async function readPublicCategories(client) {
  try {
    const [{ data, error }, { data: links, error: linksError }] = await Promise.all([
      client.from("categories").select("id, name, created_at").order("name"),
      client.from("recipe_categories").select("category_id"),
    ])
    if (error || linksError) return { status: 500, body: { error: "No se pudieron obtener las categorías" } }
    const recipeCounts = new Map()
    for (const link of links || []) {
      const categoryId = parseCategoryId(link.category_id)
      if (categoryId) recipeCounts.set(categoryId, (recipeCounts.get(categoryId) || 0) + 1)
    }
    const categories = (Array.isArray(data) ? data : []).map((category) => ({
      id: category.id,
      name: typeof category.name === "string" ? category.name.trim() : "",
      created_at: category.created_at ?? null,
      recipe_count: recipeCounts.get(parseCategoryId(category.id)) || 0,
    }))
    return { status: 200, body: { categories } }
  } catch {
    return { status: 500, body: { error: "No se pudieron obtener las categorías" } }
  }
}

function ratingAggregate(row) {
  const count = Number(row?.rating_count)
  const average = row?.rating_average === null || row?.rating_average === undefined
    ? null
    : Number(row.rating_average)
  return {
    average: Number.isFinite(average) ? average : null,
    count: Number.isSafeInteger(count) && count >= 0 ? count : 0,
  }
}

async function publicRatingState(client, recipeId) {
  try {
    const { data, error } = await client.rpc("get_public_recipes", { p_recipe_id: recipeId })
    if (error) return { error: errorResult(500, "No se pudieron obtener las valoraciones") }
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return { error: errorResult(404, "Receta no encontrada") }
    return { row, aggregate: ratingAggregate(row) }
  } catch {
    return { error: errorResult(500, "No se pudieron obtener las valoraciones") }
  }
}

async function readRecipeRating(client, rawId) {
  const recipeId = parseRecipeId(rawId)
  if (!recipeId) return errorResult(400, "ID de receta inválido")
  const publicState = await publicRatingState(client, recipeId)
  if (publicState.error) return publicState.error
  const user = await authenticatedUser(client)
  if (!user) return { status: 200, body: publicState.aggregate }
  try {
    const { data, error } = await client.from("recipe_ratings")
      .select("rating")
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (error) return errorResult(500, "No se pudieron obtener las valoraciones")
    return {
      status: 200,
      body: { ...publicState.aggregate, own_rating: validateRating(data?.rating) },
    }
  } catch {
    return errorResult(500, "No se pudieron obtener las valoraciones")
  }
}

function validateRatingInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return errorResult(400, "Cuerpo de petición inválido")
  const keys = Object.keys(input)
  if (keys.length !== 1 || keys[0] !== "rating") return errorResult(400, "El cuerpo contiene campos no permitidos")
  const rating = validateRating(input.rating)
  return rating ?? errorResult(400, "La valoración debe ser un número entero entre 1 y 5")
}

async function ratingMutationContext(client, rawId) {
  const recipeId = parseRecipeId(rawId)
  if (!recipeId) return { error: errorResult(400, "ID de receta inválido") }
  const user = await authenticatedUser(client)
  if (!user) return { error: errorResult(401, "Debes iniciar sesión") }
  const publicState = await publicRatingState(client, recipeId)
  if (publicState.error) return publicState
  return { recipeId, user }
}

async function upsertRecipeRating(client, rawId, input) {
  const recipeId = parseRecipeId(rawId)
  if (!recipeId) return errorResult(400, "ID de receta inválido")
  const rating = validateRatingInput(input)
  if (typeof rating !== "number") return rating
  const context = await ratingMutationContext(client, recipeId)
  if (context.error) return context.error
  try {
    // Esta lectura se ejecuta con la sesión y RLS: permite detectar al propietario
    // (incluido admin-propietario) sin publicar su identidad.
    const { data: recipe, error: recipeError } = await client.from("recipes")
      .select("id, user_id")
      .eq("id", context.recipeId)
      .maybeSingle()
    if (recipeError) return errorResult(500, "No se pudo comprobar la receta")
    if (recipe?.user_id === context.user.id) return errorResult(403, "No puedes valorar tu propia receta")

    const { data, error } = await client.from("recipe_ratings")
      .upsert({ recipe_id: context.recipeId, user_id: context.user.id, rating }, { onConflict: "recipe_id,user_id" })
      .select("rating")
      .single()
    if (error?.code === "23514") return errorResult(403, "No puedes valorar tu propia receta")
    if (error?.code === "23503") return errorResult(404, "Receta no encontrada")
    if (error) return errorResult(500, "No se pudo guardar la valoración")
    const savedRating = validateRating(data?.rating)
    if (!savedRating) return errorResult(500, "No se pudo guardar la valoración")
    return { status: 200, body: { success: true, rating: savedRating } }
  } catch {
    return errorResult(500, "No se pudo guardar la valoración")
  }
}

async function deleteRecipeRating(client, rawId) {
  const context = await ratingMutationContext(client, rawId)
  if (context.error) return context.error
  try {
    const { data, error } = await client.from("recipe_ratings")
      .delete()
      .eq("recipe_id", context.recipeId)
      .eq("user_id", context.user.id)
      .select("id")
    if (error) return errorResult(500, "No se pudo retirar la valoración")
    return { status: 200, body: { success: true, removed: Array.isArray(data) && data.length > 0 } }
  } catch {
    return errorResult(500, "No se pudo retirar la valoración")
  }
}

async function authenticatedUser(client) {
  if (!client.auth || typeof client.auth.getUser !== "function") return null
  try {
    const { data, error } = await client.auth.getUser()
    return error ? null : data?.user ?? null
  } catch {
    return null
  }
}

const RECIPE_INPUT_FIELDS = new Set([
  "name", "ingredients", "preparation", "is_ai_generated",
  "video_url", "source_url", "calories", "categories",
])
const AUTHENTICATED_RECIPE_ROLES = new Set(["user_restricted", "user_full", "admin"])

function errorResult(status, error, extra) {
  return { status, body: { error, ...(extra || {}) } }
}

function validateRecipeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return errorResult(400, "Cuerpo de petición inválido")
  if (Object.keys(input).some((key) => !RECIPE_INPUT_FIELDS.has(key))) return errorResult(400, "El cuerpo contiene campos no permitidos")
  if (typeof input.name !== "string" || !input.name.trim()) return errorResult(400, "Nombre requerido")
  if (input.calories !== undefined && input.calories !== null && input.calories !== "" && !Number.isInteger(Number(input.calories))) {
    return errorResult(400, "Calorías inválidas")
  }
  if (input.categories !== undefined && !Array.isArray(input.categories)) return errorResult(400, "Categorías inválidas")
  const categories = []
  for (const value of input.categories || []) {
    const categoryId = parseCategoryId(value)
    if (!categoryId) return errorResult(400, "ID de categoría inválido")
    if (!categories.includes(categoryId)) categories.push(categoryId)
  }
  return { categories, categoriesProvided: input.categories !== undefined }
}

async function authenticatedActor(client) {
  const user = await authenticatedUser(client)
  if (!user) return { error: errorResult(401, "Debes iniciar sesión") }
  try {
    const { data, error } = await client.from("user_profiles").select("role").eq("id", user.id).single()
    if (error || !AUTHENTICATED_RECIPE_ROLES.has(data?.role)) return { error: errorResult(403, "No tienes permisos para realizar esta acción") }
    return { user, role: data.role }
  } catch {
    return { error: errorResult(500, "No se pudo comprobar la autorización") }
  }
}

function validateCategoryNameInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return errorResult(400, "Cuerpo de petición inválido")
  const keys = Object.keys(input)
  if (keys.length !== 1 || keys[0] !== "name") return errorResult(400, "El cuerpo contiene campos no permitidos")
  const normalized = normalizeCategoryName(input.name)
  if (!normalized) return errorResult(400, "El nombre de la categoría no puede estar vacío")
  return normalized.name
}

async function requireAdmin(client) {
  const user = await authenticatedUser(client)
  if (!user) return { error: errorResult(401, "Debes iniciar sesión") }
  try {
    const { data, error } = await client.rpc("current_user_is_admin")
    if (error) return { error: errorResult(500, "No se pudo comprobar la autorización") }
    if (data !== true) return { error: errorResult(403, "Solo un administrador puede realizar esta acción") }
    return { user }
  } catch {
    return { error: errorResult(500, "No se pudo comprobar la autorización") }
  }
}

function categoryWriteError(error, fallback) {
  if (error?.code === "23505") return errorResult(409, "Ya existe una categoría con ese nombre")
  if (error?.code === "23514" || error?.code === "22023") return errorResult(400, "Nombre de categoría inválido")
  return errorResult(500, fallback)
}

async function createCategory(client, input) {
  const actor = await authenticatedActor(client)
  if (actor.error) return actor.error
  const name = validateCategoryNameInput(input)
  if (typeof name !== "string") return name
  try {
    const { data, error } = await client.from("categories").insert({ name }).select("id, name, created_at").single()
    if (error) return categoryWriteError(error, "No se pudo crear la categoría")
    if (!data) return errorResult(500, "No se pudo crear la categoría")
    return { status: 201, body: { category: { id: data.id, name: data.name, created_at: data.created_at ?? null } } }
  } catch {
    return errorResult(500, "No se pudo crear la categoría")
  }
}

async function updateCategory(client, rawId, input) {
  const categoryId = parseCategoryId(rawId)
  if (!categoryId) return errorResult(400, "ID de categoría inválido")
  const admin = await requireAdmin(client)
  if (admin.error) return admin.error
  const name = validateCategoryNameInput(input)
  if (typeof name !== "string") return name
  try {
    const { data, error } = await client.from("categories").update({ name }).eq("id", categoryId).select("id, name, created_at").maybeSingle()
    if (error) return categoryWriteError(error, "No se pudo actualizar la categoría")
    if (!data) return errorResult(404, "Categoría no encontrada")
    return { status: 200, body: { category: { id: data.id, name: data.name, created_at: data.created_at ?? null } } }
  } catch {
    return errorResult(500, "No se pudo actualizar la categoría")
  }
}

async function deleteCategory(client, rawId) {
  const categoryId = parseCategoryId(rawId)
  if (!categoryId) return errorResult(400, "ID de categoría inválido")
  const admin = await requireAdmin(client)
  if (admin.error) return admin.error
  try {
    const { data, error } = await client.from("categories").delete().eq("id", categoryId).select("id").maybeSingle()
    if (error?.code === "23503") return errorResult(409, "La categoría tiene recetas asociadas; vacíala o fusiónala antes de eliminarla")
    if (error) return errorResult(500, "No se pudo eliminar la categoría")
    if (!data) return errorResult(404, "Categoría no encontrada")
    return { status: 200, body: { success: true } }
  } catch {
    return errorResult(500, "No se pudo eliminar la categoría")
  }
}

function validateMergeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return errorResult(400, "Cuerpo de petición inválido")
  const allowed = new Set(["source_category_id", "target_category_id"])
  const keys = Object.keys(input)
  if (keys.length !== 2 || keys.some((key) => !allowed.has(key))) return errorResult(400, "El cuerpo contiene campos no permitidos")
  const sourceCategoryId = parseCategoryId(input.source_category_id)
  const targetCategoryId = parseCategoryId(input.target_category_id)
  if (!sourceCategoryId || !targetCategoryId) return errorResult(400, "Los IDs de categoría deben ser enteros positivos")
  if (sourceCategoryId === targetCategoryId) return errorResult(400, "Las categorías de origen y destino deben ser distintas")
  return { sourceCategoryId, targetCategoryId }
}

async function mergeCategories(client, input) {
  const admin = await requireAdmin(client)
  if (admin.error) return admin.error
  const validated = validateMergeInput(input)
  if (validated.status) return validated
  try {
    const { data, error } = await client.rpc("merge_categories", {
      p_source_category_id: validated.sourceCategoryId,
      p_target_category_id: validated.targetCategoryId,
    })
    if (error?.code === "P0002" || error?.code === "02000") return errorResult(404, "Alguna categoría no existe")
    if (error?.code === "22023") return errorResult(400, "Las categorías de origen y destino no son válidas")
    if (error) return errorResult(500, "No se pudieron fusionar las categorías")
    const targetCategoryId = parseCategoryId(data)
    if (targetCategoryId !== validated.targetCategoryId) return errorResult(500, "No se pudieron fusionar las categorías")
    return { status: 200, body: { success: true, target_category_id: targetCategoryId } }
  } catch {
    return errorResult(500, "No se pudieron fusionar las categorías")
  }
}

async function requireRecipeManager(client, rawId) {
  const recipeId = parseRecipeId(rawId)
  if (!recipeId) return { error: errorResult(400, "ID de receta inválido") }
  const actor = await authenticatedActor(client)
  if (actor.error) return actor
  try {
    const { data, error } = await client.rpc("can_manage_recipe", { p_recipe_id: recipeId })
    if (error) return { error: errorResult(500, "No se pudo comprobar la autorización") }
    if (data !== true) return { error: errorResult(403, "No tienes permisos para gestionar esta receta") }
    return { recipeId, ...actor }
  } catch {
    return { error: errorResult(500, "No se pudo comprobar la autorización") }
  }
}

async function categoriesExist(client, categoryIds) {
  if (categoryIds.length === 0) return true
  try {
    const { data, error } = await client.from("categories").select("id").in("id", categoryIds)
    if (error) return null
    const found = new Set((data || []).map((row) => parseCategoryId(row.id)).filter(Boolean))
    return categoryIds.every((id) => found.has(id))
  } catch {
    return null
  }
}

async function createRecipe(client, input, hoy) {
  const actor = await authenticatedActor(client)
  if (actor.error) return actor.error
  const validated = validateRecipeInput(input)
  if (validated.status) return validated
  const exist = await categoriesExist(client, validated.categories)
  if (exist === null) return errorResult(500, "No se pudieron comprobar las categorías")
  if (!exist) return errorResult(400, "Alguna categoría no existe")

  let mutation
  try { mutation = buildRecipeMutation(input, actor.user.id, hoy) } catch { return errorResult(400, "Datos de receta inválidos") }
  try {
    const { data: recipe, error } = await client.from("recipes").insert(mutation).select("id").single()
    const recipeId = parseRecipeId(recipe?.id)
    if (error || !recipeId) return errorResult(500, "No se pudo crear la receta")
    if (validated.categories.length > 0) {
      const links = validated.categories.map((categoryId) => ({ recipe_id: recipeId, category_id: categoryId }))
      const { error: linkError } = await client.from("recipe_categories").insert(links)
      if (linkError) {
        const compensation = await client.from("recipes").delete().eq("id", recipeId)
        return errorResult(500, "No se pudo completar la creación de la receta", compensation.error ? { partial: true, recipe_id: recipeId } : undefined)
      }
    }
    return { status: 201, body: { success: true, recipe_id: recipeId, categories: validated.categories.length } }
  } catch {
    return errorResult(500, "No se pudo crear la receta")
  }
}

const RECIPE_PERSISTED_FIELDS = "id, name, ingredients, preparation, image_url, is_ai_generated, created_at, video_url, source_url, calories, user_id"

function editableMutation(input, actorId, hoy) {
  const built = buildRecipeMutation(input, actorId, hoy)
  const { user_id: _owner, created_at: _created, ...editable } = built
  return Object.fromEntries(Object.entries(editable).filter(([key]) => Object.prototype.hasOwnProperty.call(input, key)))
}

async function updateRecipe(client, rawId, input, hoy) {
  const manager = await requireRecipeManager(client, rawId)
  if (manager.error) return manager.error
  const validated = validateRecipeInput(input)
  if (validated.status) return validated
  const exist = await categoriesExist(client, validated.categories)
  if (exist === null) return errorResult(500, "No se pudieron comprobar las categorías")
  if (!exist) return errorResult(400, "Alguna categoría no existe")

  try {
    const [{ data: previous, error: recipeError }, { data: oldLinks, error: linksError }] = await Promise.all([
      client.from("recipes").select(RECIPE_PERSISTED_FIELDS).eq("id", manager.recipeId).single(),
      client.from("recipe_categories").select("category_id").eq("recipe_id", manager.recipeId),
    ])
    if (recipeError || !previous) return errorResult(404, "Receta no encontrada")
    if (linksError) return errorResult(500, "No se pudieron comprobar las categorías de la receta")
    const oldCategoryIds = (oldLinks || []).map((row) => parseCategoryId(row.category_id)).filter(Boolean)
    const targetCategoryIds = validated.categoriesProvided ? validated.categories : oldCategoryIds
    const additions = targetCategoryIds.filter((id) => !oldCategoryIds.includes(id))
    const removals = oldCategoryIds.filter((id) => !targetCategoryIds.includes(id))
    const mutation = editableMutation(input, manager.user.id, hoy)
    const { data: updated, error: updateError } = await client.from("recipes").update(mutation).eq("id", manager.recipeId).select(RECIPE_PERSISTED_FIELDS).single()
    if (updateError || !updated) return errorResult(500, "No se pudo actualizar la receta")

    if (additions.length > 0) {
      const { error } = await client.from("recipe_categories").insert(additions.map((categoryId) => ({ recipe_id: manager.recipeId, category_id: categoryId })))
      if (error) {
        const { id: _id, image_url: _image, ...restore } = previous
        const compensation = await client.from("recipes").update(restore).eq("id", manager.recipeId)
        return errorResult(500, "No se pudieron actualizar las categorías", compensation.error ? { partial: true } : undefined)
      }
    }
    const removed = []
    for (const categoryId of removals) {
      const { error } = await client.from("recipe_categories").delete().eq("recipe_id", manager.recipeId).eq("category_id", categoryId)
      if (error) {
        let additionsCleaned = true
        if (additions.length > 0) {
          for (const addedId of additions) {
            const cleanup = await client.from("recipe_categories").delete().eq("recipe_id", manager.recipeId).eq("category_id", addedId)
            if (cleanup.error) additionsCleaned = false
          }
        }
        let linksRestored = true
        if (removed.length > 0) {
          const restoreLinks = await client.from("recipe_categories").insert(removed.map((removedId) => ({ recipe_id: manager.recipeId, category_id: removedId })))
          linksRestored = !restoreLinks.error
        }
        const { id: _id, image_url: _image, ...restore } = previous
        const compensation = await client.from("recipes").update(restore).eq("id", manager.recipeId)
        return errorResult(500, "No se pudieron actualizar las categorías", compensation.error || !linksRestored || !additionsCleaned ? { partial: true } : undefined)
      }
      removed.push(categoryId)
    }
    return { status: 200, body: { success: true, recipe: updated, message: "Receta actualizada correctamente" } }
  } catch {
    return errorResult(500, "No se pudo actualizar la receta")
  }
}

async function countMenuReferences(client, recipeId) {
  try {
    const { count, error } = await client.from("menu_items").select("id", { count: "exact", head: true }).eq("recipe_id", recipeId)
    if (error || !Number.isSafeInteger(count) || count < 0) return null
    return count
  } catch {
    return null
  }
}

async function checkRecipeMenuUsage(client, rawId) {
  const manager = await requireRecipeManager(client, rawId)
  if (manager.error) return manager.error
  const menuCount = await countMenuReferences(client, manager.recipeId)
  if (menuCount === null) return errorResult(500, "No se pudo comprobar el uso de la receta en menús")
  const inMenu = menuCount > 0
  return { status: 200, body: {
    inMenu,
    menuCount,
    message: inMenu ? `Esta receta está incluida en ${menuCount} menú${menuCount === 1 ? "" : "s"}. Debes quitarla ${menuCount === 1 ? "de ese menú" : "de todos los menús"} antes de eliminarla.` : null,
  } }
}

async function deleteRecipe(client, rawId) {
  const manager = await requireRecipeManager(client, rawId)
  if (manager.error) return manager.error
  try {
    const menuCount = await countMenuReferences(client, manager.recipeId)
    if (menuCount === null) return errorResult(500, "No se pudo comprobar el uso de la receta en menús")
    if (menuCount > 0) return errorResult(409, "RECIPE_IN_MENU", {
      message: `La receta está incluida en ${menuCount} menú${menuCount === 1 ? "" : "s"}. Debes retirarla manualmente antes de eliminarla.`, menuCount,
    })
    const { data, error } = await client.rpc("delete_recipe_with_image_cleanup", { p_recipe_id: manager.recipeId })
    if (error?.code === "23503") return errorResult(409, "RECIPE_IN_MENU", { message: "La receta ha sido añadida a un menú y no puede eliminarse." })
    if (error?.code === "P0002" || error?.code === "02000") return errorResult(404, "Receta no encontrada")
    if (error) return errorResult(500, "No se pudo eliminar la receta")
    const transition = Array.isArray(data) ? data[0] : data
    if (transition?.deleted !== true) return errorResult(500, "No se pudo eliminar la receta")
    return {
      status: 200,
      body: { success: true, message: "Receta eliminada correctamente" },
      cleanupContext: { managedImagePath: transition.cleanup_path || null },
    }
  } catch {
    return errorResult(500, "No se pudo eliminar la receta")
  }
}

async function readRecipeListing(client) {
  const publicResult = await readPublicRecipes(client)
  if (publicResult.status !== 200) return publicResult
  const publicRecipes = publicResult.body.recipes
  const user = await authenticatedUser(client)
  if (!user) {
    return { status: 200, body: { recipes: publicRecipes.map((recipe) => ({ ...recipe, menu_ids: [] })) } }
  }

  try {
    const { data: adminCapability, error: adminCapabilityError } = await client.rpc("current_user_is_admin")
    if (adminCapabilityError) return { status: 500, body: PUBLIC_RECIPE_ERROR }
    const isAdmin = adminCapability === true
    const [managedResult, ownedResult, ratingsResult, menuResult] = await Promise.all([
      client.from("recipes").select(isAdmin ? "id, user_id" : "id"),
      client.from("recipes").select("id").eq("user_id", user.id),
      client.from("recipe_ratings").select("recipe_id, rating").eq("user_id", user.id),
      client.from("menu_items").select("recipe_id, weekly_menu_id"),
    ])
    if (managedResult.error || ownedResult.error || ratingsResult.error || menuResult.error) {
      return { status: 500, body: PUBLIC_RECIPE_ERROR }
    }
    const managedIds = new Set((managedResult.data || []).map((row) => parseRecipeId(row.id)).filter(Boolean))
    const ownedIds = new Set((ownedResult.data || []).map((row) => parseRecipeId(row.id)).filter(Boolean))
    const ratings = new Map((ratingsResult.data || []).map((row) => [parseRecipeId(row.recipe_id), validateRating(row.rating)]))
    const menus = new Map()
    for (const row of menuResult.data || []) {
      const recipeId = parseRecipeId(row.recipe_id)
      const menuId = parseRecipeId(row.weekly_menu_id)
      if (!recipeId || !menuId) continue
      const values = menus.get(recipeId) || []
      if (!values.includes(menuId)) values.push(menuId)
      menus.set(recipeId, values)
    }
    const authorMetadata = new Map()
    if (isAdmin) {
      let sequence = 0
      for (const row of managedResult.data || []) {
        const recipeId = parseRecipeId(row.id)
        if (!recipeId || typeof row.user_id !== "string") continue
        let metadata = authorMetadata.get(row.user_id)
        if (!metadata) {
          sequence += 1
          metadata = { key: `author-${sequence}`, recipeIds: [] }
          authorMetadata.set(row.user_id, metadata)
        }
        metadata.recipeIds.push(recipeId)
      }
    }
    const aliasTotals = new Map()
    for (const metadata of authorMetadata.values()) {
      const recipe = publicRecipes.find((item) => metadata.recipeIds.includes(item.id))
      const alias = recipe?.author_alias || "Usuario"
      aliasTotals.set(alias, (aliasTotals.get(alias) || 0) + 1)
    }
    const aliasIndexes = new Map()
    const recipeAuthorMetadata = new Map()
    for (const metadata of authorMetadata.values()) {
      const recipe = publicRecipes.find((item) => metadata.recipeIds.includes(item.id))
      const alias = recipe?.author_alias || "Usuario"
      const index = (aliasIndexes.get(alias) || 0) + 1
      aliasIndexes.set(alias, index)
      const label = aliasTotals.get(alias) > 1 ? `${alias} (${index})` : alias
      for (const recipeId of metadata.recipeIds) recipeAuthorMetadata.set(recipeId, { key: metadata.key, label })
    }
    return {
      status: 200,
      body: {
        recipes: publicRecipes.map((recipe) => ({
          ...recipe,
          can_edit: managedIds.has(recipe.id),
          can_delete: managedIds.has(recipe.id),
          is_owner: ownedIds.has(recipe.id),
          my_rating: ratings.get(recipe.id) ?? null,
          menu_ids: menus.get(recipe.id) || [],
          ...(recipeAuthorMetadata.has(recipe.id) ? {
            author_filter_key: recipeAuthorMetadata.get(recipe.id).key,
            author_filter_label: recipeAuthorMetadata.get(recipe.id).label,
          } : {}),
        })),
      },
    }
  } catch {
    return { status: 500, body: PUBLIC_RECIPE_ERROR }
  }
}

async function readRecipeDetail(client, rawId) {
  const publicResult = await readPublicRecipe(client, rawId)
  if (publicResult.status !== 200) return publicResult
  const recipe = publicResult.body.recipe
  const user = await authenticatedUser(client)
  if (!user) return { status: 200, body: { recipe } }
  try {
    const [managedResult, ownedResult, ratingResult] = await Promise.all([
      client.from("recipes").select("id").eq("id", recipe.id).maybeSingle(),
      client.from("recipes").select("id").eq("id", recipe.id).eq("user_id", user.id).maybeSingle(),
      client.from("recipe_ratings").select("rating").eq("recipe_id", recipe.id).eq("user_id", user.id).maybeSingle(),
    ])
    if (managedResult.error || ownedResult.error || ratingResult.error) return { status: 500, body: { error: "No se pudo obtener la receta" } }
    const canManage = parseRecipeId(managedResult.data?.id) === recipe.id
    const isOwner = parseRecipeId(ownedResult.data?.id) === recipe.id
    return {
      status: 200,
      body: { recipe: { ...recipe, can_edit: canManage, can_delete: canManage, is_owner: isOwner, my_rating: validateRating(ratingResult.data?.rating) } },
    }
  } catch {
    return { status: 500, body: { error: "No se pudo obtener la receta" } }
  }
}

module.exports = {
  checkRecipeMenuUsage,
  createCategory,
  createRecipe,
  deleteCategory,
  deleteRecipe,
  deleteRecipeRating,
  mergeCategories,
  readPublicCategories,
  readPublicRecipe,
  readPublicRecipes,
  readRecipeRating,
  readRecipeDetail,
  readRecipeListing,
  updateCategory,
  updateRecipe,
  upsertRecipeRating,
}
