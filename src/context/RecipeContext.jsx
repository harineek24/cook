import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { mockRecipes } from '../data/mockRecipes'
import { API_URL } from '../config'

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

  const [customIngredients, setCustomIngredients] = useState([])

  // Fetch custom ingredients from backend on mount
  useEffect(() => {
    fetch(`${API_URL}/api/ingredients`)
      .then((r) => r.ok ? r.json() : [])
      .then(setCustomIngredients)
      .catch(() => setCustomIngredients([]))
  }, [])

  useEffect(() => {
    localStorage.setItem('cook-recipes', JSON.stringify(recipes))
  }, [recipes])

  const addRecipe = (recipe) => {
    const newRecipe = {
      ...recipe,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    }
    setRecipes((prev) => [newRecipe, ...prev])
  }

  // Called after the modal already created the ingredient via the API
  const addIngredient = useCallback((ingredient) => {
    setCustomIngredients((prev) => [...prev, ingredient])
  }, [])

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
