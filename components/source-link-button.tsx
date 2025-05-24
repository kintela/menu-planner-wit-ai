"use client"

import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SourceLinkButtonProps {
  sourceUrl: string
  recipeName: string
}

export function SourceLinkButton({ sourceUrl, recipeName }: SourceLinkButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
      title={`Ver fuente original: ${recipeName}`}
      onClick={() => window.open(sourceUrl, "_blank", "noopener,noreferrer")}
    >
      <ExternalLink className="h-5 w-5" />
    </Button>
  )
}
