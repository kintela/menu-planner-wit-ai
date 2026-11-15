"use client"

import { useEffect, useState } from "react"
import { CategoryManager } from "@/components/category-manager"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

interface CategoryWithCount { id: number; name: string; created_at?: string; recipe_count: number }

export default function CategoriesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch("/api/categories", { method: "GET", cache: "no-store" })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las categorías")
        if (active) setCategories((Array.isArray(payload.categories) ? payload.categories : []).map((category: CategoryWithCount) => ({ ...category, recipe_count: Number(category.recipe_count) || 0 })))
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las categorías")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  if (loading || authLoading) return <div className="container mx-auto px-4 py-8 flex items-center gap-2"><Loader2 className="h-6 w-6 animate-spin" />Cargando categorías...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categorías</h1>
        <p className="text-gray-600 mt-2">Catálogo global de categorías de recetas</p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
      <CategoryManager
        categories={categories}
        duplicateCategories={[]}
        canCreate={Boolean(user)}
        canAdminister={profile?.role === "admin"}
      />
    </div>
  )
}
