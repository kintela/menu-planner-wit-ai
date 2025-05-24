"use client"

import { useState } from "react"
import { Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { VideoEmbed } from "@/components/video-embed"

interface VideoModalProps {
  videoUrl: string
  recipeName: string
}

export function VideoModal({ videoUrl, recipeName }: VideoModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-black/50 hover:bg-black/70 text-white rounded-full"
          title={`Ver video: ${recipeName}`}
        >
          <Video className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Video: {recipeName}</DialogTitle>
          <DialogDescription>Video de preparación para la receta {recipeName}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <VideoEmbed url={videoUrl} title={`Video de preparación de ${recipeName}`} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
