export type EstadoElemento = "fresco" | "abierto" | "bajo" | "agotado"
export type RolAcceso = "owner" | "editor" | "viewer"
export type DecisionCajones = { tipo: "sin-cambios"; aCrear: 0 } | { tipo: "ampliacion"; aCrear: number }
export type CajonNuevo = { nombre: string; posicion: number }

export interface RepresentacionMostrada {
  nombre: string
  categoria: string
  notas: string
  unidad: string
  estado: string
  cantidadMostrada: string
  fechaCompraMostrada: string
  fechaCongelacionMostrada: string
  fechaCaducidadMostrada: string
  reservado: boolean
}

export interface ElementoEntrada {
  nombre?: unknown
  categoria?: unknown
  notas?: unknown
  unidad?: unknown
  estado?: unknown
  cantidad?: unknown
  fecha_compra?: unknown
  fecha_congelacion?: unknown
  fecha_caducidad?: unknown
  reservado?: unknown
}

export class FreezerDomainError extends TypeError { code: string }
export const ESTADOS_ELEMENTO: readonly EstadoElemento[]
export function parseEstado(value: unknown): EstadoElemento
export function parseCantidad(value: unknown): number | null
export function formatCantidadMostrada(cantidad: unknown, unidad: unknown): string
export function formatFechaMostrada(value: unknown): string
export function buildRepresentacionMostrada(elemento: ElementoEntrada | null | undefined): RepresentacionMostrada
export function coincideConBusqueda(representacion: RepresentacionMostrada | null | undefined, termino: unknown): boolean
export function decidirCajones(input: { actuales?: unknown; solicitados?: unknown }): DecisionCajones
export function buildCajonesNuevos(input: { existentes?: unknown; aCrear?: unknown }): CajonNuevo[]
export function puedeEscribir(rolAcceso: unknown): boolean
export function puedeLeer(rolAcceso: unknown): boolean
