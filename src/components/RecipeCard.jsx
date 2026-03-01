import { useState, useRef } from 'react'

export default function RecipeCard({ recipe }) {
  const [showTranscription, setShowTranscription] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Generate a pastel avatar color from the author name
  const hue = recipe.author
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const avatarBg = `hsl(${hue}, 60%, 82%)`

  return (
    <article className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-50">
        <h2 className="text-lg sm:text-xl font-display font-semibold text-brown">
          {recipe.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-brown-light">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-brown/70 shrink-0"
              style={{ backgroundColor: avatarBg }}
            >
              {recipe.author[0].toUpperCase()}
            </div>
            <span>{recipe.author}</span>
          </div>
          <span className="text-gray-300">|</span>
          <span>{recipe.cookTime}</span>
          <span className="text-gray-300">|</span>
          <span>{recipe.servings} servings</span>
          <span className="text-gray-300">|</span>
          <span>{formatDate(recipe.createdAt)}</span>
        </div>
      </div>

      {/* Recipe content */}
      <div className="px-5 sm:px-6 py-5">
        <pre className="font-body text-brown/85 text-sm leading-relaxed whitespace-pre-wrap">
          {recipe.content}
        </pre>
      </div>

      {/* Audio / transcription controls */}
      {(recipe.audioUrl || recipe.transcription) && (
        <div className="px-5 sm:px-6 pb-5 flex flex-wrap items-center gap-3">
          {recipe.audioUrl && (
            <>
              <audio
                ref={audioRef}
                src={recipe.audioUrl}
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={toggleAudio}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {isPlaying ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Hear the Recipe
                  </>
                )}
              </button>
            </>
          )}

          {recipe.transcription && (
            <button
              onClick={() => setShowTranscription(!showTranscription)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showTranscription ? 'Hide' : 'View'} Transcription
            </button>
          )}
        </div>
      )}

      {/* Expanded transcription */}
      {showTranscription && recipe.transcription && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="bg-sand/20 rounded-lg p-4 text-sm text-brown/80 italic">
            &ldquo;{recipe.transcription}&rdquo;
          </div>
        </div>
      )}
    </article>
  )
}
