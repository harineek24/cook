import { useState, useRef, useCallback } from 'react'

export default function RecipeCard({ recipe }) {
  const [showTranscription, setShowTranscription] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef(null)
  const cardRef = useRef(null)

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

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#recipe-${recipe.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [recipe.id])

  const handleDownloadImage = useCallback(async () => {
    const el = cardRef.current
    if (!el) return
    // Dynamically import html2canvas
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })
    const link = document.createElement('a')
    link.download = `${recipe.title.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [recipe.title])

  const handlePrint = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html><head><title>${recipe.title}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #3d2c1e; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .meta { color: #8a7560; font-size: 14px; margin-bottom: 20px; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 15px; line-height: 1.7; }
        .transcription { background: #f5f0eb; padding: 16px; border-radius: 8px; font-style: italic; margin-top: 16px; }
      </style></head><body>
        <h1>${recipe.title}</h1>
        <div class="meta">${recipe.author} · ${recipe.cookTime} · ${recipe.servings} servings · ${formatDate(recipe.createdAt)}</div>
        <pre>${recipe.content}</pre>
        ${recipe.transcription ? `<div class="transcription">"${recipe.transcription}"</div>` : ''}
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [recipe])

  const handleDownloadAudio = useCallback(() => {
    if (!recipe.audioUrl) return
    const link = document.createElement('a')
    link.href = recipe.audioUrl
    link.download = `${recipe.title.replace(/\s+/g, '-').toLowerCase()}-audio.webm`
    link.click()
  }, [recipe.audioUrl, recipe.title])

  const handleShareAudio = useCallback(() => {
    if (!recipe.audioUrl) return
    const url = `${window.location.origin}${recipe.audioUrl}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [recipe.audioUrl])

  return (
    <article
      id={`recipe-${recipe.id}`}
      ref={cardRef}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-50">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-display font-semibold text-brown">
            {recipe.title}
          </h2>
          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-brown-light/50 hover:text-brown hover:bg-sand/30 transition-all"
              title="Copy link"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>
            {/* Download as image */}
            <button
              onClick={handleDownloadImage}
              className="p-1.5 rounded-lg text-brown-light/50 hover:text-brown hover:bg-sand/30 transition-all"
              title="Download as image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-brown-light/50 hover:text-brown hover:bg-sand/30 transition-all"
              title="Print recipe"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>
        </div>
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
              {/* Download audio */}
              <button
                onClick={handleDownloadAudio}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Download audio"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
              {/* Share audio */}
              <button
                onClick={handleShareAudio}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Copy audio link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
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
