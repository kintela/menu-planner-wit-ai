import { FreezerManager } from "@/components/freezer/freezer-manager"
import { SimpleNavigation } from "@/components/simple-navigation"

export default function FreezerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <FreezerManager />
      </main>
    </div>
  )
}
