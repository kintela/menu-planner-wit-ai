import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
      .select("id")
      .eq("weekly_menu_id", menu.id)
      .limit(1)

    if (itemsError) {
      console.error("[Share Weekly Menu] Error comprobando items:", itemsError)
      return NextResponse.json({ error: "No se pudo verificar el contenido del menú." }, { status: 500 })
    }

    if (!menuItems?.length) {
      return NextResponse.json({ error: "El menú está vacío. Añade recetas antes de compartirlo." }, { status: 400 })
    }

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

    const requestUrl = new URL(req.url)
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || `${requestUrl.protocol}//${requestUrl.host}`
    const shareLink = `${origin}/weekly-menu/${normalizedWeekStart}`

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
        `Puedes consultarlo iniciando sesión en MenuPlanner: ${shareLink}`,
        ``,
        `¡Buen provecho!`,
      ].join("\n")

      const htmlBody = `
        <p>Hola,</p>
        <p><strong>${senderName}</strong> ha compartido contigo su menú semanal ${weekSummary}.</p>
        <p>Puedes consultarlo iniciando sesión en MenuPlanner:</p>
        <p><a href="${shareLink}" rel="noopener noreferrer" target="_blank">${shareLink}</a></p>
        <p>¡Buen provecho!</p>
      `

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
