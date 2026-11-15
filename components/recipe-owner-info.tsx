interface RecipeOwnerInfoProps {
  authorAlias?: string | null
  className?: string
  showPrefix?: boolean
}

export function RecipeOwnerInfo({ authorAlias, className = "", showPrefix = true }: RecipeOwnerInfoProps) {
  const displayName = authorAlias?.trim() || "Usuario"

  return (
    <div className={`flex items-center gap-2 text-sm text-white bg-black/50 px-2 py-1 rounded-full ${className}`}>
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>

      {/* Texto con o sin prefijo */}
      <span className="text-xs">{showPrefix ? `Creada por: ${displayName}` : displayName}</span>
    </div>
  )
}
