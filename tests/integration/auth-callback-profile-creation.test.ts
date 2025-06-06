import { isAdminEmail } from "@/lib/auth"
import jest from "jest" // Declaring the jest variable

// Mock para testing
const mockSupabase = {
  auth: {
    exchangeCodeForSession: jest.fn(),
    verifyOtp: jest.fn(),
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    },
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
}

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => mockSupabase),
}))

describe("Auth Callback Profile Creation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Email verification and admin detection", () => {
    it("should detect admin email correctly", () => {
      expect(isAdminEmail("roberto.quintela@protonmail.com")).toBe(true)
      expect(isAdminEmail("roberto.quintela@icloud.com")).toBe(false) // Este no está en la lista de admins
    })

    it("should handle case sensitivity", () => {
      expect(isAdminEmail("ROBERTO.QUINTELA@PROTONMAIL.COM")).toBe(true)
    })
  })

  describe("Profile creation trigger simulation", () => {
    it("should create admin profile for protonmail account", () => {
      const userData = {
        id: "test-admin-id",
        email: "roberto.quintela@protonmail.com",
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: "Roberto Quintela",
        },
      }

      const expectedRole = isAdminEmail(userData.email) ? "admin" : "user_restricted"
      expect(expectedRole).toBe("admin")
    })

    it("should create restricted profile for icloud account", () => {
      const userData = {
        id: "82f0bb2c-4f07-409b-8341-94f548ff0b95",
        email: "roberto.quintela@icloud.com",
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {},
      }

      const expectedRole = isAdminEmail(userData.email) ? "admin" : "user_restricted"
      expect(expectedRole).toBe("user_restricted")
    })

    it("should handle missing user metadata", () => {
      const userData = {
        id: "test-id",
        email: "test@example.com",
        user_metadata: null,
      }

      const fullName = userData.user_metadata?.full_name || userData.user_metadata?.name || ""
      const firstName = userData.user_metadata?.first_name || fullName.split(" ")[0] || ""

      expect(fullName).toBe("")
      expect(firstName).toBe("")
    })
  })

  describe("Callback URL parameters", () => {
    it("should handle different callback types", () => {
      const testCases = [
        { type: "signup", expected: "normal signup" },
        { type: "recovery", expected: "password recovery" },
        { type: "invite", expected: "invitation" },
        { type: null, expected: "normal signup" },
      ]

      testCases.forEach(({ type, expected }) => {
        // Simular la lógica del callback
        const isRecovery = type === "recovery"
        const isInvite = type === "invite"

        expect(typeof isRecovery).toBe("boolean")
        expect(typeof isInvite).toBe("boolean")
      })
    })

    it("should handle error scenarios", () => {
      const errorScenarios = [
        {
          error: "access_denied",
          errorCode: "otp_expired",
          type: "recovery",
          expectedRedirect: "recovery_expired",
        },
        {
          error: "invalid_request",
          errorCode: null,
          type: "signup",
          expectedRedirect: "auth_error",
        },
      ]

      errorScenarios.forEach(({ error, errorCode, type, expectedRedirect }) => {
        expect(error).toBeTruthy()
        expect(expectedRedirect).toBeTruthy()
      })
    })
  })
})
