"use client"

import type React from "react"

import { useAuth } from "@/components/auth/auth-provider"

interface DeleteRecipeButtonProps {
  recipeId: string
  onDelete: () => void
}

const DeleteRecipeButton: React.FC<DeleteRecipeButtonProps> = ({ recipeId, onDelete }) => {
  const { user } = useAuth()

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete recipe: ${response.status}`)
      }

      onDelete() // Call the onDelete callback to update the UI
    } catch (error: any) {
      console.error("Error deleting recipe:", error)
      alert("Failed to delete recipe. Please try again.")
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!user}
    >
      Delete Recipe
    </button>
  )
}

export default DeleteRecipeButton
