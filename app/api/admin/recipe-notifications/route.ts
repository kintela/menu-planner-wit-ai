import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { isAdmin } from "@/lib/auth"

export const runtime = "nodejs"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

function buildRecipesDigestEmail({
  recipes,
  baseUrl,
}: {
  recipes: Array<{
    id: number
    name: string
    ingredients: string
    preparation: string
    calories: number | null
    image_url: string | null
    video_url: string | null
    source_url: string | null
    categoryNames: string[]
    creatorName: string
  }>
  baseUrl: string
}) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const intro =
    recipes.length === 1
      ? "Se ha seleccionado esta receta para compartir contigo."
      : `Se han seleccionado ${recipes.length} recetas para compartir contigo.`

  const textSections = recipes.map((recipe, index) => {
    const ingredients = splitLines(recipe.ingredients)
    const preparation = splitLines(recipe.preparation)
    const recipeUrl = `${normalizedBaseUrl}/recipes/${recipe.id}`

    return [
      `${index + 1}. ${recipe.name}`,
      `Creada por: ${recipe.creatorName}`,
      recipe.calories != null ? `Calorías: ${recipe.calories}` : null,
      recipe.categoryNames.length > 0 ? `Categorías: ${recipe.categoryNames.join(", ")}` : null,
      `Enlace: ${recipeUrl}`,
      recipe.source_url ? `Fuente original: ${recipe.source_url}` : null,
      recipe.video_url ? `Vídeo: ${recipe.video_url}` : null,
      ``,
      `Ingredientes:`,
      ...(ingredients.length > 0 ? ingredients.map((line) => `- ${line}`) : ["- No informados"]),
      ``,
      `Preparación:`,
      ...(preparation.length > 0 ? preparation.map((line, stepIndex) => `${stepIndex + 1}. ${line}`) : ["- No informada"]),
    ]
      .filter(Boolean)
      .join("\n")
  })

  const text = [
    "Hola,",
    "",
    intro,
    "",
    ...textSections.flatMap((section) => [section, "", "------------------------------", ""]),
    "---",
    "Recibes este correo porque tienes una cuenta en MenuPlanner.",
    "Esperamos que alguna de estas recetas te sirva para inspirar tu próximo menú.",
  ].join("\n")

  const recipeCards = recipes
    .map((recipe) => {
      const safeName = escapeHtml(recipe.name)
      const safeCreatorName = escapeHtml(recipe.creatorName)
      const recipeUrl = `${normalizedBaseUrl}/recipes/${recipe.id}`
      const safeRecipeUrl = escapeHtml(recipeUrl)
      const safeImageUrl = recipe.image_url ? escapeHtml(recipe.image_url) : null
      const safeSourceUrl = recipe.source_url ? escapeHtml(recipe.source_url) : null
      const safeVideoUrl = recipe.video_url ? escapeHtml(recipe.video_url) : null

      const ingredientsHtml = splitLines(recipe.ingredients)
      const preparationHtml = splitLines(recipe.preparation)

      return `
        <tr>
          <td style="padding:0 0 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
              ${safeImageUrl ? `
              <tr>
                <td style="padding:0;">
                  <img src="${safeImageUrl}" alt="${safeName}" style="display:block;width:100%;max-height:280px;object-fit:cover;" />
                </td>
              </tr>` : ""}
              <tr>
                <td style="padding:24px;">
                  <h2 style="margin:0 0 10px;font-size:22px;color:#111827;font-family:Arial,sans-serif;">${safeName}</h2>
                  <p style="margin:0 0 12px;color:#475569;font-family:Arial,sans-serif;">Creada por <strong>${safeCreatorName}</strong></p>
                  <p style="margin:0 0 16px;color:#111827;font-family:Arial,sans-serif;">
                    ${recipe.calories != null ? `<span style="margin-right:16px;"><strong>Calorías:</strong> ${recipe.calories}</span>` : ""}
                    ${recipe.categoryNames.length > 0 ? `<span><strong>Categorías:</strong> ${escapeHtml(recipe.categoryNames.join(", "))}</span>` : ""}
                  </p>
                  <p style="margin:0 0 18px;">
                    <a href="${safeRecipeUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:999px;font-family:Arial,sans-serif;font-weight:600;">Abrir receta</a>
                  </p>
                  ${(safeSourceUrl || safeVideoUrl) ? `
                  <p style="margin:0 0 18px;font-family:Arial,sans-serif;">
                    ${safeSourceUrl ? `<a href="${safeSourceUrl}" style="color:#2563eb;text-decoration:none;margin-right:16px;">Fuente original</a>` : ""}
                    ${safeVideoUrl ? `<a href="${safeVideoUrl}" style="color:#2563eb;text-decoration:none;">Vídeo</a>` : ""}
                  </p>` : ""}
                  <h3 style="margin:0 0 10px;font-size:17px;color:#111827;font-family:Arial,sans-serif;">Ingredientes</h3>
                  ${
                    ingredientsHtml.length > 0
                      ? `<ul style="margin:0 0 20px;padding-left:20px;color:#374151;font-family:Arial,sans-serif;">${ingredientsHtml
                          .map((line) => `<li style="margin:0 0 7px;">${escapeHtml(line)}</li>`)
                          .join("")}</ul>`
                      : `<p style="margin:0 0 20px;color:#6b7280;font-family:Arial,sans-serif;">No informados.</p>`
                  }
                  <h3 style="margin:0 0 10px;font-size:17px;color:#111827;font-family:Arial,sans-serif;">Preparación</h3>
                  ${
                    preparationHtml.length > 0
                      ? `<ol style="margin:0;padding-left:20px;color:#374151;font-family:Arial,sans-serif;">${preparationHtml
                          .map((line) => `<li style="margin:0 0 9px;">${escapeHtml(line)}</li>`)
                          .join("")}</ol>`
                      : `<p style="margin:0;color:#6b7280;font-family:Arial,sans-serif;">No informada.</p>`
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    })
    .join("")

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recetas compartidas</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:760px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 28px rgba(17,24,39,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px;">
                <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;font-family:Arial,sans-serif;">MenuPlanner</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;font-family:Arial,sans-serif;">Recetas compartidas</h1>
                <p style="margin:12px 0 0;color:#e2e8f0;font-size:16px;font-family:Arial,sans-serif;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  ${recipeCards}
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
                <p style="margin:0 0 8px;color:#0f172a;font-size:13px;font-weight:600;">MenuPlanner · Ideas para tu próximo menú</p>
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
                  Recibes este correo porque tienes una cuenta en la app.
                  Esperamos que alguna de estas recetas te sirva para inspirar tu próxima comida.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return {
    subject: recipes.length === 1 ? `Receta compartida: ${recipes[0].name}` : `Recetas compartidas (${recipes.length})`,
    text,
    html,
  }
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Configuración de Supabase incompleta")
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function ensureAdmin() {
  const admin = await isAdmin(undefined as any)
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  return null
}

export async function GET() {
  try {
    const forbidden = await ensureAdmin()
    if (forbidden) return forbidden

    const supabase = getServiceClient()
    const [{ data: recipes, error: recipesError }, { data: users, error: usersError }] = await Promise.all([
      supabase.from("recipes").select("id, name, created_at, calories").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_profiles").select("id, email, alias, full_name, role").order("email", { ascending: true }),
    ])

    if (recipesError) {
      return NextResponse.json({ error: recipesError.message }, { status: 500 })
    }

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    return NextResponse.json({
      recipes: (recipes ?? []).map((recipe: any) => ({
        id: Number(recipe.id),
        name: recipe.name ?? "Receta sin título",
        created_at: recipe.created_at ?? null,
        calories: recipe.calories ?? null,
      })),
      users: (users ?? [])
        .map((user: any) => ({
          id: user.id,
          email: user.email ?? "",
          alias: user.alias ?? null,
          full_name: user.full_name ?? null,
          role: user.role ?? null,
        }))
        .filter((user: any) => EMAIL_REGEX.test(user.email)),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const forbidden = await ensureAdmin()
    if (forbidden) return forbidden

    const body = await request.json().catch(() => null)
    const recipeIds = Array.isArray(body?.recipeIds) ? body.recipeIds : []
    const recipientIds = Array.isArray(body?.recipientIds) ? body.recipientIds : []

    const normalizedRecipeIds = Array.from(
      new Set(
        recipeIds
          .map((id: unknown) => Number.parseInt(String(id), 10))
          .filter((id: number) => Number.isFinite(id))
      )
    )
    const normalizedRecipientIds = Array.from(
      new Set(recipientIds.map((id: unknown) => String(id).trim()).filter(Boolean))
    )

    if (normalizedRecipeIds.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos una receta." }, { status: 400 })
    }

    if (normalizedRecipientIds.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un usuario." }, { status: 400 })
    }

    const supabase = getServiceClient()

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : undefined
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD
    const smtpSecure = process.env.SMTP_SECURE === "true"
    const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFrom) {
      return NextResponse.json(
        { error: "SMTP no configurado. Añade SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM_EMAIL." },
        { status: 500 }
      )
    }

    const [{ data: recipientRows, error: recipientsError }, { data: recipeRows, error: recipesError }, { data: categoriesRows, error: categoriesError }] =
      await Promise.all([
        supabase.from("user_profiles").select("id, email").in("id", normalizedRecipientIds),
        supabase
          .from("recipes")
          .select("id, name, ingredients, preparation, calories, image_url, video_url, source_url, user_id")
          .in("id", normalizedRecipeIds),
        supabase
          .from("recipe_categories")
          .select("recipe_id, categories(name)")
          .in("recipe_id", normalizedRecipeIds),
      ])

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 500 })
    }

    if (recipesError) {
      return NextResponse.json({ error: recipesError.message }, { status: 500 })
    }

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }

    const recipientEmails = Array.from(
      new Set(
        (recipientRows ?? [])
          .map((user: any) => (typeof user?.email === "string" ? user.email.trim().toLowerCase() : ""))
          .filter((email: string) => EMAIL_REGEX.test(email))
      )
    )

    if (recipientEmails.length === 0) {
      return NextResponse.json({ error: "No hay destinatarios válidos." }, { status: 400 })
    }

    const creatorIds = Array.from(new Set((recipeRows ?? []).map((recipe: any) => recipe.user_id).filter(Boolean)))
    const { data: creatorRows } = creatorIds.length > 0
      ? await supabase.from("user_profiles").select("id, email, alias, full_name").in("id", creatorIds)
      : { data: [] }

    const creatorMap = new Map(
      (creatorRows ?? []).map((row: any) => [
        row.id,
        row.alias || row.full_name || row.email || "Un usuario",
      ])
    )

    const categoryMap = new Map<number, string[]>()
    for (const row of categoriesRows ?? []) {
      const recipeId = Number((row as any)?.recipe_id)
      const categoryName = (row as any)?.categories?.name
      if (!Number.isFinite(recipeId) || typeof categoryName !== "string" || !categoryName.trim()) continue
      const existing = categoryMap.get(recipeId) ?? []
      existing.push(categoryName.trim())
      categoryMap.set(recipeId, existing)
    }

    const selectedRecipes = (recipeRows ?? []).map((recipe: any) => ({
      id: Number(recipe.id),
      name: recipe.name ?? "Receta sin título",
      ingredients: recipe.ingredients ?? "",
      preparation: recipe.preparation ?? "",
      calories: recipe.calories != null ? Number(recipe.calories) : null,
      image_url: recipe.image_url ?? null,
      video_url: recipe.video_url ?? null,
      source_url: recipe.source_url ?? null,
      categoryNames: categoryMap.get(Number(recipe.id)) ?? [],
      creatorName: creatorMap.get(recipe.user_id) ?? "Un usuario",
    }))

    if (selectedRecipes.length === 0) {
      return NextResponse.json({ error: "No se encontraron las recetas seleccionadas." }, { status: 404 })
    }

    const origin = request.headers.get("origin")
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || new URL(request.url).origin
    const { subject, text, html } = buildRecipesDigestEmail({
      recipes: selectedRecipes,
      baseUrl,
    })

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })

    await transporter.sendMail({
      from: {
        name: "MenuPlanner",
        address: smtpFrom,
      },
      to: smtpFrom,
      bcc: recipientEmails.join(", "),
      subject,
      text,
      html,
    })

    return NextResponse.json({
      success: true,
      message: `Email enviado a ${recipientEmails.length} usuario(s) con ${selectedRecipes.length} receta(s).`,
      recipientCount: recipientEmails.length,
      recipeCount: selectedRecipes.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 })
  }
}
