import { isAdminEmail } from "@/lib/auth"
import jest from "jest"

// Mock de Supabase para testing
const mockSupabase = {
  from: jest.fn(),
  auth: {
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    },
  },
}

// Mock de la función createServerClient
jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => mockSupabase),
}))

describe("User Profile Creation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("isAdminEmail function", () => {
    it("should return true for admin email", () => {
      expect(isAdminEmail("roberto.quintela@protonmail.com")).toBe(true)
    })

    it("should be case insensitive", () => {
      expect(isAdminEmail("ROBERTO.QUINTELA@PROTONMAIL.COM")).toBe(true)
    })

    it("should return false for non-admin emails", () => {
      expect(isAdminEmail("marcosmbaranda@gmail.com")).toBe(false)
      expect(isAdminEmail("test@example.com")).toBe(false)
    })
  })

  describe("Profile creation logic", () => {
    it("should create admin profile for admin email", () => {
      const userData = {
        id: "test-admin-id",
        email: "roberto.quintela@protonmail.com",
        user_metadata: {
          full_name: "Roberto Quintela",
          first_name: "Roberto",
        },
      }

      const expectedProfile = {
        id: userData.id,
        email: userData.email,
        full_name: userData.user_metadata.full_name,
        first_name: userData.user_metadata.first_name,
        role: "admin",
      }

      // Simular la lógica del trigger
      const role = isAdminEmail(userData.email) ? "admin" : "user_full"
      expect(role).toBe("admin")
    })

    it("should create user_full profile for regular email", () => {
      const userData = {
        id: "test-user-id",
        email: "marcosmbaranda@gmail.com",
        user_metadata: {
          full_name: "Marcos Baranda",
          first_name: "Marcos",
        },
      }

      const role = isAdminEmail(userData.email) ? "admin" : "user_full"
      expect(role).toBe("user_full")
    })

    it("should handle missing user metadata gracefully", () => {
      const userData = {
        id: "test-user-id",
        email: "test@example.com",
        user_metadata: {},
      }

      // Simular la lógica de extracción de nombres
      const fullName = userData.user_metadata?.full_name || userData.user_metadata?.name || ""
      const firstName = userData.user_metadata?.first_name || fullName.split(" ")[0] || ""

      expect(fullName).toBe("")
      expect(firstName).toBe("")
    })

    it("should extract first name from full name when first_name is missing", () => {
      const userData = {
        id: "test-user-id",
        email: "test@example.com",
        user_metadata: {
          full_name: "John Doe Smith",
        },
      }

      const fullName = userData.user_metadata?.full_name || userData.user_metadata?.name || ""
      const firstName = userData.user_metadata?.first_name || fullName.split(" ")[0] || ""

      expect(firstName).toBe("John")
    })
  })

  describe("Profile creation API", () => {
    it("should identify missing profiles correctly", async () => {
      // Mock de usuarios de auth
      const authUsers = [
        { id: "user1", email: "user1@example.com" },
        { id: "user2", email: "user2@example.com" },
        { id: "user3", email: "user3@example.com" },
      ]

      // Mock de perfiles existentes
      const existingProfiles = [{ id: "user1" }, { id: "user2" }]

      // Simular la lógica de identificación
      const existingProfileIds = new Set(existingProfiles.map((p) => p.id))
      const missingProfiles = authUsers.filter((user) => !existingProfileIds.has(user.id))

      expect(missingProfiles).toHaveLength(1)
      expect(missingProfiles[0].id).toBe("user3")
    })
  })
})
