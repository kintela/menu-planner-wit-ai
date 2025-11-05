import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_LABELS: Record<string, Record<number, string>> = {
  comida: {
    1: "Primer plato",
    2: "Segundo plato",
  },
  cena: {
    1: "Cena",
    2: "Cena",
  },
}

const parseDayIndex = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return 0
}

const capitalize = (value: string) => {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

function prepareMenuForEmail(menuItems: any[], baseUrl: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

  const getMealSortKey = (mealType: string, dishOrder?: number | null) => {
    if (mealType === "comida") {
      if (dishOrder === 1) return 1
      if (dishOrder === 2) return 2
      return 2.5 + (dishOrder ?? 0) / 10
    }
    if (mealType === "cena") {
      return 3
    }
    return 10 + (dishOrder ?? 0)
  }

  const grouped = DAYS.map((dayName, dayIndex) => {
    const itemsForDay = (menuItems ?? []).filter((item) => parseDayIndex(item.day_of_week) === dayIndex)
    const normalizedItems = [...itemsForDay].sort((a, b) => {
      const mealTypeA = typeof a.meal_type === "string" ? a.meal_type : ""
      const dishOrderRawA =
        typeof a.dish_order === "number"
          ? a.dish_order
          : typeof a.dish_order === "string"
            ? Number.parseInt(a.dish_order, 10)
            : undefined
      const dishOrderA = Number.isNaN(dishOrderRawA) ? undefined : dishOrderRawA
      const mealTypeB = typeof b.meal_type === "string" ? b.meal_type : ""
      const dishOrderRawB =
        typeof b.dish_order === "number"
          ? b.dish_order
          : typeof b.dish_order === "string"
            ? Number.parseInt(b.dish_order, 10)
            : undefined
      const dishOrderB = Number.isNaN(dishOrderRawB) ? undefined : dishOrderRawB

      return getMealSortKey(mealTypeA, dishOrderA) - getMealSortKey(mealTypeB, dishOrderB)
    }).map((item) => {
      const mealType = typeof item.meal_type === "string" ? item.meal_type : ""
      const dishOrderRaw =
        typeof item.dish_order === "number"
          ? item.dish_order
          : typeof item.dish_order === "string"
            ? Number.parseInt(item.dish_order, 10)
            : undefined
      const dishOrder = Number.isNaN(dishOrderRaw) ? undefined : dishOrderRaw
      const label =
        (mealType && dishOrder ? MEAL_LABELS[mealType]?.[dishOrder] : undefined) ??
        `${capitalize(mealType || "Plato")} ${dishOrder ?? ""}`.trim()

      const recipe = item.recipes ?? {}
      const rawName = typeof recipe.name === "string" ? recipe.name.trim() : ""
      const recipeName = rawName.length > 0 ? rawName : "Receta sin título"

      const recipeIdRaw =
        typeof item.recipe_id === "number"
          ? item.recipe_id
          : typeof item.recipe_id === "string"
            ? Number.parseInt(item.recipe_id, 10)
            : null
      const recipeId = Number.isNaN(recipeIdRaw ?? NaN) ? null : recipeIdRaw
      const recipeLink = recipeId ? `${normalizedBase}/recipes/${recipeId}` : null

      const caloriesRaw =
        typeof recipe.calories === "number"
          ? recipe.calories
          : typeof recipe.calories === "string"
            ? Number.parseFloat(recipe.calories)
            : null
      const calories = Number.isFinite(caloriesRaw ?? NaN) ? Math.round(caloriesRaw ?? 0) : null

      return {
        label,
        recipeName,
        calories,
        recipeLink,
      }
    })

    return {
      dayName,
      items: normalizedItems,
    }
  })

  const plainSummary = grouped
    .map(({ dayName, items }) => {
      const lines =
        items.length > 0
          ? items.map((item) => {
              const caloriesFragment = typeof item.calories === "number" ? ` (${item.calories} kcal)` : ""
              const linkFragment = item.recipeLink ? ` -> ${item.recipeLink}` : ""
              return `  - ${item.label}: ${item.recipeName}${caloriesFragment}${linkFragment}`
            })
          : ["  - Sin platos guardados."]
      return [`${dayName}:`, ...lines].join("\n")
    })
    .join("\n\n")

  const htmlSummary = grouped
    .map(({ dayName, items }) => {
      const itemsHtml =
        items.length > 0
          ? items
              .map((item) => {
                const caloriesFragment =
                  typeof item.calories === "number"
                    ? `<span style="color:#6b7280;"> (${item.calories.toLocaleString("es-ES")} kcal)</span>`
                    : ""
                const recipeNameHtml = item.recipeLink
                  ? `<a href="${escapeHtml(item.recipeLink)}" style="color:#2563eb;text-decoration:none;" target="_blank" rel="noopener noreferrer">${escapeHtml(item.recipeName)}</a>`
                  : `<span style="color:#1f2937;">${escapeHtml(item.recipeName)}</span>`
                return `<li style="margin:6px 0;">
                    <span style="font-weight:600;color:#111827;">${escapeHtml(item.label)}:</span>
                    ${recipeNameHtml}${caloriesFragment}
                  </li>`
              })
              .join("")
          : `<li style="margin:6px 0; color:#6b7280;">No hay platos guardados.</li>`

      return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:16px;background-color:#f9fafb;">
        <h3 style="margin:0 0 8px;font-size:16px;color:#0f172a;">${escapeHtml(dayName)}</h3>
        <ul style="margin:0;padding-left:18px;color:#374151;list-style:disc;">${itemsHtml}</ul>
      </div>`
    })
    .join("")

  return {
    plainSummary,
    htmlSummary,
  }
}

function normalizeIsoDate(source: string) {
  const trimmed = source.trim()
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    return null
  }

  const date = new Date(`${match[0]}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return match[0]
}

function formatWeekSpan(start?: string | null, end?: string | null) {
  if (!start) return "la semana seleccionada"
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const formattedStart = formatter.format(new Date(`${start}T00:00:00`))
  if (end) {
    const formattedEnd = formatter.format(new Date(`${end}T00:00:00`))
    return `del ${formattedStart} al ${formattedEnd}`
  }
  return `de la semana que comienza el ${formattedStart}`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    let payload: { recipientEmail?: string; weekStart?: string }
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 })
    }

    const recipientEmail = payload.recipientEmail?.trim().toLowerCase()
    const weekStart = payload.weekStart?.trim()

    if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
      return NextResponse.json({ error: "Introduce un email válido." }, { status: 400 })
    }

    if (!weekStart) {
      return NextResponse.json({ error: "Falta la semana a compartir." }, { status: 400 })
    }

    const normalizedWeekStart = normalizeIsoDate(weekStart)
    if (!normalizedWeekStart) {
      return NextResponse.json({ error: "Formato de fecha de semana inválido." }, { status: 400 })
    }

    const { data: menu, error: menuError } = await supabase
      .from("weekly_menus")
      .select("id, name, start_date, end_date")
      .eq("user_id", user.id)
      .eq("start_date", normalizedWeekStart)
      .maybeSingle()

    if (menuError) {
      console.error("[Share Weekly Menu] Error buscando menú:", menuError)
      return NextResponse.json({ error: "No se pudo localizar el menú solicitado." }, { status: 500 })
    }

    if (!menu) {
      return NextResponse.json({ error: "No hay ningún menú guardado para esa semana." }, { status: 404 })
    }

    const { data: menuItems, error: itemsError } = await supabase
      .from("menu_items")
      .select(
        `
          id,
          day_of_week,
          meal_type,
          dish_order,
          recipe_id,
          recipes (
            id,
            name,
            calories,
            image_url
          )
        `,
      )
      .eq("weekly_menu_id", menu.id)
      .order("day_of_week")
      .order("meal_type")
      .order("dish_order")

    if (itemsError) {
      console.error("[Share Weekly Menu] Error comprobando items:", itemsError)
      return NextResponse.json({ error: "No se pudo verificar el contenido del menú." }, { status: 500 })
    }

    if (!menuItems?.length) {
      return NextResponse.json({ error: "El menú está vacío. Añade recetas antes de compartirlo." }, { status: 400 })
    }

    const requestUrl = new URL(req.url)
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || `${requestUrl.protocol}//${requestUrl.host}`

    const { plainSummary, htmlSummary } = prepareMenuForEmail(menuItems, origin)

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, first_name, last_name, alias")
      .eq("id", user.id)
      .maybeSingle()

    const senderName =
      profile?.alias ||
      profile?.full_name ||
      (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
      user.email ||
      "Alguien"

    const weekSummary = formatWeekSpan(menu.start_date, menu.end_date)

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : undefined
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD
    const smtpSecure = process.env.SMTP_SECURE === "true"
    const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFrom) {
      console.error("[Share Weekly Menu] Faltan variables SMTP.")
      return NextResponse.json(
        {
          error:
            "El servicio de correo no está configurado. Añade SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM_EMAIL.",
        },
        { status: 500 },
      )
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      })

      const subject = `Menú semanal ${weekSummary}`
      const textBody = [
        `Hola,`,
        ``,
        `${senderName} ha compartido contigo su menú semanal ${weekSummary}.`,
        ``,
        plainSummary,
        ``,
        `¡Buen provecho!`,
      ].join("\n")

      const safeSenderName = escapeHtml(senderName)
      const safeWeekSummary = escapeHtml(weekSummary)

      const htmlBody = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Menú semanal ${safeWeekSummary}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 28px rgba(17,24,39,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#111827,#1f2937);padding:32px 36px;">
                <h1 style="margin:0;font-size:26px;color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">MenuPlanner</h1>
                <p style="margin:12px 0 0;font-size:16px;color:#e5e7eb;font-family:'Helvetica Neue',Arial,sans-serif;">${safeSenderName} ha compartido su menú semanal ${safeWeekSummary}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:'Helvetica Neue',Arial,sans-serif;color:#111827;">
                <p style="margin:0 0 16px;">Hola,</p>
                <p style="margin:0 0 24px;color:#374151;">Te enviamos los platos planificados para ${safeWeekSummary}:</p>
                ${htmlSummary}
                <p style="margin:0;color:#111827;">¡Buen provecho!</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#111827;padding:20px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#d1d5db;font-family:'Helvetica Neue',Arial,sans-serif;">Enviado desde MenuPlanner</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

      await transporter.sendMail({
        from: {
          name: senderName,
          address: smtpFrom,
        },
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("[Share Weekly Menu] Error enviando email SMTP:", error)
      return NextResponse.json(
        { error: "No se pudo enviar el email. Revisa la configuración SMTP e inténtalo de nuevo." },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error("[Share Weekly Menu] Error inesperado:", error)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}
