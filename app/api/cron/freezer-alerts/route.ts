import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { format, subMonths } from "date-fns"
import { isAdmin } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const APP_NAME = "MenuPlanner"
const DEFAULT_RECIPIENTS = ["roberto.quintela@protonmail.com", "soniamuga@yahoo.es"]

type RawDrawer = {
  id?: string | null
  nombre?: string | null
  posicion?: number | null
  congelador_id?: string | null
  congeladores?: { id?: string | null; usuario_id?: string | null } | { id?: string | null; usuario_id?: string | null }[] | null
}

type RawItem = {
  id: string
  nombre: string
  cantidad?: number | null
  unidad?: string | null
  categoria?: string | null
  estado?: string | null
  fecha_congelacion?: string | null
  fecha_caducidad?: string | null
  cajon_id?: string | null
  cajones_congelador?: RawDrawer | null
}

type AlertItem = {
  id: string
  nombre: string
  cantidad?: number | null
  unidad?: string | null
  categoria?: string | null
  estado?: string | null
  fecha_congelacion?: string | null
  fecha_caducidad?: string | null
  cajon?: {
    id?: string | null
    nombre?: string | null
    posicion?: number | null
    congelador_id?: string | null
    usuario_id?: string | null
  } | null
}

const isTruthyHeader = (value: string | null) => {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

const isCronRequest = (req: NextRequest) => {
  if (isTruthyHeader(req.headers.get("x-vercel-cron"))) return true
  if (isTruthyHeader(req.headers.get("X-Vercel-Cron"))) return true
  const userAgent = req.headers.get("user-agent") ?? ""
  return userAgent.toLowerCase().includes("vercel cron")
}

const parseRecipients = () => {
  const raw = process.env.FREEZER_ALERT_RECIPIENTS
  const list = (raw ? raw.split(",") : DEFAULT_RECIPIENTS)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(list))
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const formatHumanDate = (value?: string | null) => {
  if (!value) return "-"
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`))
  } catch {
    return value
  }
}

const getOwnerId = (drawer?: RawDrawer | null) => {
  if (!drawer?.congeladores) return null
  const data = drawer.congeladores
  if (Array.isArray(data)) {
    return data[0]?.usuario_id ?? null
  }
  return data.usuario_id ?? null
}

const normalizeItem = (item: RawItem): AlertItem => ({
  id: item.id,
  nombre: item.nombre,
  cantidad: item.cantidad ?? null,
  unidad: item.unidad ?? null,
  categoria: item.categoria ?? null,
  estado: item.estado ?? null,
  fecha_congelacion: item.fecha_congelacion ?? null,
  fecha_caducidad: item.fecha_caducidad ?? null,
  cajon: item.cajones_congelador
    ? {
        id: item.cajones_congelador.id ?? null,
        nombre: item.cajones_congelador.nombre ?? null,
        posicion: item.cajones_congelador.posicion ?? null,
        congelador_id: item.cajones_congelador.congelador_id ?? null,
        usuario_id: getOwnerId(item.cajones_congelador),
      }
    : null,
})

const formatQuantity = (cantidad?: number | null, unidad?: string | null) => {
  if (cantidad === null || cantidad === undefined) return "-"
  const qty = Number.isFinite(cantidad) ? `${cantidad}` : String(cantidad)
  const unit = unidad ? ` ${unidad}` : ""
  return `${qty}${unit}`.trim()
}

const resolveBaseUrl = (req: NextRequest) => {
  const requestUrl = new URL(req.url)
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  return envBase && envBase.length > 0 ? envBase : `${requestUrl.protocol}//${requestUrl.host}`
}

const buildEmailContent = (items: AlertItem[], thresholdDate: string, months: number, baseUrl: string) => {
  const title = `Elementos congelados ${months} meses o mas`
  const intro = `Se encontraron ${items.length} elementos que llevan ${months} meses o mas congelados.`
  const safeBaseUrl = baseUrl?.trim() ? baseUrl.trim().replace(/\/$/, "") : ""

  const lines = items.map((item) => {
    const drawerLabel = item.cajon?.nombre
      ? `Cajon: ${item.cajon.nombre}${item.cajon.posicion ? ` (pos. ${item.cajon.posicion})` : ""}`
      : "Cajon: -"
    const qtyLabel = `Cantidad: ${formatQuantity(item.cantidad, item.unidad)}`
    const dateLabel = `Congelado: ${formatHumanDate(item.fecha_congelacion)}`
    const categoryLabel = item.categoria ? `Categoria: ${item.categoria}` : "Categoria: -"
    return `- ${item.nombre} | ${dateLabel} | ${drawerLabel} | ${qtyLabel} | ${categoryLabel}`
  })

  const footerText = safeBaseUrl ? `\n\n${APP_NAME}: ${safeBaseUrl}` : ""
  const text = `${APP_NAME}\n${title}\n${intro}\n\n${lines.join("\n")}${footerText}`

  const rows = items
    .map((item) => {
      const drawerLabel = item.cajon?.nombre
        ? `${item.cajon.nombre}${item.cajon.posicion ? ` (pos. ${item.cajon.posicion})` : ""}`
        : "-"
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.nombre)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(formatHumanDate(item.fecha_congelacion))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(drawerLabel)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(formatQuantity(item.cantidad, item.unidad))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.categoria ?? "-")}</td>
      </tr>`
    })
    .join("")

  const headerLink = safeBaseUrl || "#"
  const html = `
    <div style="font-family:Arial, sans-serif; background:#f3f4f6; padding:24px;">
      <div style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
        <div style="background:#111827; padding:16px 24px;">
          <a href="${escapeHtml(headerLink)}" style="color:#ffffff; font-size:20px; font-weight:700; text-decoration:none;">${escapeHtml(APP_NAME)}</a>
        </div>
        <div style="padding:20px 24px; color:#111827;">
          <h2 style="margin:0 0 8px;">${escapeHtml(title)}</h2>
          <p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6; text-align:left;">
                <th style="padding:8px 10px;">Producto</th>
                <th style="padding:8px 10px;">Fecha congelacion</th>
                <th style="padding:8px 10px;">Cajon</th>
                <th style="padding:8px 10px;">Cantidad</th>
                <th style="padding:8px 10px;">Categoria</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="padding:12px 24px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
          <a href="${escapeHtml(headerLink)}" style="color:#2563eb; text-decoration:none;">${escapeHtml(APP_NAME)}</a>
        </div>
      </div>
    </div>
  `

  return {
    subject: `[Congelador] ${items.length} elementos con ${months}+ meses`,
    text,
    html,
  }
}

const buildTestEmailContent = (baseUrl: string) => {
  const checkedAt = new Date().toISOString()
  const subject = "[Congelador] Email de prueba"
  const safeBaseUrl = baseUrl?.trim() ? baseUrl.trim().replace(/\/$/, "") : ""
  const footerText = safeBaseUrl ? `\n\n${APP_NAME}: ${safeBaseUrl}` : ""
  const text = `${APP_NAME}\nEmail de prueba enviado correctamente.\nHora: ${checkedAt}${footerText}`
  const html = `
    <div style="font-family:Arial, sans-serif; background:#f3f4f6; padding:24px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
        <div style="background:#111827; padding:16px 24px;">
          <a href="${escapeHtml(safeBaseUrl || "#")}" style="color:#ffffff; font-size:20px; font-weight:700; text-decoration:none;">${escapeHtml(APP_NAME)}</a>
        </div>
        <div style="padding:20px 24px; color:#111827;">
          <h2 style="margin:0 0 8px;">Email de prueba</h2>
          <p style="margin:0;">Si ves este mensaje, la configuracion SMTP funciona.</p>
          <p style="margin:12px 0 0; color:#6b7280; font-size:12px;">Hora: ${escapeHtml(checkedAt)}</p>
        </div>
        <div style="padding:12px 24px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
          <a href="${escapeHtml(safeBaseUrl || "#")}" style="color:#2563eb; text-decoration:none;">${escapeHtml(APP_NAME)}</a>
        </div>
      </div>
    </div>
  `
  return { subject, text, html }
}

async function handleRequest(
  req: NextRequest,
  { dryRun, testEmail }: { dryRun: boolean; testEmail: boolean },
) {
  const cron = isCronRequest(req)
  const admin = await isAdmin()

  if (!cron && !admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const monthsEnv = Number(process.env.FREEZER_ALERT_MONTHS ?? 2)
  const alertMonths = Number.isFinite(monthsEnv) && monthsEnv > 0 ? monthsEnv : 2
  const thresholdDate = format(subMonths(new Date(), alertMonths), "yyyy-MM-dd")
  const baseUrl = resolveBaseUrl(req)

  const recipients = parseRecipients()

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No hay destinatarios configurados" }, { status: 500 })
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT ?? 587)
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD
  const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser

  const basePayload = {
    ok: true,
    checkedAt: new Date().toISOString(),
    thresholdDate,
    alertMonths,
    sent: false,
    dryRun,
    recipients,
    items: [] as AlertItem[],
  }

  if (testEmail) {
    if (dryRun) {
      return NextResponse.json({ ...basePayload, message: "Prueba preparada (sin envio)." })
    }

    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
      return NextResponse.json(
        {
          ...basePayload,
          error: "SMTP no configurado. Define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM_EMAIL.",
        },
        { status: 500 },
      )
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    })

    const { subject, text, html } = buildTestEmailContent(baseUrl)

    await transporter.sendMail({
      from: smtpFrom,
      to: recipients.join(", "),
      subject,
      text,
      html,
    })

    return NextResponse.json({ ...basePayload, sent: true, message: "Email de prueba enviado correctamente." })
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Configuracion de Supabase incompleta" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from("elementos_cajon")
    .select(
      `
        id,
        nombre,
        cantidad,
        unidad,
        categoria,
        estado,
        fecha_congelacion,
        fecha_caducidad,
        cajon_id,
        cajones_congelador (
          id,
          nombre,
          posicion,
          congelador_id,
          congeladores (
            id,
            usuario_id
          )
        )
      `,
    )
    .not("fecha_congelacion", "is", null)
    .lte("fecha_congelacion", thresholdDate)
    .order("fecha_congelacion", { ascending: true })

  if (error) {
    console.error("[freezer-alerts] Error fetching items:", error)
    return NextResponse.json({ error: "No se pudo obtener los elementos del congelador" }, { status: 500 })
  }

  const items = (data ?? []).map((item) => normalizeItem(item as RawItem))
  const payload = {
    ...basePayload,
    totalItems: (data ?? []).length,
    eligibleItems: items.length,
    items,
  }

  if (items.length === 0) {
    return NextResponse.json({ ...payload, message: "Sin elementos que superen el umbral." })
  }

  if (dryRun) {
    return NextResponse.json({ ...payload, message: "Ejecucion en modo prueba (sin envio)." })
  }

  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
    return NextResponse.json(
      {
        ...payload,
        error: "SMTP no configurado. Define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM_EMAIL.",
      },
      { status: 500 },
    )
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  })

  const { subject, text, html } = buildEmailContent(items, thresholdDate, alertMonths, baseUrl)

  await transporter.sendMail({
    from: smtpFrom,
    to: recipients.join(", "),
    subject,
    text,
    html,
  })

  return NextResponse.json({ ...payload, sent: true, message: "Email enviado correctamente." })
}

export async function GET(req: NextRequest) {
  const dryRunParam = new URL(req.url).searchParams.get("dryRun")
  const testParam = new URL(req.url).searchParams.get("testEmail")
  const dryRun = dryRunParam === "1" || dryRunParam === "true"
  const testEmail = testParam === "1" || testParam === "true"
  return handleRequest(req, { dryRun, testEmail })
}

export async function POST(req: NextRequest) {
  let body: { dryRun?: boolean; testEmail?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  return handleRequest(req, { dryRun: Boolean(body.dryRun), testEmail: Boolean(body.testEmail) })
}
