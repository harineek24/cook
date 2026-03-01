import express from 'express'
import cors from 'cors'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'crypto'
import pool from './db.js'

const app = express()

// ── Emoji lookup for auto-image generation ──────────────────────
const EMOJI_MAP = {
  chicken: '1f357', beef: '1f969', salmon: '1f41f', fish: '1f41f',
  shrimp: '1f990', prawn: '1f990', eggs: '1f95a', egg: '1f95a',
  bacon: '1f953', turkey: '1f983', meat: '1f356', 'hot dog': '1f32d',
  steak: '1f969', lobster: '1f99e', crab: '1f980', squid: '1f991',
  oyster: '1f9aa',
  cheese: '1f9c0', milk: '1f95b', butter: '1f9c8', yogurt: '1f95b',
  cream: '1f95b', 'ice cream': '1f368',
  avocado: '1f951', tomato: '1f345', potato: '1f954', carrot: '1f955',
  broccoli: '1f966', onion: '1f9c5', garlic: '1f9c4', corn: '1f33d',
  lettuce: '1f96c', 'bell pepper': '1fad1', pepper: '1fad1',
  mushroom: '1f344', cucumber: '1f952', 'sweet potato': '1f360',
  eggplant: '1f346', aubergine: '1f346', peas: '1fad1',
  beans: '1fad8', ginger: '1fada', cabbage: '1f96c', spinach: '1f96c',
  celery: '1f96c', zucchini: '1f952', pumpkin: '1f383',
  beetroot: '1f96c', radish: '1f96c', turnip: '1f96c',
  asparagus: '1f96c', kale: '1f96c', bok_choy: '1f96c',
  lemon: '1f34b', lime: '1f34b', strawberry: '1f353', banana: '1f34c',
  apple: '1f34e', 'green apple': '1f34f', orange: '1f34a',
  tangerine: '1f34a', peach: '1f351', grapes: '1f347',
  watermelon: '1f349', coconut: '1f965', mango: '1f96d',
  pineapple: '1f34d', cherry: '1f352', cherries: '1f352',
  blueberry: '1fab0', kiwi: '1f95d', pear: '1f350', melon: '1f348',
  plum: '1f351', fig: '1f351', pomegranate: '1f351',
  raspberry: '1f353', blackberry: '1f353', cranberry: '1f353',
  guava: '1f351', papaya: '1f351', dragonfruit: '1f351',
  passionfruit: '1f351', lychee: '1f351', date: '1f351',
  rice: '1f35a', pasta: '1f35d', noodles: '1f35c', bread: '1f35e',
  wheat: '1f33e', millet: '1f33e', barley: '1f33e', oats: '1f33e',
  oatmeal: '1f33e', quinoa: '1f33e', couscous: '1f33e', bulgur: '1f33e',
  sorghum: '1f33e', rye: '1f33e', buckwheat: '1f33e', amaranth: '1f33e',
  cornmeal: '1f33d', polenta: '1f33d', grits: '1f33d', semolina: '1f33e',
  honey: '1f36f', peanuts: '1f95c', peanut: '1f95c',
  chili: '1f336-fe0f', 'chili pepper': '1f336-fe0f',
  'olive oil': '1fad2', oil: '1fad2', flour: '1f35e',
  salt: '1f9c2', sugar: '1f36c', chocolate: '1f36b',
  cookie: '1f36a', cake: '1f370', pie: '1f967', pizza: '1f355',
  taco: '1f32e', burrito: '1f32f', sandwich: '1f96a',
  waffle: '1f9c7', pancake: '1f95e', bagel: '1f96f',
  pretzel: '1f968', croissant: '1f950', baguette: '1f956',
  almond: '1f330', walnut: '1f330', cashew: '1f330',
  pistachio: '1f330', hazelnut: '1f330', chestnut: '1f330',
  basil: '1f33f', mint: '1f33f', parsley: '1f33f', cilantro: '1f33f',
  rosemary: '1f33f', thyme: '1f33f', oregano: '1f33f', dill: '1f33f',
  sage: '1f33f', cinnamon: '1f33f', cumin: '1f33f', turmeric: '1f33f',
  paprika: '1f33f',
  coffee: '2615', tea: '1f375', wine: '1f377', beer: '1f37a',
  juice: '1f9c3', soda: '1f964', water: '1f4a7', smoothie: '1f964',
  tofu: '1f9c8', tempeh: '1f9c8', soy: '1f9c8', seaweed: '1f96c',
  kimchi: '1f96c', sauerkraut: '1f96c', pickles: '1f952',
  olives: '1fad2', capers: '1fad2', vinegar: '1fad2',
  mayo: '1fad8', ketchup: '1f9c8', mustard: '1f9c8',
  'soy sauce': '1f9c8', sriracha: '1f336-fe0f',
}

function findEmojiCodepoint(name) {
  const lower = name.toLowerCase().trim()
  if (EMOJI_MAP[lower]) return EMOJI_MAP[lower]
  for (const [key, code] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return code
  }
  return null
}


function codepointToEmoji(codepoint) {
  return codepoint.split('-').map(cp => String.fromCodePoint(parseInt(cp, 16))).join('')
}

// ── Database helpers ─────────────────────────────────────────────
async function saveImage(pngBuffer) {
  const id = crypto.randomUUID()
  await pool.query(
    'INSERT INTO images (id, data) VALUES ($1, $2)',
    [id, pngBuffer]
  )
  return `/api/uploads/${id}`
}

// ── Middleware ───────────────────────────────────────────────────
app.use(cors())
app.use(express.json())

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') ||
        /\.(heic|heif|jpg|jpeg|png|webp|avif|tiff?)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// ── Routes ──────────────────────────────────────────────────────

// Serve images from database
app.get('/api/uploads/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT data FROM images WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Image not found' })

    res.set('Content-Type', 'image/png')
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(rows[0].data)
  } catch (err) {
    console.error('Image fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch image' })
  }
})

// Process an uploaded image → transparent PNG
app.post('/api/images/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

    console.log(`Processing image: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`)

    let pngBuffer
    try {
      pngBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(256, 256, { fit: 'cover' })
        .png()
        .toBuffer()
    } catch (err) {
      console.error('Sharp conversion failed:', err.message)
      return res.status(400).json({
        error: `Cannot process this image format. ${err.message.includes('heif') ? 'HEIC/HEIF support not available — try converting to JPG first.' : 'Try a different image.'}`,
      })
    }

    const url = await saveImage(pngBuffer)
    console.log(`Saved processed image: ${url}`)
    res.json({ url })
  } catch (err) {
    console.error('Image processing error:', err)
    res.status(500).json({ error: 'Failed to process image. Try a JPG or PNG.' })
  }
})

// Helper: try fetching an image from a URL, return Buffer or null
async function tryFetchImage(url, label, timeoutMs = 30000) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    const elapsed = Date.now() - t0
    const ct = res.headers.get('content-type') || ''
    console.log(`${label}: ${res.status} in ${elapsed}ms, type=${ct}`)
    if (res.ok && ct.startsWith('image/')) {
      const buf = Buffer.from(await res.arrayBuffer())
      console.log(`${label}: got ${buf.length} bytes`)
      return { buffer: buf, elapsed, status: res.status }
    }
    const body = await res.text().catch(() => '')
    return { error: `${res.status}: ${body.slice(0, 100)}`, elapsed }
  } catch (err) {
    return { error: `${err.name}: ${err.message}`, elapsed: Date.now() - t0 }
  }
}

// Generate a transparent PNG for an ingredient name
// Returns both AI image AND emoji so the user can choose
app.post('/api/images/generate', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const trimmed = name.trim()

  // Get emoji match (always attempt)
  const codepoint = findEmojiCodepoint(trimmed)
  const emoji = codepoint ? codepointToEmoji(codepoint) : '\u{1F372}'

  // Try multiple image sources (all free, no key needed)
  let aiUrl = null
  const debug = {}

  // Spoonacular CDN uses lowercase hyphenated names: "tomato.jpg", "olive-oil.jpg"
  const spoonName = trimmed.toLowerCase().replace(/\s+/g, '-')

  // TheMealDB uses capitalized words: "Tomato.png", "Olive Oil.png"
  const mealDbName = trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('%20')

  // Also try just the first/main word for TheMealDB (e.g. "Tomato" from "diced tomatoes")
  const mainWord = trimmed.split(/\s+/).pop()
  const mealDbSimple = mainWord.charAt(0).toUpperCase() + mainWord.slice(1).toLowerCase()

  const endpoints = [
    { label: 'spoonacular', url: `https://img.spoonacular.com/ingredients_250x250/${spoonName}.jpg`, timeoutMs: 8000 },
    { label: 'mealdb', url: `https://www.themealdb.com/images/ingredients/${mealDbName}.png`, timeoutMs: 8000 },
    ...(mealDbSimple !== mealDbName ? [{ label: 'mealdb2', url: `https://www.themealdb.com/images/ingredients/${mealDbSimple}.png`, timeoutMs: 8000 }] : []),
  ]

  for (const ep of endpoints) {
    debug[ep.label] = 'trying...'
    const result = await tryFetchImage(ep.url, ep.label, ep.timeoutMs)

    if (result.buffer) {
      debug[ep.label] = `ok ${result.buffer.length}b in ${result.elapsed}ms`

      let pngBuffer = await sharp(result.buffer)
        .resize(256, 256, { fit: 'cover' })
        .png()
        .toBuffer()

      try {
        aiUrl = await saveImage(pngBuffer)
        debug[ep.label] += ` → saved`
      } catch (dbErr) {
        console.warn(`DB save failed, using data URL:`, dbErr.message)
        aiUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
        debug[ep.label] += ` → data-url`
      }
      break // success, stop trying other endpoints
    } else {
      debug[ep.label] = `fail: ${result.error}`
    }
  }

  console.log(`Results for "${trimmed}": ai=${aiUrl ? 'yes' : 'no'}, emoji=${emoji}, debug=${JSON.stringify(debug)}`)
  res.json({ url: aiUrl, emoji, matched: true, debug })
})

// Get custom ingredients
app.get('/api/ingredients', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, image, emoji, custom FROM ingredients ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    console.error('Fetch ingredients error:', err)
    res.status(500).json({ error: 'Failed to fetch ingredients' })
  }
})

// Add a custom ingredient
app.post('/api/ingredients', async (req, res) => {
  const { name, imageUrl, emoji } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' })

  try {
    const ingredient = {
      id: name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: name.trim(),
      image: imageUrl || null,
      emoji: emoji || null,
      custom: true,
    }

    await pool.query(
      'INSERT INTO ingredients (id, name, image, emoji, custom) VALUES ($1, $2, $3, $4, $5)',
      [ingredient.id, ingredient.name, ingredient.image, ingredient.emoji, ingredient.custom]
    )

    res.status(201).json(ingredient)
  } catch (err) {
    console.error('Add ingredient error:', err)
    res.status(500).json({ error: 'Failed to add ingredient' })
  }
})

// Delete a custom ingredient
app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ingredients WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete ingredient error:', err)
    res.status(500).json({ error: 'Failed to delete ingredient' })
  }
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Express error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

export default app
