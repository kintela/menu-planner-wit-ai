import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"
import { readPublicRecipes } from "@/lib/recipes/recipe-server-operations"

type RecipeSitemapRow = {
  id: number
  created_at?: string | null
}

function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"

  const normalizedUrl = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`
  return normalizedUrl.endsWith("/") ? normalizedUrl.slice(0, -1) : normalizedUrl
}

async function getRecipeEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return []
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const result = await readPublicRecipes(supabase)
  if (result.status !== 200 || !("recipes" in result.body)) return []
  const data = result.body.recipes

  return (data as RecipeSitemapRow[]).map((recipe) => ({
    url: `${baseUrl}/recipes/${recipe.id}`,
    lastModified: recipe.created_at || undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/recipes/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/seasonal-products`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ]

  const recipeRoutes = await getRecipeEntries(baseUrl)

  return [...staticRoutes, ...recipeRoutes]
}
