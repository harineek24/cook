import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { mockRecipes } from '../data/mockRecipes'

const RecipeContext = createContext()

export function RecipeProvider({ children }) {
  const [recipes, setRecipes] = useState([])
  const [customIngredients, setCustomIngredients] = useState([])
  const [loaded, setLoaded] = useState(false)

  // Fetch recipes from DB on mount; seed mock recipes if empty
  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.ok ? r.json() : [])
      .then(async (rows) => {
        if (rows.length > 0) {
          setRecipes(rows)
        } else {
          // Seed mock recipes into the DB
          const seeded = []
          for (const r of mockRecipes) {
            try {
              const res = await fetch('/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(r),
              })
              if (res.ok) seeded.push(await res.json())
            } catch { /* skip failed seeds */ }
          }
          setRecipes(seeded)
        }
        setLoaded(true)
      })
      .catch(() => {
        setRecipes(mockRecipes)
        setLoaded(true)
      })
  }, [])

  // Fetch custom ingredients from backend on mount
  useEffect(() => {
    fetch('/api/ingredients')
      .then((r) => r.ok ? r.json() : [])
      .then(setCustomIngredients)
      .catch(() => setCustomIngredients([]))
  }, [])

  const addRecipe = async (recipe) => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      })
      if (!res.ok) throw new Error('Failed to save recipe')
      const saved = await res.json()
      setRecipes((prev) => [saved, ...prev])
      return saved
    } catch (err) {
      // Fallback: add locally so the UI still works
      const fallback = {
        ...recipe,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      setRecipes((prev) => [fallback, ...prev])
      return fallback
    }
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
      customIngredients, addIngredient, loaded,
    }}>
      {children}
    </RecipeContext.Provider>
  )
}

export const useRecipes = () => useContext(RecipeContext)
