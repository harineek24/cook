import { createContext, useContext, useState, useEffect } from 'react'
import { mockRecipes } from '../data/mockRecipes'

const RecipeContext = createContext()

export function RecipeProvider({ children }) {
  const [recipes, setRecipes] = useState(() => {
    const stored = localStorage.getItem('cook-recipes')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return mockRecipes
      }
    }
    return mockRecipes
  })

  const [customIngredients, setCustomIngredients] = useState(() => {
    const stored = localStorage.getItem('cook-custom-ingredients')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('cook-recipes', JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    localStorage.setItem('cook-custom-ingredients', JSON.stringify(customIngredients))
  }, [customIngredients])

  const addRecipe = (recipe) => {
    const newRecipe = {
      ...recipe,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    }
    setRecipes((prev) => [newRecipe, ...prev])
  }

  const addIngredient = (ingredient) => {
    const newIngredient = {
      ...ingredient,
      id: ingredient.id || ingredient.name.toLowerCase().replace(/\s+/g, '-'),
      custom: true,
    }
    setCustomIngredients((prev) => [...prev, newIngredient])
  }

  const getRecipesByIngredient = (ingredientId) => {
    return recipes.filter((r) => r.ingredientId === ingredientId)
  }

  return (
    <RecipeContext.Provider value={{
      recipes, addRecipe, getRecipesByIngredient,
      customIngredients, addIngredient,
    }}>
      {children}
    </RecipeContext.Provider>
  )
}

export const useRecipes = () => useContext(RecipeContext)
