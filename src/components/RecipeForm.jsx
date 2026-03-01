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
  const [isListening, setIsListening] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  const speechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setContent(transcript)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      recognitionRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const toggleSpeechToText = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Try Chrome!')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        stream.getTracks().forEach((track) => track.stop())
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
    if (audioUrl) URL.revokeObjectURL(audioUrl)
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

        {/* Content textarea with speech-to-text */}
        <div className="relative">
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
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeechToText}
              className={`absolute bottom-3 right-3 p-2.5 rounded-full transition-all
                        ${isListening
                          ? 'bg-coral text-white animate-pulse shadow-lg shadow-coral/30'
                          : 'bg-sand/50 text-brown-light hover:bg-sand'}`}
              title={isListening ? 'Stop dictation' : 'Dictate recipe (speech to text)'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
              </svg>
            </button>
          )}
        </div>
        {isListening && (
          <p className="text-xs text-coral font-medium animate-pulse">
            Listening... speak your recipe and it will appear above
          </p>
        )}

        {/* Voice recording section */}
        <div className="bg-cream/50 rounded-lg p-4">
          <p className="text-sm font-medium text-brown mb-3">
            Voice Recording <span className="text-brown-light font-normal">(optional - let others hear your recipe)</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {!isRecording && !audioUrl && (
              <button
                type="button"
                onClick={startRecording}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <span className="w-3 h-3 bg-coral rounded-full" />
                Record Voice Recipe
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
              <div className="flex items-center gap-3">
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
          disabled={!title.trim() || !content.trim()}
          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Share Recipe
        </button>
      </div>
    </form>
  )
}
