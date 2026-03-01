import app from '../server/app.js'
import { initDb } from '../server/db.js'

const dbReady = initDb().catch((err) => {
  console.error('Database init failed:', err)
})

export default async function handler(req, res) {
  await dbReady
  app(req, res)
}
