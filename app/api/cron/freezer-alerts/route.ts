import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { isAdmin } from "@/lib/auth"
import { decidirAutorizacion, RESPUESTA_NO_AUTORIZADO } from "@/lib/freezer/freezer-alerts-authorization"
import {
  ejecutarAlertas,
  leerConfiguracionAlertas,
  type DependenciasAlertas,
  type ReclamoAvisos,
} from "@/lib/freezer/freezer-alerts-server-operations"

// Spec 007: adaptador fino. Aquí solo se acredita la petición, se leen
// variables de entorno y se conectan Supabase y el correo; las reglas de
// elegibilidad, aviso y recordatorio y la redacción del correo viven en
// lib/freezer/ y están cubiertas por tests. Esta ruta envía correo real.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resolveBaseUrl = (req: NextRequest) => {
  const requestUrl = new URL(req.url)
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  return envBase && envBase.length > 0 ? envBase : `${requestUrl.protocol}//${requestUrl.host}`
}

// Solo se registra un código identificativo: nunca el mensaje ni el objeto del
// error, que en SMTP o SQL pueden contener credenciales o detalles internos.
const registrarError: NonNullable<DependenciasAlertas["registrarError"]> = (contexto, error) => {
  const codigo = (error as { code?: unknown } | null)?.code
  const nombre = (error as { name?: unknown } | null)?.name
  console.error(`[freezer-alerts] fallo en ${contexto}:`, typeof codigo === "string" ? codigo : typeof nombre === "string" ? nombre : "desconocido")
}

function crearSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) {
    throw Object.assign(new Error("Supabase no configurado"), { code: "SUPABASE_NO_CONFIGURADO" })
  }
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } })
}

function crearDependencias(): DependenciasAlertas {
  let cliente: SupabaseClient | null = null
  const supabase = () => (cliente ??= crearSupabase())
  const avisos = () => supabase().from("avisos_elementos_cajon")

  // Deshace un reclamo propio. Solo toca filas que siguen marcadas con el
  // instante de esta ejecución, de modo que nunca pisa el reclamo de otra.
  const liberar = async (reclamo: ReclamoAvisos, instante: string) => {
    let primerError: unknown = null
    if (reclamo.nuevos.length > 0) {
      const { error } = await avisos().delete().in("elemento_id", reclamo.nuevos).eq("avisado_en", instante)
      if (error) primerError ??= error
    }
    for (const r of reclamo.recordatorios) {
      const { error } = await avisos().update({ avisado_en: r.anterior }).eq("elemento_id", r.id).eq("avisado_en", instante)
      if (error) primerError ??= error
    }
    if (primerError) throw primerError
  }

  return {
    // Spec 005: existe como mucho un congelador (índice único). Si por algún
    // motivo hubiera más de uno no se elige ninguno: ambigüedad = fallo.
    resolverCongelador: async () => {
      const { data, error } = await supabase().from("congeladores").select("id").limit(2)
      if (error) throw error
      if (!data || data.length === 0) return null
      if (data.length > 1) {
        throw Object.assign(new Error("Hay más de un congelador"), { code: "CONGELADOR_AMBIGUO" })
      }
      return data[0].id as string
    },
    leerElementos: async (fechaUmbral, congeladorId) => {
      const { data, error } = await supabase()
        .from("elementos_cajon")
        .select(
          "id, nombre, cantidad, unidad, categoria, estado, fecha_congelacion, fecha_caducidad, cajon_id, cajones_congelador!inner (id, nombre, posicion, congelador_id)",
        )
        .eq("cajones_congelador.congelador_id", congeladorId)
        .not("fecha_congelacion", "is", null)
        .lte("fecha_congelacion", fechaUmbral)
        .order("fecha_congelacion", { ascending: true })
      if (error) throw error
      return data ?? []
    },
    leerAvisos: async () => {
      const { data, error } = await avisos().select("elemento_id, avisado_en")
      if (error) throw error
      return data ?? []
    },
    // Reclamo atómico: los nuevos se insertan solo si no existen y cada
    // recordatorio se actualiza solo si su fecha sigue siendo la leída.
    reclamarAvisos: async (reclamo, instante) => {
      const ganados: string[] = []
      try {
        if (reclamo.nuevos.length > 0) {
          const { data, error } = await avisos()
            .upsert(
              reclamo.nuevos.map((id) => ({ elemento_id: id, avisado_en: instante })),
              { onConflict: "elemento_id", ignoreDuplicates: true },
            )
            .select("elemento_id")
          if (error) throw error
          ganados.push(...(data ?? []).map((fila) => fila.elemento_id as string))
        }
        for (const r of reclamo.recordatorios) {
          const { data, error } = await avisos()
            .update({ avisado_en: instante })
            .eq("elemento_id", r.id)
            .eq("avisado_en", r.anterior)
            .select("elemento_id")
          if (error) throw error
          if (data && data.length > 0) ganados.push(r.id)
        }
        return ganados
      } catch (error) {
        // Un fallo a mitad no deja reclamos huérfanos: se deshace lo ya ganado.
        try {
          await liberar(
            {
              nuevos: reclamo.nuevos.filter((id) => ganados.includes(id)),
              recordatorios: reclamo.recordatorios.filter((r) => ganados.includes(r.id)),
            },
            instante,
          )
        } catch (errorLiberar) {
          registrarError("registro", errorLiberar)
        }
        throw error
      }
    },
    liberarAvisos: liberar,
    descartarAvisos: async (ids) => {
      const { error } = await avisos().delete().in("elemento_id", ids)
      if (error) throw error
    },
    enviarCorreo: async ({ to, subject, text, html, smtp }) => {
      const transporte = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.password },
      })
      await transporte.sendMail({ from: smtp.from, to, subject, text, html })
    },
    registrarError,
  }
}

async function handleRequest(req: NextRequest, modo: { dryRun: boolean; testEmail: boolean }) {
  // RF-1/RF-2: el programador se acredita con el secreto compartido
  // (Authorization: Bearer <CRON_SECRET>, que Vercel envía solo si la variable
  // existe) y una persona, con sesión de rol admin. Ninguna cabecera que un
  // cliente pueda falsificar autoriza nada.
  const decision = await decidirAutorizacion({
    cabeceraAuthorization: req.headers.get("authorization"),
    secretoCron: process.env.CRON_SECRET,
    comprobarAdmin: async () => isAdmin(await cookies()),
  })

  if (!decision.autorizado) {
    return NextResponse.json(RESPUESTA_NO_AUTORIZADO.cuerpo, { status: RESPUESTA_NO_AUTORIZADO.estado })
  }

  const { estadoHttp, cuerpo } = await ejecutarAlertas({
    config: leerConfiguracionAlertas(process.env),
    modo,
    hoy: new Date(),
    baseUrl: resolveBaseUrl(req),
    deps: crearDependencias(),
  })
  return NextResponse.json(cuerpo, { status: estadoHttp })
}

export async function GET(req: NextRequest) {
  const parametros = new URL(req.url).searchParams
  const activo = (valor: string | null) => valor === "1" || valor === "true"
  return handleRequest(req, { dryRun: activo(parametros.get("dryRun")), testEmail: activo(parametros.get("testEmail")) })
}

export async function POST(req: NextRequest) {
  let cuerpo: { dryRun?: boolean; testEmail?: boolean } = {}
  try {
    cuerpo = await req.json()
  } catch {
    cuerpo = {}
  }
  return handleRequest(req, { dryRun: Boolean(cuerpo.dryRun), testEmail: Boolean(cuerpo.testEmail) })
}
