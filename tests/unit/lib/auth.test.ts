import { getPermissionsByRole, getRoleDisplayName, getRoleDescription, isAdminEmail } from "@/lib/auth"

describe("Auth Functions", () => {
  describe("getPermissionsByRole", () => {
    it("should return all permissions for admin role", () => {
      const permissions = getPermissionsByRole("admin")

      expect(permissions).toContain("view_recipes")
      expect(permissions).toContain("create_recipes")
      expect(permissions).toContain("manage_users")
      expect(permissions).toContain("export_data")
      expect(permissions.length).toBeGreaterThan(10)
    })

    it("should return limited permissions for user_restricted role", () => {
      const permissions = getPermissionsByRole("user_restricted")

      expect(permissions).toContain("view_recipes")
      expect(permissions).toContain("view_categories")
      expect(permissions).not.toContain("create_recipes")
      expect(permissions).not.toContain("manage_users")
      expect(permissions.length).toBe(4)
    })

    it("should return full user permissions for user_full role", () => {
      const permissions = getPermissionsByRole("user_full")

      expect(permissions).toContain("view_recipes")
      expect(permissions).toContain("create_recipes")
      expect(permissions).toContain("use_ai_suggestions")
      expect(permissions).not.toContain("manage_users")
      expect(permissions).not.toContain("export_data")
    })

    it("should return empty array for unknown role", () => {
      // @ts-ignore - Testing invalid role
      const permissions = getPermissionsByRole("unknown_role")
      expect(permissions).toEqual([])
    })
  })

  describe("getRoleDisplayName", () => {
    it("should return correct display names for all roles", () => {
      expect(getRoleDisplayName("admin")).toBe("Administrador")
      expect(getRoleDisplayName("user_full")).toBe("Usuario Completo")
      expect(getRoleDisplayName("user_restricted")).toBe("Usuario Restringido")
    })

    it("should return default name for unknown role", () => {
      // @ts-ignore - Testing invalid role
      expect(getRoleDisplayName("unknown")).toBe("Usuario")
    })
  })

  describe("getRoleDescription", () => {
    it("should return correct descriptions for all roles", () => {
      const adminDesc = getRoleDescription("admin")
      expect(adminDesc).toContain("Acceso completo")
      expect(adminDesc).toContain("gestión de usuarios")

      const userFullDesc = getRoleDescription("user_full")
      expect(userFullDesc).toContain("crear, editar y gestionar")

      const userRestrictedDesc = getRoleDescription("user_restricted")
      expect(userRestrictedDesc).toContain("Solo puede ver")
    })

    it("should return empty string for unknown role", () => {
      // @ts-ignore - Testing invalid role
      expect(getRoleDescription("unknown")).toBe("")
    })
  })

  describe("isAdminEmail", () => {
    it("should return true for admin emails", () => {
      expect(isAdminEmail("roberto.quintela@protonmail.com")).toBe(true)
    })

    it("should be case insensitive", () => {
      expect(isAdminEmail("ROBERTO.QUINTELA@PROTONMAIL.COM")).toBe(true)
      expect(isAdminEmail("Roberto.Quintela@ProtonMail.com")).toBe(true)
    })

    it("should return false for non-admin emails", () => {
      expect(isAdminEmail("user@example.com")).toBe(false)
      expect(isAdminEmail("test@gmail.com")).toBe(false)
    })

    it("should return false for empty or invalid emails", () => {
      expect(isAdminEmail("")).toBe(false)
      expect(isAdminEmail("invalid-email")).toBe(false)
    })
  })
})
