export interface PublicCategory { id: number; name: string }
export interface PublicRecipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean
  created_at: string | null
  video_url: string | null
  source_url: string | null
  calories: number | null
  categories: PublicCategory[]
  author_alias: string
  rating_average: number | null
  rating_count: number
  can_edit?: boolean
  can_delete?: boolean
  is_owner?: boolean
  my_rating?: number | null
  menu_ids?: number[]
  author_filter_key?: string
  author_filter_label?: string
}
export function parseRecipeId(value: unknown): number | null
export function parseCategoryId(value: unknown): number | null
export function normalizeCategoryName(value: unknown): { name: string; comparisonKey: string } | null
export function buildRecipeMutation(input: Record<string, unknown>, actorId: string, hoy: Date): Record<string, unknown>
export function canManageRecipe(input: { actorId?: string | null; actorRole?: string | null; ownerId?: string | null }): boolean
export function validateRating(value: unknown): number | null
export function buildManagedRecipeImagePath(recipeId: unknown, fileName: unknown, hoy: Date): string
export function classifyImageTransition(previous: string | null, next: string | null, outcome: Record<string, boolean>): { status: string; active: string | null; cleanupRequired: boolean }
export function toPublicRecipe(row: Record<string, unknown>): PublicRecipe
