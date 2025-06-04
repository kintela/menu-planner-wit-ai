import type React from "react"
import type { ReactElement } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { mockAuthContext } from "../__mocks__/supabase"

// Mock del provider de autenticación para tests
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="auth-provider">{children}</div>
}

// Custom render function que incluye providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    authUser?: any
  },
) => {
  // Configurar el usuario mock si se proporciona
  if (options?.authUser) {
    mockAuthContext.user = options.authUser
    mockAuthContext.loading = false
  }

  const Wrapper = ({ children }: { children?: React.ReactNode }) => {
    return <MockAuthProvider>{children}</MockAuthProvider>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Utilidades para crear datos de prueba
export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: {
    full_name: "Test User",
  },
  ...overrides,
})

export const createMockRecipe = (overrides = {}) => ({
  id: 1,
  name: "Test Recipe",
  ingredients: "Test ingredients",
  preparation: "Test preparation",
  image_url: "https://example.com/image.jpg",
  calories: 300,
  created_at: "2024-01-01T00:00:00Z",
  user_id: "test-user-id",
  is_ai_generated: false,
  ...overrides,
})

export const createMockCategory = (overrides = {}) => ({
  id: 1,
  name: "Test Category",
  description: "Test description",
  color: "#ff0000",
  ...overrides,
})

// Re-export everything
export * from "@testing-library/react"
export { customRender as render }
