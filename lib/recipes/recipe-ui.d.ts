import type { PublicRecipe } from "./recipe-domain"

export function normalizeRecipeForPresentation(value: Record<string, unknown>): PublicRecipe
export function buildJsonRequest(method: "POST" | "PUT" | "DELETE", payload?: Record<string, unknown>): RequestInit
export interface RecipeImageResult { state?: string; code?: string; url?: string | null; active_url?: string }
export function imageResultMessage(image: RecipeImageResult | null | undefined): string
export function imageResultActiveUrl(image: RecipeImageResult | null | undefined): string | null | undefined
export function ratingResultMessage(ok: boolean, payload: { error?: string; removed?: boolean }): string
export function categoryResultMessage(ok: boolean, payload: { error?: string }): string
export function canCreateRecipe(role: string | null | undefined): boolean
