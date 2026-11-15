export const MAX_RECIPE_IMAGE_FILE_BYTES: number
export const MAX_RECIPE_IMAGE_REQUEST_BYTES: number

export type RecipeImageResult = {
  status: number
  body: Record<string, unknown>
  cleanupContext?: { recipeId: number; managedImagePath: string | null }
}

export function validateRecipeImageFile(file: unknown): { ok: boolean; value?: File }
export function replaceRecipeImage(client: any, id: unknown, file: unknown, hoy: Date): Promise<RecipeImageResult>
export function deleteRecipeImage(client: any, id: unknown): Promise<RecipeImageResult>
export function cleanupDeletedRecipeImage(client: any, result: RecipeImageResult): Promise<RecipeImageResult>
