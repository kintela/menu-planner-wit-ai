"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Search, ChefHat, Sparkles } from "lucide-react"
import { AiRecipeSuggestion } from "@/components/ai-recipe-suggestion"

interface Recipe {
  id: number
  name: string
  calories?: number
  image_url?: string
  user_profiles?: {
    id?: string
    full_name?: string
    first_name?: string
    last_name?: string
    alias?: string
    avatar_url?: string
    email?: string
  }
}

interface RecipeSelectorProps {
  recipes: Recipe[]
  day: string
  mealType: string
  onSelect: (recipeId: number) => void
  onCancel: () => void
}

export function RecipeSelector({ recipes, day, mealType, onSelect, onCancel }: RecipeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  // Filtrar y ordenar recetas alfabéticamente
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [recipes, searchTerm])

  const handleSelectRecipe = (recipeId: number) => {
    onSelect(recipeId)
    setSearchTerm("")
    setIsOpen(false)
  }

  const mealTypeLabels = {
    "comida-1": "Primer plato",
    "comida-2": "Segundo plato", 
    "cena-1": "Cena"
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Seleccionar receta
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          {day} - {mealTypeLabels[mealType as keyof typeof mealTypeLabels] || mealType}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botón para generar receta por IA */}
        <div className="flex justify-center mb-2">
          <AiRecipeSuggestion
            mealType={mealType.startsWith("comida") ? "comida" : "cena"}
            dishOrder={mealType.endsWith("1") ? 1 : mealType.endsWith("2") ? 2 : undefined}
            dayName={day}
            onRecipeCreated={(recipe) => {
              onSelect(recipe.id)
            }}
          />
        </div>
        {/* Caja de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar receta por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Lista de recetas */}
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {filteredRecipes.length} receta{filteredRecipes.length !== 1 ? 's' : ''} encontrada{filteredRecipes.length !== 1 ? 's' : ''}
          </p>
          
          <ScrollArea className="h-64 w-full rounded-md border">
            <div className="p-2 space-y-1">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron recetas</p>
                  <p className="text-xs">Prueba con otros términos de búsqueda</p>
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleSelectRecipe(recipe.id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                  >
                    {recipe.image_url && (
                      <img
                        src={recipe.image_url}
                        alt={recipe.name}
                        className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{recipe.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {recipe.calories && (
                          <span>{recipe.calories} cal</span>
                        )}
                        {recipe.user_profiles && (
                          <span>
                            • {recipe.user_profiles.alias || 
                               recipe.user_profiles.full_name || 
                               (recipe.user_profiles.first_name && recipe.user_profiles.last_name 
                                 ? `${recipe.user_profiles.first_name} ${recipe.user_profiles.last_name}` 
                                 : recipe.user_profiles.first_name) ||
                               recipe.user_profiles.email ||
                               'Usuario'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Botón cancelar */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}