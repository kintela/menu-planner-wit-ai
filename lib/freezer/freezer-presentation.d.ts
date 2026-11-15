import type { EstadoElemento, RolAcceso } from "./freezer-domain"

export class FreezerPresentacionError extends TypeError {
  code: string
}

export type FormularioElemento = {
  cajon_id: string
  nombre: string
  cantidad: string
  unidad: string
  notas: string
  categoria: string
  estado: string
  fecha_compra: string
  fecha_congelacion: string
  fecha_caducidad: string
}

export type ItemPayload = {
  cajon_id: string
  nombre: string
  estado: EstadoElemento
  cantidad?: number
  unidad?: string
  notas?: string
  categoria?: string
  fecha_compra?: string
  fecha_congelacion?: string
  fecha_caducidad?: string
}

export type ItemUpdatePayload = {
  cajon_id: string
  nombre: string
  estado: EstadoElemento
  cantidad: number | null
  unidad: string | null
  notas: string | null
  categoria: string | null
  fecha_compra: string | null
  fecha_congelacion: string | null
  fecha_caducidad: string | null
}

export type PresentacionRol = {
  puedeEscribir: boolean
  puedeLeer: boolean
  esCompartido: boolean
}

export type VistaCajon<C> = {
  cajon: C
  items: C extends { items?: (infer E)[] } ? E[] : unknown[]
  visibles: C extends { items?: (infer E)[] } ? E[] : unknown[]
  total: number
  sinCoincidencias: boolean
}

export function buildNewItemForm(hoy: unknown): FormularioElemento
export function buildItemFormState(item: unknown): FormularioElemento
export function parseCantidadDeFormulario(valor: unknown): number | null
export function buildItemPayload(formState: unknown, cajonId: unknown): ItemPayload
export function buildItemUpdates(formState: unknown): ItemUpdatePayload
export function filtrarPorBusqueda<T>(items: T[] | null | undefined, termino: unknown): T[]
export function buildVistaCajon<C extends { items?: unknown }>(cajon: C | null | undefined, termino: unknown): VistaCajon<C>
export function buildPresentacionRol(rolAcceso: RolAcceso | null | undefined): PresentacionRol
export type PresentacionAcceso = {
  esAdministradorAutorizado: boolean
  mostrarMenu: boolean
  puedeLeer: boolean
  puedeEscribir: boolean
}
export function buildPresentacionAcceso(esAdministradorAutorizado: unknown): PresentacionAcceso
export function debeOfrecerVaciado(cajon: unknown): boolean
export type PresentacionImpresion = {
  nombre: string
  cantidad: string
  unidad: string
  estado: string
  categoria: string
  fechaCompra: string
  fechaCongelacion: string
  fechaCaducidad: string
  notas: string
  reservado: boolean
}
export function buildPresentacionImpresion(item: unknown): PresentacionImpresion
