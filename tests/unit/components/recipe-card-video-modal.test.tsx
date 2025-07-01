import type React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import RecipeCard from "@/components/recipe-card"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock del componente VideoModal
jest.mock("@/components/video-modal", () => ({
  VideoModal: ({ videoUrl, recipeName }: { videoUrl: string; recipeName: string }) => (
    <button data-testid="video-modal-trigger" data-video-url={videoUrl} data-recipe-name={recipeName}>
      <svg data-testid="play-icon" />
    </button>
  ),
}))

// Mock de Next.js Link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
})

describe("RecipeCard Video Modal", () => {
  const mockRecipeWithVideo = {
    id: 1,
    name: "Paella Valenciana",
    ingredients: "Arroz, pollo, verduras",
    preparation: "Cocinar todo junto",
    image_url: "https://example.com/paella.jpg",
    calories: 450,
    user_id: "user123",
    is_ai_generated: false,
    video_url: "https://youtube.com/watch?v=abc123",
    source_url: null,
    created_at: "2024-01-15T10:00:00Z",
    user_profiles: {
      full_name: "Chef García",
      first_name: "María",
      last_name: "García",
      alias: "Chef García",
      avatar_url: "https://example.com/avatar.jpg",
      email: "chef@example.com",
    },
    categories: [
      { id: 1, name: "Almuerzo" },
      { id: 2, name: "Mediterránea" },
    ],
  }

  const mockRecipeWithoutVideo = {
    ...mockRecipeWithVideo,
    id: 2,
    name: "Ensalada Simple",
    video_url: null,
  }

  it("should render video modal button when recipe has video_url", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByTestId("video-modal-trigger")
    expect(videoButton).toBeInTheDocument()
    expect(videoButton).toHaveAttribute("data-video-url", "https://youtube.com/watch?v=abc123")
    expect(videoButton).toHaveAttribute("data-recipe-name", "Paella Valenciana")

    const playIcon = screen.getByTestId("play-icon")
    expect(playIcon).toBeInTheDocument()
  })

  it("should not render video modal button when recipe has no video_url", () => {
    render(<RecipeCard recipe={mockRecipeWithoutVideo} />)

    const videoButton = screen.queryByTestId("video-modal-trigger")
    expect(videoButton).not.toBeInTheDocument()

    const playIcon = screen.queryByTestId("play-icon")
    expect(playIcon).not.toBeInTheDocument()
  })

  it("should render video modal button in the correct position (top-right of image)", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByTestId("video-modal-trigger")
    const buttonContainer = videoButton.closest(".absolute.top-2.right-2")

    expect(buttonContainer).toBeInTheDocument()
    expect(buttonContainer).toHaveClass("absolute", "top-2", "right-2", "flex", "gap-1")
  })

  it("should render both video and source buttons when both URLs are present", () => {
    const recipeWithBoth = {
      ...mockRecipeWithVideo,
      source_url: "https://example.com/recipe-source",
    }

    render(<RecipeCard recipe={recipeWithBoth} />)

    const videoButton = screen.getByTestId("video-modal-trigger")
    expect(videoButton).toBeInTheDocument()

    const sourceButton = screen.getByRole("link", { name: /external/i })
    expect(sourceButton).toBeInTheDocument()
    expect(sourceButton).toHaveAttribute("href", "https://example.com/recipe-source")
    expect(sourceButton).toHaveAttribute("target", "_blank")
  })

  it("should pass correct props to VideoModal component", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByTestId("video-modal-trigger")
    expect(videoButton).toHaveAttribute("data-video-url", mockRecipeWithVideo.video_url)
    expect(videoButton).toHaveAttribute("data-recipe-name", mockRecipeWithVideo.name)
  })

  it("should render recipe card with all other elements when video is present", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    // Verificar que todos los elementos principales están presentes
    expect(screen.getByText("Paella Valenciana")).toBeInTheDocument()
    expect(screen.getByText("Arroz, pollo, verduras")).toBeInTheDocument()
    expect(screen.getByText("Chef García")).toBeInTheDocument()
    expect(screen.getByText("450 cal")).toBeInTheDocument()
    expect(screen.getByText("Almuerzo")).toBeInTheDocument()
    expect(screen.getByText("Mediterránea")).toBeInTheDocument()

    // Verificar botones de acción
    expect(screen.getByRole("link", { name: /ver/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /editar/i })).toBeInTheDocument()

    // Verificar que el botón de video también está presente
    expect(screen.getByTestId("video-modal-trigger")).toBeInTheDocument()
  })
})
