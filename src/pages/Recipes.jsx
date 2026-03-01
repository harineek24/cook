import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { ingredients } from '../data/ingredients'
import { useRecipes } from '../context/RecipeContext'
import RecipeCard from '../components/RecipeCard'
import RecipeForm from '../components/RecipeForm'

export default function Recipes() {
  const { ingredientId } = useParams()
  const { getRecipesByIngredient, addRecipe } = useRecipes()
  const [showForm, setShowForm] = useState(false)

  const ingredient = ingredients.find((i) => i.id === ingredientId)
  const recipes = getRecipesByIngredient(ingredientId)

  if (!ingredient) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🤷</p>
          <p className="text-2xl text-brown mb-6">Ingredient not found</p>
          <Link to="/" className="btn-primary">
            Back to Fridge
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = (recipe) => {
    addRecipe({ ...recipe, ingredientId })
    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Google Docs-style toolbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="text-brown-light hover:text-brown transition-colors p-1"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">{ingredient.emoji}</span>
              <h1 className="text-lg sm:text-xl font-semibold text-brown">
                {ingredient.name} Recipes
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Recipe</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Add recipe form */}
        {showForm && (
          <div className="mb-8 animate-in">
            <RecipeForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Recipe count */}
        <p className="text-brown-light text-sm mb-6">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} shared
        </p>

        {/* Recipe list */}
        {recipes.length > 0 ? (
          <div className="space-y-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <span className="text-7xl mb-6 block">{ingredient.emoji}</span>
            <p className="text-brown-light text-lg mb-2">
              No recipes yet for {ingredient.name}
            </p>
            <p className="text-brown-light/60 text-sm mb-8">
              Be the first to share one!
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Share a Recipe
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
