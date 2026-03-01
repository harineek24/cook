import { useState, useRef, useCallback } from 'react'

export default function AddIngredientModal({ onSubmit, onClose, initialName = '', initialFile = null }) {
  const [name, setName] = useState(initialName)
  const [file, setFile] = useState(initialFile)
  const [preview, setPreview] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Show preview for initialFile if provided
  useState(() => {
    if (initialFile && initialFile.type?.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(initialFile)
    }
  })

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setProcessing(true)
    setError(null)

    try {
      let imageUrl = null

      if (file) {
        // User provided an image — upload for processing
        setStatus('Converting to transparent PNG...')
        const formData = new FormData()
        formData.append('image', file)

        const imgRes = await fetch('/api/images/process', { method: 'POST', body: formData })
        if (!imgRes.ok) {
          const err = await imgRes.json().catch(() => ({}))
          throw new Error(err.error || 'Image processing failed')
        }
        const imgData = await imgRes.json()
        imageUrl = imgData.url
      }

      // If no image, try to auto-match an emoji
      let emoji = null
      if (!imageUrl) {
        setStatus('Finding a matching icon...')
        try {
          const genRes = await fetch('/api/images/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
          })
          if (genRes.ok) {
            const genData = await genRes.json()
            if (genData.emoji) emoji = genData.emoji
          }
        } catch {
          // Non-critical — ingredient will use letter avatar
        }
      }

      // Save the ingredient
      setStatus('Saving...')
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brown/30 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-brown">
            Add an Ingredient
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
              We&apos;ll auto-find a matching icon if you skip the image
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
            {processing ? status || 'Processing...' : 'Add to Fridge'}
          </button>
        </div>
      </form>
    </div>
  )
}
