import { LoginForm } from "@/components/auth/login-form"
import { SimpleNavigation } from "@/components/simple-navigation"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <div className="container mx-auto px-4 py-8">
        <LoginForm />
      </div>
    </div>
  )
}
