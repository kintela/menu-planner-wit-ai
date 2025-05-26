"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function TestEmailPage() {
  const [email, setEmail] = useState("roberto.quintela@protonmail.com")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const testEmailSending = async () => {
    setLoading(true)
    try {
      console.log("🧪 Testing email sending to:", email)

      const { data, error } = await supabase.auth.signUp({
        email,
        password: "test123456", // Contraseña temporal para prueba
      })

      console.log("📧 Email test result:", { data, error })

      if (error) {
        throw error
      }

      toast({
        title: "Test enviado",
        description: `Email de confirmación enviado a ${email}. Revisa tu bandeja de entrada y spam.`,
      })
    } catch (error: any) {
      console.error("❌ Email test error:", error)
      toast({
        title: "Error en test",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🧪 Test de Email SMTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email de prueba:</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <Button onClick={testEmailSending} disabled={loading} className="w-full">
            {loading ? "Enviando..." : "🚀 Probar envío de email"}
          </Button>
          <div className="text-xs text-gray-600">
            <p>
              <strong>Qué verificar:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Bandeja de entrada</li>
              <li>Carpeta de spam</li>
              <li>Logs de la consola (F12)</li>
              <li>Configuración SMTP en Supabase</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
