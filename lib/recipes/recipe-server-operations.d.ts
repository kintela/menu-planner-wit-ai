import type { PublicRecipe } from "./recipe-domain"
type OperationResult<T> = { status: number; body: T | { error: string } }
export function readPublicRecipes(client: any): Promise<OperationResult<{ recipes: PublicRecipe[] }>>
export function readPublicRecipe(client: any, id: unknown): Promise<OperationResult<{ recipe: PublicRecipe }>>
export function readPublicCategories(client: any): Promise<OperationResult<{ categories: Array<{ id: number; name: string; created_at: string | null; recipe_count: number }> }>>
export function readRecipeListing(client: any): Promise<OperationResult<{ recipes: PublicRecipe[] }>>
export function readRecipeDetail(client: any, id: unknown): Promise<OperationResult<{ recipe: PublicRecipe }>>
export function createRecipe(client: any, input: Record<string, unknown>, hoy: Date): Promise<any>
export function updateRecipe(client: any, id: unknown, input: Record<string, unknown>, hoy: Date): Promise<any>
export function deleteRecipe(client: any, id: unknown): Promise<any>
export function checkRecipeMenuUsage(client: any, id: unknown): Promise<any>
export function createCategory(client: any, input: Record<string, unknown>): Promise<any>
export function updateCategory(client: any, id: unknown, input: Record<string, unknown>): Promise<any>
export function deleteCategory(client: any, id: unknown): Promise<any>
export function mergeCategories(client: any, input: Record<string, unknown>): Promise<any>
export function readRecipeRating(client: any, id: unknown): Promise<any>
export function upsertRecipeRating(client: any, id: unknown, input: unknown): Promise<any>
export function deleteRecipeRating(client: any, id: unknown): Promise<any>
