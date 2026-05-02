import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

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

function buildRecipeEmail({
  recipeId,
  recipeName,
  ingredients,
  preparation,
  calories,
  imageUrl,
  sourceUrl,
  videoUrl,
  categoryNames,
  recipeUrl,
  creatorName,
}: {
  recipeId: number
  recipeName: string
  ingredients: string
  preparation: string
  calories: number | null
  imageUrl: string | null
  sourceUrl: string | null
  videoUrl: string | null
  categoryNames: string[]
  recipeUrl: string
  creatorName: string
}) {
  const ingredientsList = splitLines(ingredients)
  const preparationList = splitLines(preparation)
  const safeRecipeName = escapeHtml(recipeName)
  const safeCreatorName = escapeHtml(creatorName)
  const safeRecipeUrl = escapeHtml(recipeUrl)
  const safeImageUrl = imageUrl ? escapeHtml(imageUrl) : null
  const safeSourceUrl = sourceUrl ? escapeHtml(sourceUrl) : null
  const safeVideoUrl = videoUrl ? escapeHtml(videoUrl) : null
  const categoriesLine = categoryNames.length > 0 ? categoryNames.join(", ") : null

  const text = [
    `Se ha añadido una nueva receta en MenuPlanner.`,
    ``,
    `Nombre: ${recipeName}`,
    `Creada por: ${creatorName}`,
    calories != null ? `Calorías: ${calories}` : null,
    categoriesLine ? `Categorías: ${categoriesLine}` : null,
    ``,
    `Ingredientes:`,
    ...(ingredientsList.length > 0 ? ingredientsList.map((line) => `- ${line}`) : ["- No informados"]),
    ``,
    `Preparación:`,
    ...(preparationList.length > 0 ? preparationList.map((line, index) => `${index + 1}. ${line}`) : ["- No informada"]),
    ``,
    `Ver receta: ${recipeUrl}`,
    sourceUrl ? `Fuente original: ${sourceUrl}` : null,
    videoUrl ? `Vídeo: ${videoUrl}` : null,
    `ID receta: ${recipeId}`,
    ``,
    `---`,
    `Recibes este aviso porque estás registrado en MenuPlanner.`,
    `Guarda esta receta para el próximo menú o compártela con quien quieras cocinar.`,
  ]
    .filter(Boolean)
    .join("\n")

  const ingredientsHtml =
    ingredientsList.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:#374151;">${ingredientsList
          .map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`)
          .join("")}</ul>`
      : `<p style="margin:0;color:#6b7280;">No informados.</p>`

  const preparationHtml =
    preparationList.length > 0
      ? `<ol style="margin:0;padding-left:20px;color:#374151;">${preparationList
          .map((line) => `<li style="margin:0 0 10px;">${escapeHtml(line)}</li>`)
          .join("")}</ol>`
      : `<p style="margin:0;color:#6b7280;">No informada.</p>`

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nueva receta: ${safeRecipeName}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 28px rgba(17,24,39,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px;">
                <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;font-family:Arial,sans-serif;">MenuPlanner</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;font-family:Arial,sans-serif;">Nueva receta añadida</h1>
                <p style="margin:12px 0 0;color:#e2e8f0;font-size:16px;font-family:Arial,sans-serif;">${safeCreatorName} ha añadido <strong>${safeRecipeName}</strong>.</p>
              </td>
            </tr>
            ${safeImageUrl ? `
            <tr>
              <td style="padding:24px 32px 0;">
                <img src="${safeImageUrl}" alt="${safeRecipeName}" style="display:block;width:100%;max-height:320px;object-fit:cover;border-radius:16px;" />
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:24px 32px 32px;font-family:Arial,sans-serif;color:#111827;">
                <div style="margin:0 0 20px;">
                  <a href="${safeRecipeUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">Abrir receta</a>
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 10px;color:#6b7280;font-size:14px;">Nombre</td>
                    <td style="padding:0 0 10px;color:#111827;font-size:14px;font-weight:600;">${safeRecipeName}</td>
                  </tr>
                  ${calories != null ? `
                  <tr>
                    <td style="padding:0 0 10px;color:#6b7280;font-size:14px;">Calorías</td>
                    <td style="padding:0 0 10px;color:#111827;font-size:14px;font-weight:600;">${calories}</td>
                  </tr>` : ""}
                  ${categoriesLine ? `
                  <tr>
                    <td style="padding:0 0 10px;color:#6b7280;font-size:14px;">Categorías</td>
                    <td style="padding:0 0 10px;color:#111827;font-size:14px;font-weight:600;">${escapeHtml(categoriesLine)}</td>
                  </tr>` : ""}
                  ${safeSourceUrl ? `
                  <tr>
                    <td style="padding:0 0 10px;color:#6b7280;font-size:14px;">Fuente original</td>
                    <td style="padding:0 0 10px;"><a href="${safeSourceUrl}" style="color:#2563eb;text-decoration:none;">Ver fuente</a></td>
                  </tr>` : ""}
                  ${safeVideoUrl ? `
                  <tr>
                    <td style="padding:0 0 10px;color:#6b7280;font-size:14px;">Vídeo</td>
                    <td style="padding:0 0 10px;"><a href="${safeVideoUrl}" style="color:#2563eb;text-decoration:none;">Ver vídeo</a></td>
                  </tr>` : ""}
                </table>
                <div style="margin:0 0 24px;">
                  <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Ingredientes</h2>
                  ${ingredientsHtml}
                </div>
                <div>
                  <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Preparación</h2>
                  ${preparationHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
                <p style="margin:0 0 8px;color:#0f172a;font-size:13px;font-weight:600;">MenuPlanner · Tu recetario compartido</p>
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
                  Recibes este aviso porque estás registrado en la app.
                  Guarda esta receta para el próximo menú o compártela con quien quieras cocinar.
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
    subject: `Nueva receta en MenuPlanner: ${recipeName}`,
    text,
    html,
  }
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuración de Supabase incompleta' }, { status: 500 })
    }

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

    const { name, ingredients = '', preparation = '', image_url = null, video_url = null, source_url = null, calories = null, is_ai_generated = false, user_id, categories = [] } = body || {}

    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })
    if (!name || !name.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const recipeInsert = {
      name: name.trim(),
      ingredients: ingredients || '',
      preparation: preparation || '',
      image_url,
      video_url,
      source_url,
      calories: calories ? Number.parseInt(calories) : null,
      is_ai_generated: !!is_ai_generated,
      user_id,
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    let insertRes
    try {
      insertRes = await Promise.race([
        supabase.from('recipes').insert(recipeInsert).select('id').single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout insert receta (server)')), 15000)),
      ])
    } catch (e: any) {
      if (e?.message?.includes('Timeout')) return NextResponse.json({ error: e.message }, { status: 504 })
      return NextResponse.json({ error: 'Error interno insertando receta' }, { status: 500 })
    }

    const { data, error } = insertRes as any
    if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    if (!data?.id) return NextResponse.json({ error: 'Receta creada sin ID' }, { status: 500 })
    const recipeId = data.id

    let categoriesInserted = 0
    let categoryNames: string[] = []
    if (Array.isArray(categories) && categories.length > 0) {
      const rels = categories.map((cid: number) => ({ recipe_id: recipeId, category_id: cid }))
      const { error: catErr } = await supabase.from('recipe_categories').insert(rels)
      if (!catErr) categoriesInserted = rels.length

      const normalizedCategoryIds = categories
        .map((cid: unknown) => Number.parseInt(String(cid), 10))
        .filter((cid: number) => Number.isFinite(cid))

      if (normalizedCategoryIds.length > 0) {
        const { data: categoryRows } = await supabase
          .from('categories')
          .select('name')
          .in('id', normalizedCategoryIds)

        categoryNames = (categoryRows ?? [])
          .map((row: any) => (typeof row?.name === 'string' ? row.name.trim() : ''))
          .filter(Boolean)
      }
    }

    let notificationEmailSent = false
    let notificationEmailError: string | null = null

    try {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('email')

      const recipientEmails = Array.from(
        new Set(
          (profiles ?? [])
            .map((profile: any) => (typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : ''))
            .filter((email: string) => EMAIL_REGEX.test(email))
        )
      )

      const smtpHost = process.env.SMTP_HOST
      const smtpPort = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : undefined
      const smtpUser = process.env.SMTP_USER
      const smtpPassword = process.env.SMTP_PASSWORD
      const smtpSecure = process.env.SMTP_SECURE === 'true'
      const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser

      if (recipientEmails.length > 0 && smtpHost && smtpPort && smtpUser && smtpPassword && smtpFrom) {
        const { data: creatorProfile } = await supabase
          .from('user_profiles')
          .select('alias, full_name, email')
          .eq('id', user_id)
          .maybeSingle()

        const creatorName =
          creatorProfile?.alias ||
          creatorProfile?.full_name ||
          creatorProfile?.email ||
          'Un usuario'

        const origin = request.headers.get('origin')
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || new URL(request.url).origin
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        const recipeUrl = `${normalizedBaseUrl}/recipes/${recipeId}`

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        })

        const { subject, text, html } = buildRecipeEmail({
          recipeId,
          recipeName: recipeInsert.name,
          ingredients: recipeInsert.ingredients,
          preparation: recipeInsert.preparation,
          calories: recipeInsert.calories,
          imageUrl: recipeInsert.image_url,
          sourceUrl: recipeInsert.source_url,
          videoUrl: recipeInsert.video_url,
          categoryNames,
          recipeUrl,
          creatorName,
        })

        await transporter.sendMail({
          from: {
            name: 'MenuPlanner',
            address: smtpFrom,
          },
          to: smtpFrom,
          bcc: recipientEmails.join(', '),
          subject,
          text,
          html,
        })

        notificationEmailSent = true
      } else if (recipientEmails.length === 0) {
        notificationEmailError = 'No hay destinatarios válidos en user_profiles.'
      } else {
        notificationEmailError = 'SMTP no configurado para notificaciones de recetas.'
      }
    } catch (emailError: any) {
      console.error('[recipes][POST] Error enviando notificación por email:', emailError)
      notificationEmailError = emailError?.message || 'No se pudo enviar el email de notificación.'
    }

    return NextResponse.json({
      success: true,
      recipe_id: recipeId,
      categories: categoriesInserted,
      notification_email_sent: notificationEmailSent,
      notification_email_error: notificationEmailError,
      ms: Date.now() - started
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true }) }
