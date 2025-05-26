import { ChefHat, Home, Settings, User, History } from "lucide-react"

import { NavigationItem } from "@/components/navigation-item"

export function SimpleNavigation() {
  return (
    <div className="space-y-4">
      <NavigationItem href="/home" icon={Home}>
        Inicio
      </NavigationItem>
      <NavigationItem href="/categories" icon={ChefHat}>
        Categorías
      </NavigationItem>
      <NavigationItem href="/history" icon={History}>
        Historial
      </NavigationItem>
      <NavigationItem href="/profile" icon={User}>
        Perfil
      </NavigationItem>
      <NavigationItem href="/settings" icon={Settings}>
        Configuración
      </NavigationItem>
    </div>
  )
}
