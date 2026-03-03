import { useState, useRef, useEffect } from 'react'

export default function RecipeForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('')
  const [content, setContent] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribing, setTranscribing] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const localUrl = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(localUrl)
        stream.getTracks().forEach((track) => track.stop())

        setTranscribing(true)
        try {
          // Upload audio to DB and transcribe in parallel
          const uploadForm = new FormData()
          uploadForm.append('audio', blob, 'recording.webm')

          const transcribeForm = new FormData()
          transcribeForm.append('audio', blob, 'recording.webm')

          const [uploadRes, transcribeRes] = await Promise.all([
            fetch('/api/audio/upload', { method: 'POST', body: uploadForm }),
            fetch('/api/audio/transcribe', { method: 'POST', body: transcribeForm }),
          ])

          // Use server URL for the audio so it persists in the DB
          if (uploadRes.ok) {
            const { audioUrl: serverUrl } = await uploadRes.json()
            URL.revokeObjectURL(localUrl)
            setAudioUrl(serverUrl)
          }

          if (transcribeRes.ok) {
            const data = await transcribeRes.json()
            if (data.structured?.trim()) {
              setContent(data.structured)
            } else if (data.transcript?.trim()) {
              setContent(data.transcript)
            }
          }
        } catch {
          // Upload/transcription failed silently — user can still type manually
        } finally {
          setTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch {
      alert('Could not access microphone. Please allow microphone permissions.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const removeRecording = () => {
    if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    onSubmit({
      title: title.trim(),
      author: author.trim() || 'Anonymous',
      cookTime: cookTime.trim() || 'N/A',
      servings: parseInt(servings) || 1,
      content: content.trim(),
      audioUrl: audioUrl || null,
      transcription: audioUrl ? content : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-display font-semibold text-brown">
          Share a New Recipe
        </h2>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-4">
        {/* Voice recording section — top of form */}
        <div className="bg-cream/50 rounded-lg p-4">
          <p className="text-sm font-medium text-brown mb-1">
            Record Your Recipe
          </p>
          <p className="text-xs text-brown-light/60 mb-3">
            Speak your recipe and we&apos;ll auto-generate a numbered ingredient &amp; instruction list
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {!isRecording && !audioUrl && (
              <button
                type="button"
                onClick={startRecording}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <span className="w-3 h-3 bg-coral rounded-full" />
                Start Recording
              </button>
            )}

            {isRecording && (
              <button
                type="button"
                onClick={stopRecording}
                className="bg-coral text-white px-4 py-2 rounded-full text-sm
                         flex items-center gap-2 animate-pulse"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop Recording ({formatTime(recordingTime)})
              </button>
            )}

            {audioUrl && (
              <div className="flex items-center gap-3 flex-wrap">
                <audio src={audioUrl} controls className="h-10" />
                <button
                  type="button"
                  onClick={removeRecording}
                  className="text-sm text-brown-light hover:text-coral transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {transcribing && (
            <div className="flex items-center gap-2 mt-3 text-xs text-coral font-medium animate-pulse">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Transcribing &amp; formatting your recipe...
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-brown-light/40">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs font-medium">or type it out</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Title & Author */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Recipe title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200
                       focus:border-peach focus:ring-2 focus:ring-peach/20 outline-none
                       text-brown placeholder:text-brown-light/50 transition-all"
            required
          />
          <input
            type="text"
            placeholder="Your name (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200
                       focus:border-peach focus:ring-2 focus:ring-peach/20 outline-none
                       text-brown placeholder:text-brown-light/50 transition-all"
          />
        </div>

        {/* Cook time & Servings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Cook time (e.g., 30 min)"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200
                       focus:border-peach focus:ring-2 focus:ring-peach/20 outline-none
                       text-brown placeholder:text-brown-light/50 transition-all"
          />
          <input
            type="number"
            placeholder="Servings"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200
                       focus:border-peach focus:ring-2 focus:ring-peach/20 outline-none
                       text-brown placeholder:text-brown-light/50 transition-all"
            min="1"
          />
        </div>

        {/* Content textarea */}
        <div>
          <textarea
            placeholder="Write your recipe here... ingredients, steps, tips! *"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-gray-200
                       focus:border-peach focus:ring-2 focus:ring-peach/20 outline-none
                       text-brown placeholder:text-brown-light/50 transition-all resize-y"
            required
          />
          <p className="text-xs text-brown-light/50 mt-1 px-1">
            {audioUrl ? 'Auto-filled from your recording — feel free to edit' : 'Tip: use the recorder above to auto-fill this'}
          </p>
        </div>
      </div>

      {/* Form actions */}
      <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-brown-light hover:text-brown transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || !content.trim() || transcribing}
          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Share Recipe
        </button>
      </div>
    </form>
  )
}
