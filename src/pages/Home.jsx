import { Link } from 'react-router-dom'
import { ingredients } from '../data/ingredients'

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

const positions = generatePositions(ingredients.length)
const floatClasses = ['float-1', 'float-2', 'float-3', 'float-4', 'float-5']
const sizes = ['text-3xl', 'text-4xl', 'text-5xl', 'text-4xl', 'text-3xl']

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Floating food items */}
      {ingredients.map((item, i) => (
        <Link
          key={item.id}
          to={`/recipes/${item.id}`}
          className={`absolute ${item.featured ? 'text-6xl md:text-7xl' : sizes[i % sizes.length]}
                     ${floatClasses[i % floatClasses.length]}
                     cursor-pointer hover:scale-150 transition-transform duration-300
                     select-none group z-10`}
          style={{
            top: `${positions[i].top}%`,
            left: `${positions[i].left}%`,
            animationDelay: `${(seededRandom(i * 7) * 5).toFixed(1)}s`,
          }}
        >
          <span className={item.featured ? 'drop-shadow-lg' : ''}>
            {item.emoji}
          </span>
          {/* Glow behind featured items */}
          {item.featured && (
            <span className="absolute inset-0 -z-10 bg-peach/20 rounded-full blur-xl scale-150" />
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
    </div>
  )
}
