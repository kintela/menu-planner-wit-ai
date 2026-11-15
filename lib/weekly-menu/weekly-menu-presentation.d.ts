import type { MenuSlot } from "./weekly-menu-domain"

export type DraftAction =
  | ({ type: "set"; recipe_id: number } & Pick<MenuSlot, "day_of_week" | "meal_type" | "dish_order">)
  | ({ type: "remove" | "toggle-freezer" } & Pick<MenuSlot, "day_of_week" | "meal_type" | "dish_order">)
  | { type: "copy" | "restore"; slots: MenuSlot[] }

export function buildConceptualSlots(draft: MenuSlot[]): Array<Pick<MenuSlot, "day_of_week" | "meal_type" | "dish_order"> & { slot: MenuSlot | null }>
export function reduceDraft(current: MenuSlot[], action: DraftAction, editable: boolean): MenuSlot[]
export function buildSaveRequest(week: string, target: string | null, slots: MenuSlot[]): { week: string; target?: string; slots: MenuSlot[] }
export function buildCopyRequest(sourceWeek: string, destinationWeek: string, target: string | null): { sourceWeek: string; destinationWeek: string; target?: string }
