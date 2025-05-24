"use client"

import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface VideoEmbedProps {
  url: string
  title: string
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
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
          setEmbedUrl(`https://www.youtube.com/embed/${videoId}`)
          return
        }
      }

      // Procesar URL de Vimeo
      if (url.includes("vimeo.com")) {
        const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0]
        if (vimeoId) {
          setEmbedUrl(`https://player.vimeo.com/video/${vimeoId}`)
          return
        }
      }

      // Si no es una URL reconocida, mostrar la URL original
      setEmbedUrl(url)
    } catch (err) {
      console.error("Error al procesar la URL del video:", err)
      setError("No se pudo procesar la URL del video")
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
