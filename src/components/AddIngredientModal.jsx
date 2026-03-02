import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecipes } from '../context/RecipeContext'
import { ingredients as defaultIngredients } from '../data/ingredients'

export default function AddIngredientModal({ onSubmit, onClose, initialName = '', initialFile = null, identifiedImage = null }) {
  const [name, setName] = useState(initialName)
  const [file, setFile] = useState(initialFile)
  const [preview, setPreview] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Generated image preview state
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const [generatedEmoji, setGeneratedEmoji] = useState(null)

  // Cache processed file URL so we don't re-upload on name edits
  const [processedFileUrl, setProcessedFileUrl] = useState(null)

  // Check if ingredient already exists in the fridge (by name)
  const allIngredients = useMemo(
    () => [...defaultIngredients, ...customIngredients],
    [customIngredients],
  )

  const existingIngredient = useMemo(() => {
    const lower = name.trim().toLowerCase()
    if (!lower) return null
    return allIngredients.find(i => i.name.toLowerCase() === lower) || null
  }, [name, allIngredients])

  // Show preview for initialFile if provided
  useEffect(() => {
    if (initialFile && initialFile.type?.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(initialFile)
    }
  }, [initialFile])

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!f.type.startsWith('image/') && !f.name.match(/\.(heic|heif)$/i)) {
      setError('Please upload an image file')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }
    setError(null)
    setFile(f)
    // Clear any generated preview when user picks their own image
    setGeneratedUrl(null)
    setGeneratedEmoji(null)
    if (f.type.startsWith('image/') && !f.name.match(/\.(heic|heif)$/i)) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  // Which option the user picked: 'ai' or 'emoji'
  const [selectedOption, setSelectedOption] = useState(null)

  // Generate an AI image (or regenerate)
  const handleGenerate = async () => {
    setProcessing(true)
    setError(null)
    setStatus('Generating image...')
    setGeneratedUrl(null)
    setGeneratedEmoji(null)
    setSelectedOption(null)

    try {
      const genRes = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!genRes.ok) throw new Error('Generation failed')
      const genData = await genRes.json()

      setGeneratedUrl(genData.url || null)
      setGeneratedEmoji(genData.emoji || null)
      // Default to AI image if available, otherwise emoji
      setSelectedOption(genData.url ? 'ai' : 'emoji')
    } catch {
      setError('Image generation failed. You can try again or add without an image.')
    } finally {
      setProcessing(false)
      setStatus('')
    }
  }

  // Save the ingredient with whatever image we have
  const handleSave = async (imageUrl, emoji) => {
    setProcessing(true)
    setError(null)
    setStatus('Saving...')

    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), imageUrl, emoji }),
      })
      if (!res.ok) throw new Error('Failed to save ingredient')
      const ingredient = await res.json()
      onSubmit(ingredient)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
      setStatus('')
    }
  }

  // Go back to the form to edit the name
  const handleEditName = () => {
    setGeneratedUrl(null)
    setGeneratedEmoji(null)
    // Keep processedFileUrl cached so we don't re-upload
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    if (file) {
      // If we already processed this file, just show preview again
      if (processedFileUrl) {
        setGeneratedUrl(processedFileUrl)
        return
      }

      // User provided an image — upload and process, then show preview
      setProcessing(true)
      setError(null)
      setStatus('Converting to transparent PNG...')

      try {
        const formData = new FormData()
        formData.append('image', file)
        const imgRes = await fetch('/api/images/process', { method: 'POST', body: formData })
        if (!imgRes.ok) {
          const err = await imgRes.json().catch(() => ({}))
          throw new Error(err.error || 'Image processing failed')
        }
        const imgData = await imgRes.json()
        setProcessedFileUrl(imgData.url)
        setGeneratedUrl(imgData.url)
      } catch (err) {
        setError(err.message)
      } finally {
        setProcessing(false)
        setStatus('')
      }
    } else {
      // No image — generate an AI preview first
      await handleGenerate()
    }
  }

  // Are we in the "preview generated image" state?
  const showingGenerated = !!(generatedUrl || generatedEmoji)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brown/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-brown">
            {identifiedImage && !showingGenerated ? 'Ingredient Found' : showingGenerated ? 'Preview' : 'Add an Ingredient'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-brown-light hover:text-brown transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {identifiedImage && !showingGenerated ? (
          /* ── Identified ingredient confirmation ── */
          <div className="px-6 pb-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-2xl bg-sand/30 overflow-hidden shadow-sm">
                <img src={identifiedImage} alt={name} className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-xs text-brown-light/60 mb-1">Detected ingredient</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-center text-lg font-display font-semibold text-brown
                             border-b-2 border-dashed border-peach/40 focus:border-coral
                             outline-none bg-transparent px-2 py-1 transition-colors"
                />
                <p className="text-xs text-brown-light/40 mt-1">Tap to edit if wrong</p>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mt-3">{error}</p>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium rounded-full
                           border border-gray-200 text-brown-light hover:text-brown
                           hover:border-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(identifiedImage, null)}
                disabled={!name.trim() || processing}
                className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {processing && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                )}
                {processing ? 'Saving...' : 'Add to Fridge'}
              </button>
            </div>
          </div>
        ) : showingGenerated ? (
          /* ── Generated image preview — pick AI or emoji ── */
          <div className="px-6 pb-6">
            <p className="text-sm text-brown font-medium text-center mb-1">{name.trim()}</p>
            <p className="text-xs text-brown-light/60 text-center mb-4">Choose an image for this ingredient</p>

            {/* Side-by-side options */}
            <div className="flex justify-center gap-4">
              {generatedUrl && (
                <button
                  type="button"
                  onClick={() => setSelectedOption('ai')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all
                    ${selectedOption === 'ai'
                      ? 'border-coral bg-coral/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="w-24 h-24 rounded-xl bg-sand/30 flex items-center justify-center overflow-hidden">
                    <img src={generatedUrl} alt={name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-medium text-brown">AI Image</span>
                </button>
              )}
              {generatedEmoji && (
                <button
                  type="button"
                  onClick={() => setSelectedOption('emoji')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all
                    ${selectedOption === 'emoji'
                      ? 'border-coral bg-coral/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="w-24 h-24 rounded-xl bg-sand/30 flex items-center justify-center">
                    <span className="text-5xl">{generatedEmoji}</span>
                  </div>
                  <span className="text-xs font-medium text-brown">Emoji</span>
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm text-center mt-3">{error}</p>
            )}

            {/* Actions */}
            {existingIngredient ? (
              /* Ingredient already in fridge */
              <div className="mt-5">
                <p className="text-sm text-center text-green-600 font-medium mb-4">
                  This ingredient is already in your fridge!
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleEditName}
                    className="px-5 py-2.5 text-sm font-medium rounded-full
                               border border-gray-200 text-brown-light hover:text-brown
                               hover:border-gray-300 transition-all
                               flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    No, edit name
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/recipes/${existingIngredient.id}`)
                    }}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  const useAi = selectedOption === 'ai'
                  handleSave(useAi ? generatedUrl : null, useAi ? null : generatedEmoji)
                }}
                disabled={processing || !selectedOption}
                className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {processing && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                )}
                {processing ? 'Saving...' : 'Add to Fridge'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Normal form ── */
          <form onSubmit={handleSubmit}>
            <div className="px-6 pb-6 space-y-4">
              {/* Name input */}
              <div>
                <input
                  type="text"
                  placeholder="Ingredient name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200
                             focus:border-peach focus:ring-2 focus:ring-peach/20 outline-none
                             text-brown placeholder:text-brown-light/50 transition-all"
                  required
                  autoFocus
                />
                <p className="text-xs text-brown-light/60 mt-1.5 px-1">
                  Skip the image and we&apos;ll auto-generate one
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
                           transition-all duration-200
                           ${isDragging
                             ? 'border-coral bg-coral/5 scale-[1.02]'
                             : preview || file
                               ? 'border-peach/50 bg-peach/5'
                               : 'border-gray-200 hover:border-peach hover:bg-peach/5'}`}
              >
                {preview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={preview} alt="Preview" className="w-16 h-16 object-contain" />
                    <p className="text-xs text-brown-light">Click or drop to replace</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-peach/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-brown">{file.name}</p>
                    <p className="text-xs text-brown-light">Will be converted to transparent PNG</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div className="w-10 h-10 rounded-full bg-sand/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-brown-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-brown">
                      Drop any image here
                      <span className="font-normal text-brown-light"> (optional)</span>
                    </p>
                    <p className="text-xs text-brown-light">
                      JPG, PNG, HEIC, WebP — auto-converted to transparent PNG
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={(e) => handleFile(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-brown-light hover:text-brown transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || processing}
                className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {processing && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                )}
                {processing ? status || 'Processing...' : file ? 'Continue' : 'Generate Preview'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
