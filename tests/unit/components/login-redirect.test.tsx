import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/auth/login-form"
import { supabase } from "@/lib/supabase/client"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

// Mock window.location
const mockLocation = {
  href: "",
  search: "",
}

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
})

describe("LoginForm Redirect", () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockLocation.href = ""
    mockLocation.search = ""
  })

  it("should redirect to /weekly-menu when redirect parameter is present", async () => {
    // Simular URL con parámetro redirect
    mockLocation.search = "?redirect=/weekly-menu"

    // Mock successful login
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<LoginForm />)

    // Llenar formulario
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockLocation.href).toBe("/weekly-menu")
    })
  })

  it("should redirect to / when no redirect parameter is present", async () => {
    // Mock successful login
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<LoginForm />)

    // Llenar formulario
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockLocation.href).toBe("/")
    })
  })

  it("should not redirect when login fails", async () => {
    // Mock failed login
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Invalid credentials" },
    })

    render(<LoginForm />)

    // Llenar formulario
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "wrongpassword" },
    })

    // Enviar formulario
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    // No debería haber redirección
    expect(mockLocation.href).toBe("")
  })

  it("should render login form correctly", () => {
    render(<LoginForm />)

    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("should toggle between login and signup modes", () => {
    render(<LoginForm />)

    // Inicialmente en modo login
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()

    // Cambiar a modo registro
    fireEvent.click(screen.getByText(/¿no tienes cuenta\? crear una nueva/i))

    expect(screen.getByText(/crear cuenta/i)).toBeInTheDocument()
    expect(screen.getByText(/mínimo 6 caracteres/i)).toBeInTheDocument()
  })
})
