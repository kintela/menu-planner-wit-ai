import { calculateCalories, getCaloriesPerServing, getCalorieLevel } from "@/lib/calories-calculator"

describe("Calories Calculator", () => {
  describe("calculateCalories", () => {
    it("should return 0 for empty ingredients", () => {
      expect(calculateCalories("")).toBe(0)
      expect(calculateCalories("   ")).toBe(0)
    })

    it("should calculate calories for simple ingredients", () => {
      const ingredients = "200g pollo\n100g arroz"
      const result = calculateCalories(ingredients)

      // 200g pollo (165 cal/100g) = 330 cal
      // 100g arroz (130 cal/100g) = 130 cal
      // Total = 460 cal
      expect(result).toBe(460)
    })

    it("should handle different units correctly", () => {
      const ingredients = "1kg pollo\n500ml leche"
      const result = calculateCalories(ingredients)

      // 1kg pollo = 1650 cal
      // 500ml leche = 210 cal
      // Total = 1860 cal
      expect(result).toBe(1860)
    })

    it("should handle ingredients without specific quantities", () => {
      const ingredients = "pollo\narroz"
      const result = calculateCalories(ingredients)

      // Default 100g each: 165 + 130 = 295
      expect(result).toBe(295)
    })

    it("should handle unknown ingredients with average calories", () => {
      const ingredients = "100g ingrediente_desconocido"
      const result = calculateCalories(ingredients)

      // Should use default 150 cal/100g
      expect(result).toBe(150)
    })

    it("should handle mixed known and unknown ingredients", () => {
      const ingredients = "100g pollo\n100g ingrediente_raro"
      const result = calculateCalories(ingredients)

      // 100g pollo = 165 cal, 100g unknown = 150 cal
      expect(result).toBe(315)
    })

    it("should handle decimal quantities", () => {
      const ingredients = "250.5g pollo"
      const result = calculateCalories(ingredients)

      // 250.5g pollo = 413.325 cal, rounded to 413
      expect(result).toBe(413)
    })
  })

  describe("getCaloriesPerServing", () => {
    it("should calculate calories per serving correctly", () => {
      expect(getCaloriesPerServing(800, 4)).toBe(200)
      expect(getCaloriesPerServing(600, 3)).toBe(200)
      expect(getCaloriesPerServing(500, 2)).toBe(250)
    })

    it("should use default 4 servings when not specified", () => {
      expect(getCaloriesPerServing(800)).toBe(200)
    })

    it("should round to nearest integer", () => {
      expect(getCaloriesPerServing(333, 3)).toBe(111)
    })
  })

  describe("getCalorieLevel", () => {
    it("should categorize calorie levels correctly", () => {
      expect(getCalorieLevel(150)).toEqual({
        level: "Bajo",
        color: "text-green-600",
      })

      expect(getCalorieLevel(300)).toEqual({
        level: "Moderado",
        color: "text-yellow-600",
      })

      expect(getCalorieLevel(500)).toEqual({
        level: "Alto",
        color: "text-orange-600",
      })

      expect(getCalorieLevel(700)).toEqual({
        level: "Muy Alto",
        color: "text-red-600",
      })
    })

    it("should handle boundary values correctly", () => {
      expect(getCalorieLevel(199)).toEqual({
        level: "Bajo",
        color: "text-green-600",
      })

      expect(getCalorieLevel(200)).toEqual({
        level: "Moderado",
        color: "text-yellow-600",
      })

      expect(getCalorieLevel(400)).toEqual({
        level: "Alto",
        color: "text-orange-600",
      })

      expect(getCalorieLevel(600)).toEqual({
        level: "Muy Alto",
        color: "text-red-600",
      })
    })
  })
})
