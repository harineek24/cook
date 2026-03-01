// In production (Vercel), VITE_API_URL points to the Render backend.
// In development, it's empty and the Vite proxy handles /api requests.
export const API_URL = import.meta.env.VITE_API_URL || ''

// Resolve a backend path (like /api/uploads/abc) to a full URL in production
export function resolveUrl(path) {
  if (!path) return path
  if (path.startsWith('data:') || path.startsWith('http')) return path
  return `${API_URL}${path}`
}
