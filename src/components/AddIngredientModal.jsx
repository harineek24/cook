import { useState, useRef, useCallback } from 'react'

export default function AddIngredientModal({ onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [imageData, setImageData] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const processFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)')
      return
    }
    // Cap at 500KB for localStorage friendliness
    if (file.size > 512000) {
      alert('Image is too large. Please use an image under 500KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setImageData(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileSelect = (e) => {
    processFile(e.target.files[0])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !imageData) return
    onSubmit({ name: name.trim(), image: imageData })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brown/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
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
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                       transition-all duration-200
                       ${isDragging
                         ? 'border-coral bg-coral/5 scale-[1.02]'
                         : imageData
                           ? 'border-peach/50 bg-peach/5'
                           : 'border-gray-200 hover:border-peach hover:bg-peach/5'}`}
          >
            {imageData ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={imageData}
                  alt="Preview"
                  className="w-20 h-20 object-contain"
                />
                <p className="text-sm text-brown-light">
                  Click or drop to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-12 h-12 rounded-full bg-sand/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brown-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-brown">
                  Drop a PNG here
                </p>
                <p className="text-xs text-brown-light">
                  or click to browse (max 500KB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Name input */}
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
            disabled={!name.trim() || !imageData}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to Fridge
          </button>
        </div>
      </form>
    </div>
  )
}
