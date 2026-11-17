import type { AvisoElemento } from "./freezer-alerts-domain"

export interface ConfiguracionAlertas {
  meses: number
  diasRecordatorio: number
  destinatarios: string[]
  destinatariosDescartados: number
  smtp: { host: string; port: number; secure: boolean; user: string; password: string; from: string }
  smtpFaltantes: string[]
}

export interface ElementoAlerta {
  id: string
  nombre: string
  cantidad: number | null
  unidad: string | null
  categoria: string | null
  estado: string | null
  fecha_congelacion: string | null
  fecha_caducidad: string | null
  cajon: { id: string | null; nombre: string | null; posicion: number | null; congelador_id: string | null } | null
}

export interface MensajeCorreo {
  to: string
  subject: string
  text: string
  html: string
  smtp: ConfiguracionAlertas["smtp"]
}

export interface ReclamoAvisos {
  nuevos: string[]
  recordatorios: { id: string; anterior: string }[]
}

export interface DependenciasAlertas {
  /** Identificador del congelador único, o null si no existe; lanza si es ambiguo. */
  resolverCongelador: () => Promise<string | null>
  leerElementos: (fechaUmbral: string, congeladorId: string) => Promise<unknown[]>
  leerAvisos: () => Promise<AvisoElemento[]>
  /** Reclama los avisos de forma atómica y devuelve los identificadores realmente ganados. */
  reclamarAvisos: (reclamo: ReclamoAvisos, instanteIso: string) => Promise<string[]>
  /** Deshace un reclamo propio (solo filas aún marcadas con `instanteIso`). */
  liberarAvisos: (reclamo: ReclamoAvisos, instanteIso: string) => Promise<void>
  descartarAvisos: (ids: string[]) => Promise<void>
  enviarCorreo: (mensaje: MensajeCorreo) => Promise<void>
  registrarError?: (contexto: "lectura" | "envio" | "registro", error: unknown) => void
}

export type ResultadoAlertas =
  | "sin_novedades"
  | "aviso_enviado"
  | "fallo"
  | "comprobacion"
  | "prueba_enviada"

export interface RespuestaAlertas {
  estadoHttp: number
  cuerpo: {
    ok: boolean
    sent: boolean
    dryRun: boolean
    checkedAt: string
    thresholdDate: string
    alertMonths: number
    recipients: string[]
    items: ElementoAlerta[]
    resultado: ResultadoAlertas
    message?: string
    error?: string
    eligibleItems?: number
    totalItems?: number
    nuevos?: number
    recordatorios?: number
    avisosRegistrados?: boolean
  }
}

export function leerConfiguracionAlertas(env: Record<string, string | undefined>): ConfiguracionAlertas
export function normalizarElemento(fila: Record<string, any>): ElementoAlerta
export function ejecutarAlertas(entrada: {
  config: ConfiguracionAlertas
  modo: { dryRun: boolean; testEmail: boolean }
  hoy: Date
  baseUrl: string
  deps: DependenciasAlertas
}): Promise<RespuestaAlertas>
