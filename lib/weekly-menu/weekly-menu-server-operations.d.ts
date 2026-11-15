import type { MenuSlot, WeekClassification } from "./weekly-menu-domain"
import type { PublicRecipe } from "../recipes/recipe-domain"

interface OperationResult<T> { status: number; body: T | { error: string } }
interface SupabaseAuthLike { getUser(): Promise<{ data?: { user?: { id: string } | null }; error?: unknown }> }
interface SupabaseClientLike {
  auth: SupabaseAuthLike
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}
export interface WeeklyMenuSlotDto {
  day_of_week: number
  meal_type: "comida" | "cena"
  dish_order: 1 | 2
  occupied: boolean
  recipe: PublicRecipe | null
  sacado_del_congelador: boolean
}
export interface WeeklyMenuDto {
  week: { start_date: string; end_date: string; dates: string[]; classification: WeekClassification }
  exists: boolean
  is_saved: boolean
  saved_at: string | null
  saved_snapshot: MenuSlot[]
  slots: WeeklyMenuSlotDto[]
  editable: boolean
  recipes: PublicRecipe[]
  target?: { ref: string; label: string }
}
export function readWeeklyMenu(client: SupabaseClientLike, input: unknown, hoy: Date): Promise<OperationResult<WeeklyMenuDto>>
export function saveWeeklyMenu(client: SupabaseClientLike, input: unknown, hoy: Date): Promise<OperationResult<{ success: true; menu: WeeklyMenuDto }>>
export function emptyWeeklyMenu(client: SupabaseClientLike, input: unknown, hoy: Date): Promise<OperationResult<{ success: true; removed: boolean; exists: false }>>
export function listWeeklyMenuSources(client: SupabaseClientLike, input: unknown, hoy: Date): Promise<OperationResult<{ sources: Array<{ start_date: string; end_date: string; label: string }> }>>
export function copyWeeklyMenu(client: SupabaseClientLike, input: unknown, hoy: Date): Promise<OperationResult<{ draft: Pick<WeeklyMenuDto, "week" | "saved_snapshot" | "slots" | "target"> }>>
export function listWeeklyMenuAdminTargets(client: SupabaseClientLike): Promise<OperationResult<{ targets: Array<{ ref: string; label: string }> }>>
