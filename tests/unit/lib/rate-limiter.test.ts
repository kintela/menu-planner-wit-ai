import { safeQuery } from "@/lib/supabase/rate-limiter"
import jest from "jest"

describe("safeQuery", () => {
  // Mock para console.log y console.error para evitar ruido en los tests
  const originalConsoleLog = console.log
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error

  beforeAll(() => {
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterAll(() => {
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("debería manejar correctamente una respuesta exitosa", async () => {
    const mockData = { id: 1, name: "Test" }
    const mockQueryFn = jest.fn().mockResolvedValue({ data: mockData, error: null })

    const result = await safeQuery(mockQueryFn, { endpoint: "test-endpoint" })

    expect(result).toEqual({ data: mockData, error: null })
    expect(mockQueryFn).toHaveBeenCalledTimes(1)
  })

  it("debería reintentar cuando se encuentra un error de rate limiting", async () => {
    const mockData = { id: 1, name: "Test" }
    const mockQueryFn = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "Too Many Requests" } })
      .mockResolvedValueOnce({ data: mockData, error: null })

    const result = await safeQuery(mockQueryFn, {
      endpoint: "test-endpoint",
      maxRetries: 3,
      baseDelay: 10, // Delay pequeño para tests
    })

    expect(result).toEqual({ data: mockData, error: null })
    expect(mockQueryFn).toHaveBeenCalledTimes(2)
  })

  it('debería manejar excepciones con mensaje "Too Many Requests"', async () => {
    const mockError = new Error("Too Many Requests")
    const mockQueryFn = jest
      .fn()
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({ data: { id: 1 }, error: null })

    const result = await safeQuery(mockQueryFn, {
      endpoint: "test-endpoint",
      maxRetries: 3,
      baseDelay: 10,
    })

    expect(result).toEqual({ data: { id: 1 }, error: null })
    expect(mockQueryFn).toHaveBeenCalledTimes(2)
  })

  it("debería devolver un error después de agotar los reintentos", async () => {
    const mockError = { message: "Too Many Requests" }
    const mockQueryFn = jest.fn().mockResolvedValue({ data: null, error: mockError })

    const result = await safeQuery(mockQueryFn, {
      endpoint: "test-endpoint",
      maxRetries: 2,
      baseDelay: 10,
    })

    expect(result).toEqual({ data: null, error: mockError })
    expect(mockQueryFn).toHaveBeenCalledTimes(3) // Intento inicial + 2 reintentos
  })

  it("debería manejar errores que no son de rate limiting sin reintentos", async () => {
    const mockError = { message: "Not Found" }
    const mockQueryFn = jest.fn().mockResolvedValue({ data: null, error: mockError })

    const result = await safeQuery(mockQueryFn, { endpoint: "test-endpoint" })

    expect(result).toEqual({ data: null, error: mockError })
    expect(mockQueryFn).toHaveBeenCalledTimes(1) // Sin reintentos
  })
})
