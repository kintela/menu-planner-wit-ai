"use client"

import type React from "react"

import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react"
import { useState } from "react"

interface Recipe {
  name: string
  ingredients: string
  preparation: string
}

interface EditRecipeFormProps {
  initialRecipe?: Recipe
  onSubmit: (recipe: Recipe) => void
}

const Label = (props: any) => (
  <FormLabel fontSize="sm" fontWeight="md" color={useColorModeValue("gray.700", "gray.50")} {...props} />
)

const EditRecipeForm: React.FC<EditRecipeFormProps> = ({ initialRecipe, onSubmit }) => {
  const [name, setName] = useState(initialRecipe?.name || "")
  const [ingredients, setIngredients] = useState(initialRecipe?.ingredients || "")
  const [preparation, setPreparation] = useState(initialRecipe?.preparation || "")

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({ name, ingredients, preparation })
  }

  return (
    <Flex align={"center"} justify={"center"}>
      <Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6}>
        <Stack align={"center"}>
          <Heading fontSize={"4xl"}>Editar Receta</Heading>
        </Stack>
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl id="name" isRequired>
              <Label htmlFor="name">Nombre *</Label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
            <FormControl id="ingredients">
              <Label htmlFor="ingredients">Ingredientes</Label>
              <Textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
            </FormControl>
            <FormControl id="preparation">
              <Label htmlFor="preparation">Preparación</Label>
              <Textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} />
            </FormControl>
            <Stack spacing={10}>
              <Button
                bg={"blue.400"}
                color={"white"}
                _hover={{
                  bg: "blue.500",
                }}
                type="submit"
              >
                Guardar
              </Button>
            </Stack>
            <Text fontSize={"sm"} color={"gray.500"}>
              * Solo el nombre es obligatorio
            </Text>
          </Stack>
        </form>
      </Stack>
    </Flex>
  )
}

export default EditRecipeForm
