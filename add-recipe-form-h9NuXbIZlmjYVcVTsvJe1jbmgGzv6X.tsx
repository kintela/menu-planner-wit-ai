"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { useSession } from "next-auth/react"
import type { User } from "@supabase/supabase-js"

const supabase = createClientComponentClient()

export default function AddRecipeForm() {
  const [formData, setFormData] = useState({
    name: "",
    ingredients: "",
    preparation: "",
  })
  const [imageUrl, setImageUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [calories, setCalories] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const router = useRouter()
  const { data: session } = useSession()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `${fileName}`

    setUploading(true)
    setUploadProgress(0)

    try {
      const { data, error } = await supabase.storage.from("recipe-images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        throw error
      }

      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipe-images/${filePath}`
      setImageUrl(imageUrl)
    } catch (error: any) {
      console.error("Error uploading image: ", error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    const recipeData = {
      name: formData.name,
      ingredients: formData.ingredients,
      preparation: formData.preparation,
      image_url: imageUrl,
      is_ai_generated: false,
      user_id: user?.id, // Añadir esta línea
      calories: calories ? Number.parseInt(calories) : null,
      video_url: videoUrl || null,
      source_url: sourceUrl || null,
    }

    try {
      const { data, error } = await supabase.from("recipes").insert([recipeData]).select()

      if (error) {
        throw error
      }

      router.push("/")
      router.refresh()
    } catch (error: any) {
      console.error("Error adding recipe: ", error.message)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Recipe Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            name="name"
            type="text"
            placeholder="Enter recipe name"
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ingredients">
            Ingredients
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="ingredients"
            name="ingredients"
            placeholder="Enter ingredients"
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preparation">
            Preparation
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="preparation"
            name="preparation"
            placeholder="Enter preparation steps"
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image">
            Image URL
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="image"
            name="image"
            type="file"
            onChange={handleImageUpload}
          />
          {uploading && (
            <div className="mt-2">
              <progress value={uploadProgress} max="100" />
              <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
            </div>
          )}
          {imageUrl && <img src={imageUrl || "/placeholder.svg"} alt="Uploaded" className="mt-4 max-h-32" />}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="videoUrl">
            Video URL (Optional)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="videoUrl"
            name="videoUrl"
            type="url"
            placeholder="Enter video URL"
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sourceUrl">
            Source URL (Optional)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            placeholder="Enter source URL"
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="calories">
            Calories (Optional)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="calories"
            name="calories"
            type="number"
            placeholder="Enter calories"
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            Add Recipe
          </button>
        </div>
      </form>
    </div>
  )
}