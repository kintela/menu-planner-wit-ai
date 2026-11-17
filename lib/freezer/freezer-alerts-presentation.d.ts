import type { TiempoCongelado } from "./freezer-alerts-domain"

export interface ElementoParaAviso {
  id?: string
  nombre?: string | null
  cantidad?: number | null
  unidad?: string | null
  categoria?: string | null
  fecha_congelacion?: string | null
  cajon?: { nombre?: string | null; posicion?: number | null } | null
}

export interface CorreoRedactado {
  subject: string
  text: string
  html: string
}

export function escaparHtml(valor: unknown): string
export function formatearFechaHumana(valor: unknown): string
export function formatearCantidad(cantidad: number | null | undefined, unidad?: string | null): string
export function formatearTiempoCongelado(tiempo: TiempoCongelado | null): string
export function construirCorreoAviso(entrada: {
  elementos: readonly ElementoParaAviso[]
  hoy: Date
  meses: number
  baseUrl: string
}): CorreoRedactado
export function construirCorreoPrueba(entrada: { hoy: Date; baseUrl: string }): CorreoRedactado
