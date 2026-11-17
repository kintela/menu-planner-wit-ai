export const UMBRAL_MESES_POR_DEFECTO: 2
export const DIAS_RECORDATORIO_POR_DEFECTO: 30

export interface ElementoCongelado {
  id: string
  nombre?: string | null
  fecha_congelacion?: string | null
}

export interface AvisoElemento {
  elemento_id: string
  avisado_en: string
}

export interface DecisionAvisos<T extends ElementoCongelado = ElementoCongelado> {
  aAvisar: T[]
  nuevos: T[]
  recordatorios: T[]
  yaAvisados: T[]
}

export interface TiempoCongelado {
  dias: number
  meses: number
  diasResto: number
}

export function parseMesesUmbral(valor: unknown): number
export function parseDiasRecordatorio(valor: unknown): number
export function calcularFechaUmbral(hoy: Date, meses: number): string
export function seleccionarElegibles<T extends ElementoCongelado>(elementos: readonly T[], fechaUmbral: string): T[]
export function decidirAvisos<T extends ElementoCongelado>(entrada: {
  elegibles: readonly T[]
  avisos: readonly AvisoElemento[]
  hoy: Date
  diasRecordatorio: number
}): DecisionAvisos<T>
export function avisosObsoletos(avisos: readonly AvisoElemento[], elegibles: readonly ElementoCongelado[]): string[]
export function normalizarDestinatarios(valor: unknown): { destinatarios: string[]; descartados: number }
export function calcularTiempoCongelado(fechaCongelacion: string | null | undefined, hoy: Date): TiempoCongelado | null
