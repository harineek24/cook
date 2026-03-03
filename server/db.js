import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audio_recordings (
      id TEXT PRIMARY KEY,
      data BYTEA NOT NULL,
      mimetype TEXT NOT NULL DEFAULT 'audio/webm',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT,
      emoji TEXT,
      custom BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      ingredient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Anonymous',
      cook_time TEXT,
      servings INTEGER DEFAULT 1,
      content TEXT NOT NULL,
      audio_url TEXT,
      transcription TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export default pool
