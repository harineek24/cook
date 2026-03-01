import app from './app.js'
import { initDb } from './db.js'

const PORT = process.env.PORT || 3001

async function start() {
  await initDb()
  console.log('Database tables initialized')

  app.listen(PORT, () => {
    console.log(`Cook API server running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
