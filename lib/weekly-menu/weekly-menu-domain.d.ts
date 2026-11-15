export type WeekClassification = "past" | "current" | "future"
export type MealType = "comida" | "cena"

export interface CivilDate { year: number; month: number; day: number; iso: string }
export interface MenuSlot {
  day_of_week: number
  meal_type: MealType
  dish_order: 1 | 2
  recipe_id: number
  sacado_del_congelador: boolean
}
export interface WeekRange {
  monday: string
  sunday: string
  dates: string[]
  days: Array<{ dayIndex: number; iso: string }>
}
export interface MenuDraftContext { weekStart: string; slots: MenuSlot[] }

export class WeeklyMenuDomainError extends TypeError { code: string }
export function parseMadridDate(value: unknown): CivilDate
export function mondayIsoFor(hoy: Date): string
export function normalizeWeekStart(value: unknown, hoy: Date): string
export function buildWeekRange(weekStart: string, hoy: Date): WeekRange
export function classifyWeek(weekStart: string, hoy: Date): WeekClassification
export function parseMenuSlot(input: unknown): MenuSlot
export function validateMenuDraft(input: unknown, hoy: Date): MenuSlot[]
export function canonicalizeMenuDraft(input: unknown, hoy: Date): MenuSlot[]
export function hasUnsavedChanges(saved: unknown, draft: unknown, hoy: Date): boolean
export function copyMenuDraft(source: MenuSlot[] | { slots: MenuSlot[] }, destinationWeek: string, hoy: Date): MenuDraftContext
export function restoreMenuDraft(saved: unknown, hoy: Date): MenuSlot[]
export function canEditWeek(input: {
  actorId?: string | null
  actorRole?: string | null
  ownerId?: string | null
  weekStart?: string | null
}, hoy: Date): boolean
