import { Badge } from "@/components/ui/badge"
import { Shield, User, Eye } from "lucide-react"
import type { UserRole } from "@/lib/types"
import { getRoleDisplayName } from "@/lib/auth"

interface UserRoleBadgeProps {
  role: UserRole
  showIcon?: boolean
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export function UserRoleBadge({ role, showIcon = true, variant = "default" }: UserRoleBadgeProps) {
  const getIcon = () => {
    switch (role) {
      case "admin":
        return <Shield className="h-3 w-3 mr-1" />
      case "user_full":
        return <User className="h-3 w-3 mr-1" />
      case "user_restricted":
        return <Eye className="h-3 w-3 mr-1" />
      default:
        return null
    }
  }

  const getVariant = () => {
    if (variant !== "default") return variant

    switch (role) {
      case "admin":
        return "destructive" as const
      case "user_full":
        return "default" as const
      case "user_restricted":
        return "secondary" as const
      default:
        return "outline" as const
    }
  }

  return (
    <Badge variant={getVariant()} className="text-xs">
      {showIcon && getIcon()}
      {getRoleDisplayName(role)}
    </Badge>
  )
}
