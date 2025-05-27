import { getCurrentUserProfile } from "@/lib/auth"
import { UserProfileInfo } from "@/components/user-profile-info"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect("/login")
  }

  return (
    <div className="container py-10 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
      </div>

      <div className="space-y-6">
        <UserProfileInfo />

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas de uso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Las estadísticas de uso estarán disponibles próximamente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
