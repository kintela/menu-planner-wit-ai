"use client"

import { render, screen, fireEvent } from "@testing-library/react"
import { RecipeCard } from "@/components/recipe-card"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock del componente VideoModal
jest.mock("@/components/video-modal", () => ({
  VideoModal: ({ isOpen, onClose, videoUrl, title }: any) => (
    <div data-testid="video-modal" style={{ display: isOpen ? "block" : "none" }}>
      <div>Video Modal</div>
      <div>URL: {videoUrl}</div>
      <div>Title: {title}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

// Mock de Next.js Image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src || "/placeholder.svg"} alt={alt} {...props} />,
}))

// Mock de Next.js Link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockRecipeWithVideo = {
  id: 1,
  name: "Paella Valenciana",
  ingredients: "Arroz, pollo, conejo, judías verdes",
  preparation: "Sofreír las carnes, añadir las verduras, incorporar el arroz y el caldo con azafrán.",
  image_url: "/test-image.jpg",
  calories: 450,
  user_id: "user1",
  is_ai_generated: false,
  video_url: "https://youtube.com/watch?v=example1",
  source_url: "https://recetasespanolas.com/paella",
  created_at: "2024-01-15T10:00:00Z",
  user_profiles: {
    full_name: "María García",
    first_name: "María",
  },
  recipe_categories: [{ categories: { id: 2, name: "Almuerzo" } }],
}

const mockRecipeWithoutVideo = {
  ...mockRecipeWithVideo,
  video_url: undefined,
}

describe("RecipeCard Video Modal", () => {
  it("should show video button when recipe has video_url", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByLabelText("Ver video de la receta")
    expect(videoButton).toBeInTheDocument()
    expect(videoButton).toHaveClass("absolute", "top-2", "right-2")
  })

  it("should not show video button when recipe has no video_url", () => {
    render(<RecipeCard recipe={mockRecipeWithoutVideo} />)

    const videoButton = screen.queryByLabelText("Ver video de la receta")
    expect(videoButton).not.toBeInTheDocument()
  })

  it("should open video modal when video button is clicked", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByLabelText("Ver video de la receta")
    const videoModal = screen.getByTestId("video-modal")

    // Initially modal should be hidden
    expect(videoModal).toHaveStyle({ display: "none" })

    // Click video button
    fireEvent.click(videoButton)

    // Modal should now be visible
    expect(videoModal).toHaveStyle({ display: "block" })
    expect(screen.getByText("URL: https://youtube.com/watch?v=example1")).toBeInTheDocument()
    expect(screen.getByText("Title: Paella Valenciana")).toBeInTheDocument()
  })

  it("should close video modal when close button is clicked", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByLabelText("Ver video de la receta")
    const videoModal = screen.getByTestId("video-modal")

    // Open modal
    fireEvent.click(videoButton)
    expect(videoModal).toHaveStyle({ display: "block" })

    // Close modal
    const closeButton = screen.getByText("Close")
    fireEvent.click(closeButton)
    expect(videoModal).toHaveStyle({ display: "none" })
  })

  it("should render other card elements correctly with video functionality", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    // Check that other elements are still present
    expect(screen.getByText("Paella Valenciana")).toBeInTheDocument()
    expect(screen.getByText("Por María García")).toBeInTheDocument()
    expect(screen.getByText("Almuerzo")).toBeInTheDocument()
    expect(screen.getByText("450 cal")).toBeInTheDocument()
    expect(screen.getByText("Ver Receta")).toBeInTheDocument()

    // Check that video button doesn't interfere with other functionality
    const recipeLink = screen.getByText("Paella Valenciana").closest("a")
    expect(recipeLink).toHaveAttribute("href", "/recipes/1")

    const sourceLink = screen.getByRole("link", { name: "" })
    expect(sourceLink).toHaveAttribute("href", "https://recetasespanolas.com/paella")
  })

  it("should position video button in top-right corner", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByLabelText("Ver video de la receta")
    expect(videoButton).toHaveClass("absolute", "top-2", "right-2", "z-10")
  })

  it("should pass correct props to VideoModal", () => {
    render(<RecipeCard recipe={mockRecipeWithVideo} />)

    const videoButton = screen.getByLabelText("Ver video de la receta")
    fireEvent.click(videoButton)

    expect(screen.getByText("URL: https://youtube.com/watch?v=example1")).toBeInTheDocument()
    expect(screen.getByText("Title: Paella Valenciana")).toBeInTheDocument()
  })
})
