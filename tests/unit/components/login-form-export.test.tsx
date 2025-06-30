import { render, screen } from "@testing-library/react"
import LoginForm from "@/components/auth/login-form"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

describe("LoginForm Export Test", () => {
  it("should export LoginForm as default without errors", () => {
    expect(LoginForm).toBeDefined()
    expect(typeof LoginForm).toBe("function")
  })

  it("should render LoginForm without module errors", () => {
    render(<LoginForm />)

    // Check that the form renders without throwing module errors
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
  })

  it("should have correct component structure", () => {
    render(<LoginForm />)

    // Verify the component has the expected structure
    const form = screen.getByRole("form", { name: /formulario de autenticación/i })
    expect(form).toBeInTheDocument()

    const submitButton = screen.getByRole("button", { name: /iniciar sesión/i })
    expect(submitButton).toBeInTheDocument()
  })

  it("should not have conflicting named exports", () => {
    // This test ensures there are no conflicting exports that cause module errors
    const component = require("@/components/auth/login-form")

    // Should have default export
    expect(component.default).toBeDefined()

    // Should not have conflicting named exports
    expect(component.LoginForm).toBeUndefined()
  })
})
