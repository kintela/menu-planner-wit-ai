"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface VideoEmbedProps {
  url: string
  title: string
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const { embedUrl, error } = useMemo(() => {
    if (!url) {
      return { embedUrl: null, error: "No se proporcionó ninguna URL." }
    }

    try {
      let computedUrl: string | null = null
      // Procesar URL de YouTube
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = ""

        if (url.includes("youtube.com/watch")) {
          const urlParams = new URL(url).searchParams
          videoId = urlParams.get("v") || ""
        } else if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1].split("?")[0]
        }

        if (videoId) {
          computedUrl = `https://www.youtube.com/embed/${videoId}`
        }
      } else if (url.includes("vimeo.com")) {
        // Procesar URL de Vimeo
        const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0]
        if (vimeoId) {
          computedUrl = `https://player.vimeo.com/video/${vimeoId}`
        }
      }

      // Si no es una URL reconocida, mostrar la URL original
      return { embedUrl: computedUrl ?? url, error: null }
    } catch (err) {
      console.error("Error al procesar la URL del video:", err)
      return { embedUrl: null, error: "No se pudo procesar la URL del video" }
    }
  }, [url])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!embedUrl) {
    return <div className="w-full aspect-video bg-muted animate-pulse rounded-md"></div>
  }

  return (
    <div className="aspect-video relative rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      ></iframe>
    </div>
  )
}
