import { render, screen, fireEvent } from "@/tests/utils/test-utils"
import { CategorySelector } from "@/components/category-selector"
import { createMockCategory } from "@/tests/utils/test-utils"
import jest from "jest" // Import jest to fix the undeclared variable error

const mockCategories = [
  createMockCategory({ id: 1, name: "Desayunos" }),
  createMockCategory({ id: 2, name: "Almuerzos" }),
  createMockCategory({ id: 3, name: "Cenas" }),
]

describe("CategorySelector", () => {
  const mockOnCategoriesChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render all categories", () => {
    render(
      <CategorySelector
        categories={mockCategories}
        selectedCategories={[]}
        onCategoriesChange={mockOnCategoriesChange}
      />,
    )

    expect(screen.getByText("Desayunos")).toBeInTheDocument()
    expect(screen.getByText("Almuerzos")).toBeInTheDocument()
    expect(screen.getByText("Cenas")).toBeInTheDocument()
  })

  it("should show selected categories as checked", () => {
    render(
      <CategorySelector
        categories={mockCategories}
        selectedCategories={[1, 3]}
        onCategoriesChange={mockOnCategoriesChange}
      />,
    )

    const desayunosCheckbox = screen.getByRole("checkbox", { name: /desayunos/i })
    const almuerzosCheckbox = screen.getByRole("checkbox", { name: /almuerzos/i })
    const cenasCheckbox = screen.getByRole("checkbox", { name: /cenas/i })

    expect(desayunosCheckbox).toBeChecked()
    expect(almuerzosCheckbox).not.toBeChecked()
    expect(cenasCheckbox).toBeChecked()
  })

  it("should call onCategoriesChange when category is selected", () => {
    render(
      <CategorySelector
        categories={mockCategories}
        selectedCategories={[]}
        onCategoriesChange={mockOnCategoriesChange}
      />,
    )

    const desayunosCheckbox = screen.getByRole("checkbox", { name: /desayunos/i })
    fireEvent.click(desayunosCheckbox)

    expect(mockOnCategoriesChange).toHaveBeenCalledWith([1])
  })

  it("should call onCategoriesChange when category is deselected", () => {
    render(
      <CategorySelector
        categories={mockCategories}
        selectedCategories={[1, 2]}
        onCategoriesChange={mockOnCategoriesChange}
      />,
    )

    const desayunosCheckbox = screen.getByRole("checkbox", { name: /desayunos/i })
    fireEvent.click(desayunosCheckbox)

    expect(mockOnCategoriesChange).toHaveBeenCalledWith([2])
  })

  it("should handle empty categories array", () => {
    render(<CategorySelector categories={[]} selectedCategories={[]} onCategoriesChange={mockOnCategoriesChange} />)

    expect(screen.getByText(/categorías/i)).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })
})
