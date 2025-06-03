import { renderHook } from "@testing-library/react"
import { useSession } from "@/hooks/use-session"
import { mockAuthContext } from "@/tests/__mocks__/supabase"
import { createMockUser } from "@/tests/utils/test-utils"
import jest from "jest" // Declaring jest variable

describe("useSession Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset auth context
    mockAuthContext.user = null
    mockAuthContext.loading = false
  })

  it("should return unauthenticated status when no user", () => {
    const { result } = renderHook(() => useSession())

    expect(result.current.data).toBeNull()
    expect(result.current.status).toBe("unauthenticated")
  })

  it("should return loading status when loading", () => {
    mockAuthContext.loading = true

    const { result } = renderHook(() => useSession())

    expect(result.current.status).toBe("loading")
  })

  it("should return authenticated status with user data", () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      user_metadata: { full_name: "Test User" },
    })
    mockAuthContext.user = mockUser

    const { result } = renderHook(() => useSession())

    expect(result.current.status).toBe("authenticated")
    expect(result.current.data).toEqual({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        image: undefined,
      },
      expires: expect.any(String),
    })
  })

  it("should use email as name fallback when no full_name", () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      user_metadata: {},
    })
    mockAuthContext.user = mockUser

    const { result } = renderHook(() => useSession())

    expect(result.current.data?.user.name).toBe("test")
  })

  it("should include avatar URL when available", () => {
    const mockUser = createMockUser({
      user_metadata: {
        full_name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
      },
    })
    mockAuthContext.user = mockUser

    const { result } = renderHook(() => useSession())

    expect(result.current.data?.user.image).toBe("https://example.com/avatar.jpg")
  })
})
