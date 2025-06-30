/**
 * Test para verificar que el componente LoginForm se exporta correctamente
 * y no causa errores de módulo
 */

import { render, screen } from "@testing-library/react"
import LoginForm from "@/components/auth/login-form"
import { jest } from "@jest/globals"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock de supabase client
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

// Mock de hooks/use-toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

describe("LoginForm Export Test", () => {
  it("should export LoginForm as default export without module errors", () => {
    // Verificar que el componente se puede importar sin errores
    expect(LoginForm).toBeDefined()
    expect(typeof LoginForm).toBe("function")
  })

  it("should render LoginForm component without throwing errors", () => {
    // Verificar que el componente se puede renderizar sin errores
    expect(() => {
      render(<LoginForm />)
    }).not.toThrow()

    // Verificar que los elementos básicos están presentes
    expect(screen.getByText("Iniciar Sesión")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument()
  })

  it("should have correct component structure for both login and signup modes", () => {
    render(<LoginForm />)

    // Verificar modo login por defecto
    expect(screen.getByText("Iniciar Sesión")).toBeInTheDocument()
    expect(screen.getByText("¿No tienes cuenta? Crear una nueva")).toBeInTheDocument()

    // Verificar que el botón de submit existe
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("should not have conflicting exports", () => {
    // Verificar que no hay exports con nombre que puedan causar conflictos
    const moduleExports = require("@/components/auth/login-form")

    // Debe tener solo el export default
    expect(moduleExports.default).toBeDefined()
    expect(typeof moduleExports.default).toBe("function")

    // No debe tener exports con nombre que causen conflictos
    expect(moduleExports.LoginForm).toBeUndefined()
  })
})
