import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ingredients as defaultIngredients } from '../data/ingredients'
import { useRecipes } from '../context/RecipeContext'
import AddIngredientModal from '../components/AddIngredientModal'

function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

// Generate positions that avoid the center text area
function generatePositions(count) {
  const positions = []
  for (let i = 0; i < count; i++) {
    let top, left
    let attempts = 0
    do {
      top = 3 + seededRandom(i * 17 + attempts * 31 + 5) * 92
      left = 2 + seededRandom(i * 23 + attempts * 37 + 11) * 94
      attempts++
    } while (top > 28 && top < 72 && left > 15 && left < 85 && attempts < 100)
    positions.push({ top, left })
  }
  return positions
}

const floatClasses = ['float-1', 'float-2', 'float-3', 'float-4', 'float-5']
const sizes = ['text-3xl', 'text-4xl', 'text-5xl', 'text-4xl', 'text-3xl']

export default function Home() {
  const { customIngredients, addIngredient } = useRecipes()
  const [showModal, setShowModal] = useState(false)

  const allIngredients = useMemo(
    () => [...defaultIngredients, ...customIngredients],
    [customIngredients],
  )

  const positions = useMemo(
    () => generatePositions(allIngredients.length),
    [allIngredients.length],
  )

  const handleAddIngredient = (ingredient) => {
    addIngredient(ingredient)
    setShowModal(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Floating food items */}
      {allIngredients.map((item, i) => (
        <Link
          key={item.id}
          to={`/recipes/${item.id}`}
          className={`absolute ${!item.custom && item.featured ? 'text-6xl md:text-7xl' : (!item.custom ? sizes[i % sizes.length] : '')}
                     ${floatClasses[i % floatClasses.length]}
                     cursor-pointer hover:scale-150 transition-transform duration-300
                     select-none group z-10`}
          style={{
            top: `${positions[i].top}%`,
            left: `${positions[i].left}%`,
            animationDelay: `${(seededRandom(i * 7) * 5).toFixed(1)}s`,
          }}
        >
          {item.custom ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md"
              draggable={false}
            />
          ) : (
            <span className={item.featured ? 'drop-shadow-lg' : ''}>
              {item.emoji}
            </span>
          )}
          {/* Glow behind featured items */}
          {!item.custom && item.featured && (
            <span className="absolute inset-0 -z-10 bg-peach/20 rounded-full blur-xl scale-150" />
          )}
          {/* Glow behind custom items */}
          {item.custom && (
            <span className="absolute inset-0 -z-10 bg-honey/30 rounded-full blur-xl scale-150" />
          )}
          {/* Hover tooltip */}
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-8
                         bg-white/95 backdrop-blur text-brown text-xs font-semibold
                         px-3 py-1.5 rounded-full shadow-md
                         opacity-0 group-hover:opacity-100 transition-all duration-200
                         whitespace-nowrap pointer-events-none">
            {item.name}
          </span>
        </Link>
      ))}

      {/* Center question */}
      <div className="relative z-20 flex items-center justify-center min-h-screen pointer-events-none px-4">
        <div className="text-center pointer-events-auto">
          <div className="bg-cream/70 backdrop-blur-md rounded-3xl px-8 md:px-16 py-10 md:py-14 shadow-lg shadow-peach/10">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-brown leading-tight">
              What&apos;s in your
              <br />
              <span className="text-coral italic">fridge</span>
              <span className="text-peach">?</span>
            </h1>
            <p className="mt-4 text-brown-light text-base md:text-lg max-w-lg mx-auto leading-relaxed">
              Tap any ingredient to discover recipes, share your own,
              or record a voice recipe
            </p>
          </div>
        </div>
      </div>

      {/* Add ingredient FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-peach text-white rounded-full
                   shadow-lg shadow-peach/30 hover:bg-coral hover:scale-110
                   transition-all duration-200 flex items-center justify-center group"
        title="Add an ingredient"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="absolute right-full mr-3 bg-white/95 backdrop-blur text-brown text-sm
                       font-medium px-3 py-1.5 rounded-full shadow-md whitespace-nowrap
                       opacity-0 group-hover:opacity-100 transition-all duration-200
                       pointer-events-none">
          Add ingredient
        </span>
      </button>

      {/* Add ingredient modal */}
      {showModal && (
        <AddIngredientModal
          onSubmit={handleAddIngredient}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
