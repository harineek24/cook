import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    } while (top > 38 && top < 62 && left > 20 && left < 80 && attempts < 100)
    positions.push({ top, left })
  }
  return positions
}

const floatClasses = ['float-1', 'float-2', 'float-3', 'float-4', 'float-5']
const sizes = ['text-3xl', 'text-4xl', 'text-5xl', 'text-4xl', 'text-3xl']

export default function Home() {
  const { customIngredients, addIngredient } = useRecipes()
  const [showModal, setShowModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addFromSearch, setAddFromSearch] = useState('')
  const [addFromFile, setAddFromFile] = useState(null)
  const [addFromIdentified, setAddFromIdentified] = useState(null) // { name, imageUrl }
  const [identifying, setIdentifying] = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)
  const cameraInputRef = useRef(null)
  const navigate = useNavigate()

  const allIngredients = useMemo(
    () => [...defaultIngredients, ...customIngredients],
    [customIngredients],
  )

  const positions = useMemo(
    () => generatePositions(allIngredients.length),
    [allIngredients.length],
  )

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return allIngredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 8)
  }, [searchQuery, allIngredients])

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  const handleAddIngredient = (ingredient) => {
    addIngredient(ingredient)
    setShowModal(false)
    setAddFromSearch('')
    setAddFromFile(null)
  }

  const handleSearchSelect = (item) => {
    navigate(`/recipes/${item.id}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const handleSearchAddNew = () => {
    setAddFromSearch(searchQuery)
    setSearchOpen(false)
    setSearchQuery('')
    setShowModal(true)
  }

  const handleImageSearch = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setSearchOpen(false)
    setSearchQuery('')
    setIdentifying(true)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/images/identify', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.identified && data.name) {
        // Vision API identified the ingredient — open modal with pre-filled name + image
        setAddFromIdentified({ name: data.name, imageUrl: data.imageUrl })
        setAddFromFile(null)
      } else {
        // Could not identify — fall back to manual entry with the image
        setAddFromFile(file)
        setAddFromIdentified(null)
      }
    } catch {
      // API error — fall back to manual entry
      setAddFromFile(file)
      setAddFromIdentified(null)
    }

    setIdentifying(false)
    setShowModal(true)
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
          {item.custom && item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md"
              draggable={false}
            />
          ) : item.custom && item.emoji ? (
            <span className="text-4xl drop-shadow-md">{item.emoji}</span>
          ) : item.custom ? (
            <span className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
                           bg-honey/30 rounded-full text-2xl font-display font-bold text-brown">
              {item.name.charAt(0).toUpperCase()}
            </span>
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
          <div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-brown leading-tight">
              <span className="bg-cream/70 backdrop-blur-sm rounded-xl px-4 py-1 inline-block shadow-sm">
                What&apos;s in your
              </span>
              <br />
              <span className="bg-cream/70 backdrop-blur-sm rounded-xl px-4 py-1 inline-block shadow-sm mt-1">
                <span className="text-coral italic">fridge</span>
                <span className="text-peach">?</span>
              </span>
            </h1>
            <p className="mt-4 text-brown-light text-sm md:text-base max-w-md mx-auto leading-relaxed
                         bg-cream/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
              Tap any ingredient to discover recipes, share your own,
              or record a voice recipe
            </p>
          </div>
        </div>
      </div>

      {/* Bottom-right controls: Search + Add */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3">
        {/* Search */}
        <div ref={searchContainerRef} className="relative">
          {searchOpen ? (
            <div className="flex flex-col items-end">
              {/* Search results dropdown */}
              {searchQuery.trim() && (
                <div className="absolute bottom-full mb-2 right-0 w-72 bg-white rounded-xl shadow-xl
                               border border-gray-100 overflow-hidden">
                  {searchResults.length > 0 ? (
                    <ul className="max-h-64 overflow-y-auto">
                      {searchResults.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => handleSearchSelect(item)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-peach/10
                                     transition-colors text-left"
                          >
                            {item.custom && item.image ? (
                              <img src={item.image} alt="" className="w-8 h-8 object-contain" />
                            ) : item.custom && item.emoji ? (
                              <span className="text-2xl">{item.emoji}</span>
                            ) : item.custom ? (
                              <span className="w-8 h-8 rounded-full bg-honey/30 flex items-center
                                             justify-center text-sm font-bold text-brown">
                                {item.name.charAt(0).toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-2xl">{item.emoji}</span>
                            )}
                            <span className="text-sm font-medium text-brown">{item.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-brown-light mb-2">
                        No ingredient found
                      </p>
                      <button
                        onClick={handleSearchAddNew}
                        className="text-sm font-medium text-coral hover:text-coral/80
                                 transition-colors"
                      >
                        + Add &ldquo;{searchQuery}&rdquo; as new ingredient
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Search input */}
              <div className="flex items-center bg-white rounded-full shadow-lg pl-4 pr-1.5 py-2 w-72">
                <svg className="w-5 h-5 text-brown-light mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ingredients..."
                  className="flex-1 text-sm text-brown placeholder:text-brown-light/50
                           outline-none bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchOpen(false)
                      setSearchQuery('')
                    }
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      handleSearchSelect(searchResults[0])
                    }
                  }}
                />
                {/* Camera / image search button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-1.5 text-brown-light hover:text-coral transition-colors"
                  title="Search by photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  capture="environment"
                  onChange={handleImageSearch}
                  className="hidden"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                  className="p-1.5 text-brown-light hover:text-brown transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-14 h-14 bg-white text-brown rounded-full shadow-lg
                       hover:bg-gray-50 hover:scale-110
                       transition-all duration-200 flex items-center justify-center group"
              title="Search ingredients"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="absolute right-full mr-3 bg-white/95 backdrop-blur text-brown text-sm
                             font-medium px-3 py-1.5 rounded-full shadow-md whitespace-nowrap
                             opacity-0 group-hover:opacity-100 transition-all duration-200
                             pointer-events-none">
                Search
              </span>
            </button>
          )}
        </div>

        {/* Add ingredient FAB */}
        <button
          onClick={() => setShowModal(true)}
          className="w-14 h-14 bg-peach text-white rounded-full
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
      </div>

      {/* Identifying overlay */}
      {identifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-coral" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <p className="text-sm font-medium text-brown">Identifying ingredient...</p>
          </div>
        </div>
      )}

      {/* Add ingredient modal */}
      {showModal && (
        <AddIngredientModal
          onSubmit={handleAddIngredient}
          onClose={() => { setShowModal(false); setAddFromSearch(''); setAddFromFile(null); setAddFromIdentified(null) }}
          initialName={addFromIdentified?.name || addFromSearch}
          initialFile={addFromFile}
          identifiedImage={addFromIdentified?.imageUrl}
        />
      )}
    </div>
  )
}
