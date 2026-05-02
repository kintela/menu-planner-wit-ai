"use client"

import { useEffect, useMemo, useRef } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface VideoEmbedProps {
  url: string
  title: string
}

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process?: () => void
      }
    }
  }
}

function InstagramEmbed({ permalink }: { permalink: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const processEmbeds = () => window.instgrm?.Embeds?.process?.()
    const existingScript = document.querySelector('script[src="https://www.instagram.com/embed.js"]') as HTMLScriptElement | null

    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="${permalink}"
          data-instgrm-version="14"
          style="background:#fff; border:0; margin:0 auto; max-width:540px; min-width:326px; padding:0; width:100%;"
        >
          <a href="${permalink}" target="_blank" rel="noopener noreferrer">Ver publicación en Instagram</a>
        </blockquote>
      `
    }

    if (existingScript) {
      processEmbeds()
      return
    }

    const script = document.createElement("script")
    script.src = "https://www.instagram.com/embed.js"
    script.async = true
    script.onload = processEmbeds
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [permalink])

  return (
    <div className="overflow-hidden rounded-lg border bg-white p-4">
      <div ref={containerRef} className="min-h-[420px]" />
    </div>
  )
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const { embedUrl, error, provider } = useMemo(() => {
    if (!url) {
      return { embedUrl: null, error: "No se proporcionó ninguna URL.", provider: null }
    }

    try {
      let computedUrl: string | null = null
      const parsedUrl = new URL(url)
      let computedProvider: "instagram" | "iframe" | null = null

      // Procesar URL de YouTube
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = ""

        if (url.includes("youtube.com/watch")) {
          const urlParams = parsedUrl.searchParams
          videoId = urlParams.get("v") || ""
        } else if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1].split("?")[0]
        }

        if (videoId) {
          computedUrl = `https://www.youtube.com/embed/${videoId}`
          computedProvider = "iframe"
        }
      } else if (url.includes("vimeo.com")) {
        // Procesar URL de Vimeo
        const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0]
        if (vimeoId) {
          computedUrl = `https://player.vimeo.com/video/${vimeoId}`
          computedProvider = "iframe"
        }
      } else if (parsedUrl.hostname.includes("instagram.com")) {
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean)
        const contentType = pathParts[0]
        const contentId = pathParts[1]

        if (contentType && contentId && ["reel", "p", "tv", "reels"].includes(contentType)) {
          const normalizedType = contentType === "reels" ? "reel" : contentType
          computedUrl = `https://www.instagram.com/${normalizedType}/${contentId}/`
          computedProvider = "instagram"
        }
      }

      // Si no es una URL reconocida, mostrar la URL original
      return { embedUrl: computedUrl ?? url, error: null, provider: computedProvider ?? "iframe" }
    } catch (err) {
      console.error("Error al procesar la URL del video:", err)
      return { embedUrl: null, error: "No se pudo procesar la URL del video", provider: null }
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

  if (provider === "instagram") {
    return <InstagramEmbed permalink={embedUrl} />
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-white">
      <div className="aspect-video relative min-h-[360px]">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute top-0 left-0 w-full h-full"
      ></iframe>
      </div>
    </div>
  )
}
