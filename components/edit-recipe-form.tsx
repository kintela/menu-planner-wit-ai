"use client"

import type React from "react"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"
import type { Recipe } from "@/types"
import { useRouter } from "next/navigation"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, X } from "lucide-react"
import Image from "next/image"

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  ingredients: z.string().min(10, {
    message: "Ingredients must be at least 10 characters.",
  }),
  instructions: z.string().min(10, {
    message: "Instructions must be at least 10 characters.",
  }),
  category: z.string().min(2, {
    message: "Category must be at least 2 characters.",
  }),
  image_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal("")),
})

interface EditRecipeFormProps {
  recipe: Recipe
}

export function EditRecipeForm({ recipe }: EditRecipeFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseClient()

  // Estado para la imagen
  const [imageTab, setImageTab] = useState<string>(recipe.image_url ? "url" : "upload")
  const [imageUrl, setImageUrl] = useState<string>(recipe.image_url || "")
  const [imagePreview, setImagePreview] = useState<string | null>(recipe.image_url)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: recipe.title || "",
      description: recipe.description || "",
      ingredients: recipe.ingredients || "",
      instructions: recipe.instructions || "",
      category: recipe.category || "Dinner",
      image_url: recipe.image_url || "",
    },
  })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato no válido",
        description: "Por favor, selecciona un archivo de imagen (JPEG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      })
      return
    }

    setImageFile(file)
    setImageUrl("")

    // Crear una URL para la vista previa
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Subir la imagen inmediatamente
    try {
      setIsImageUploading(true)

      toast({
        title: "Subiendo imagen",
        description: "Por favor espera mientras se sube la imagen...",
      })

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/upload-image?recipeId=${recipe.id}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error al subir la imagen: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.url) {
        setUploadedImageUrl(data.url)
        form.setValue("image_url", data.url)

        toast({
          title: "Imagen subida",
          description: "La imagen se ha subido correctamente.",
        })
      } else {
        throw new Error("No se recibió URL de la imagen")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error al subir la imagen",
        description: `No se pudo subir la imagen: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setIsImageUploading(false)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setImageUrl(url)
    setImagePreview(url)
    form.setValue("image_url", url)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl("")
    setUploadedImageUrl(null)
    form.setValue("image_url", "")
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      // Obtener el usuario actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar autenticado para editar recetas.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Verificar que el usuario puede editar esta receta (es el propietario o admin)
      if (recipe.user_id !== user.id) {
        // Verificar si es admin
        const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

        if (!profile || profile.role !== "admin") {
          toast({
            title: "Sin permisos",
            description: "No tienes permisos para editar esta receta.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      // Determinar la URL final de la imagen
      let finalImageUrl = values.image_url
      if (uploadedImageUrl) {
        finalImageUrl = uploadedImageUrl
      }

      const { error } = await supabase
        .from("recipes")
        .update({
          title: values.title,
          description: values.description,
          ingredients: values.ingredients,
          instructions: values.instructions,
          category: values.category,
          image_url: finalImageUrl || null,
        })
        .eq("id", recipe.id)

      if (error) {
        toast({
          title: "Error!",
          description: "Failed to update recipe",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success!",
          description: "Recipe updated successfully.",
        })
        router.refresh()
        router.push(`/recipes/${recipe.id}`)
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter recipe title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter recipe description" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ingredients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ingredients</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Escribe los ingredientes, uno por línea (ej: 200g de arroz, 1 pollo, 2 cebollas...)"
                  className="min-h-32 resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe los pasos para preparar la receta"
                  className="min-h-32 resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "Dinner"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                  <SelectItem value="Dessert">Dessert</SelectItem>
                  <SelectItem value="Snack">Snack</SelectItem>
                  <SelectItem value="Drink">Drink</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sección de imagen dentro de FormField */}
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipe Image</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <Tabs value={imageTab} onValueChange={setImageTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">Image URL</TabsTrigger>
                      <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={imageUrl}
                          onChange={handleUrlChange}
                        />
                      </div>
                      {imageUrl && (
                        <div className="relative w-full aspect-video">
                          <Image
                            src={imageUrl || "/placeholder.svg"}
                            alt="Recipe preview"
                            fill
                            className="object-cover rounded-md"
                            onError={() => {
                              toast({
                                title: "Error loading image",
                                description: "The URL provided is not valid or not accessible.",
                                variant: "destructive",
                              })
                              setImagePreview(null)
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="upload">
                      {imagePreview && imageTab === "upload" ? (
                        <div className="relative w-full aspect-video mb-4">
                          <Image
                            src={imagePreview || "/placeholder.svg"}
                            alt="Recipe preview"
                            fill
                            className="object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {uploadedImageUrl && (
                            <div className="absolute bottom-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md">
                              ✅ Image saved
                            </div>
                          )}
                          {isImageUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="bg-white p-4 rounded-md flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Uploading image...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">PNG, JPG or GIF (max. 5MB)</p>
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageChange}
                              disabled={isImageUploading}
                            />
                          </label>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading || isImageUploading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Recipe"
          )}
        </Button>
      </form>
    </Form>
  )
}
