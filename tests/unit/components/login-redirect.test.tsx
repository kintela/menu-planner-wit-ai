import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/auth/login-form"
import { supabase } from "@/lib/supabase/client"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    search: "",
  },
  writable: true,
})

describe("LoginForm Redirect", () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it("should redirect to weekly-menu after successful login when redirect param is present", async () => {
    // Mock URL with redirect parameter
    Object.defineProperty(window, "location", {
      value: {
        search: "?redirect=/weekly-menu",
      },
      writable: true,
    })

    // Mock successful login
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<LoginForm />)

    // Fill in form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    })

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    // Wait for redirect
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/weekly-menu")
      },
      { timeout: 200 },
    )
  })

  it("should redirect to home when no redirect param is present", async () => {
    // Mock URL without redirect parameter
    Object.defineProperty(window, "location", {
      value: {
        search: "",
      },
      writable: true,
    })

    // Mock successful login
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<LoginForm />)

    // Fill in form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    })

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    // Wait for redirect
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/")
      },
      { timeout: 200 },
    )
  })

  it("should handle login errors without redirecting", async () => {
    // Mock login error
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Invalid credentials" },
    })

    render(<LoginForm />)

    // Fill in form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "wrongpassword" },
    })

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
    })

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalled()
  })
})
