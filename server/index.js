import express from 'express'
import cors from 'cors'
import multer from 'multer'
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

const UPLOADS_DIR = join(__dirname, 'uploads')
const DATA_FILE = join(__dirname, 'data.json')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

// ── Data helpers ────────────────────────────────────────────────
function readData() {
  if (!existsSync(DATA_FILE)) return { ingredients: [] }
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return { ingredients: [] }
  }
}

function writeData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// ── Emoji lookup for auto-image generation ──────────────────────
// Maps lowercase ingredient names → Twemoji codepoints
const EMOJI_MAP = {
  // Proteins
  chicken: '1f357', beef: '1f969', salmon: '1f41f', fish: '1f41f',
  shrimp: '1f990', prawn: '1f990', eggs: '1f95a', egg: '1f95a',
  bacon: '1f953', turkey: '1f983', meat: '1f356', 'hot dog': '1f32d',
  steak: '1f969', lobster: '1f99e', crab: '1f980', squid: '1f991',
  oyster: '1f9aa',
  // Dairy
  cheese: '1f9c0', milk: '1f95b', butter: '1f9c8', yogurt: '1f95b',
  cream: '1f95b', 'ice cream': '1f368',
  // Vegetables
  avocado: '1f951', tomato: '1f345', potato: '1f954', carrot: '1f955',
  broccoli: '1f966', onion: '1f9c5', garlic: '1f9c4', corn: '1f33d',
  lettuce: '1f96c', 'bell pepper': '1fad1', pepper: '1fad1',
  mushroom: '1f344', cucumber: '1f952', 'sweet potato': '1f360',
  eggplant: '1f346', aubergine: '1f346', peas: '1fad1',
  beans: '1fad8', ginger: '1fada', cabbage: '1f96c', spinach: '1f96c',
  celery: '1f96c', zucchini: '1f952', pumpkin: '1f383',
  beetroot: '1f96c', radish: '1f96c', turnip: '1f96c',
  asparagus: '1f96c', kale: '1f96c', bok_choy: '1f96c',
  // Fruits
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
  // Grains & pantry
  rice: '1f35a', pasta: '1f35d', noodles: '1f35c', bread: '1f35e',
  honey: '1f36f', peanuts: '1f95c', peanut: '1f95c',
  chili: '1f336-fe0f', 'chili pepper': '1f336-fe0f',
  'olive oil': '1fad2', oil: '1fad2', flour: '1f35e',
  salt: '1f9c2', sugar: '1f36c', chocolate: '1f36b',
  cookie: '1f36a', cake: '1f370', pie: '1f967', pizza: '1f355',
  taco: '1f32e', burrito: '1f32f', sandwich: '1f96a',
  waffle: '1f9c7', pancake: '1f95e', bagel: '1f96f',
  pretzel: '1f968', croissant: '1f950', baguette: '1f956',
  // Nuts & seeds
  almond: '1f330', walnut: '1f330', cashew: '1f330',
  pistachio: '1f330', hazelnut: '1f330', chestnut: '1f330',
  // Herbs & spices
  basil: '1f33f', mint: '1f33f', parsley: '1f33f', cilantro: '1f33f',
  rosemary: '1f33f', thyme: '1f33f', oregano: '1f33f', dill: '1f33f',
  sage: '1f33f', cinnamon: '1f33f', cumin: '1f33f', turmeric: '1f33f',
  paprika: '1f33f',
  // Beverages
  coffee: '2615', tea: '1f375', wine: '1f377', beer: '1f37a',
  juice: '1f9c3', soda: '1f964', water: '1f4a7', smoothie: '1f964',
  // Misc
  tofu: '1f9c8', tempeh: '1f9c8', soy: '1f9c8', seaweed: '1f96c',
  kimchi: '1f96c', sauerkraut: '1f96c', pickles: '1f952',
  olives: '1fad2', capers: '1fad2', vinegar: '1fad2',
  mayo: '1fad8', ketchup: '1f9c8', mustard: '1f9c8',
  'soy sauce': '1f9c8', sriracha: '1f336-fe0f',
}

function findEmojiCodepoint(name) {
  const lower = name.toLowerCase().trim()
  // Exact match
  if (EMOJI_MAP[lower]) return EMOJI_MAP[lower]
  // Partial match — check if any key is contained in the name or vice versa
  for (const [key, code] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return code
  }
  return null
}

// ── Background removal (flood-fill from edges) ─────────────────
async function removeBackground(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  if (channels !== 4) return inputBuffer

  const pixelCount = width * height
  // Track which pixels have been visited and which are background
  const visited = new Uint8Array(pixelCount)
  const isBg = new Uint8Array(pixelCount)

  const idx = (x, y) => y * width + x
  const pixelAt = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]

  function colorDist(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
  }

  // Flood fill from all edge pixels.
  // A pixel is background if it's similar enough to its neighbor that
  // initiated the fill (adaptive threshold based on local context).
  const tolerance = 40
  const queue = []

  // Seed all edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(idx(x, 0))
    queue.push(idx(x, height - 1))
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(idx(0, y))
    queue.push(idx(width - 1, y))
  }

  // Mark seeds
  for (const i of queue) {
    visited[i] = 1
    isBg[i] = 1
  }

  // BFS flood fill
  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  let head = 0
  while (head < queue.length) {
    const ci = queue[head++]
    const cx = ci % width
    const cy = (ci - cx) / width
    const cColor = pixelAt(ci)

    for (const [dx, dy] of neighbors) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      const ni = idx(nx, ny)
      if (visited[ni]) continue

      const nColor = pixelAt(ni)
      const dist = colorDist(cColor, nColor)

      if (dist < tolerance) {
        visited[ni] = 1
        isBg[ni] = 1
        queue.push(ni)
      } else {
        // Mark as visited but NOT background (it's an edge/foreground pixel)
        visited[ni] = 1
      }
    }
  }

  // Apply the mask: background pixels → transparent, with edge feathering
  // First pass: count background neighbors for feathering
  const feather = new Float32Array(pixelCount)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y)
      if (isBg[i]) {
        feather[i] = 0 // fully transparent
        continue
      }
      // Count how many of the surrounding 5x5 pixels are background
      let bgCount = 0
      let total = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const sx = x + dx
          const sy = y + dy
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
          total++
          if (isBg[idx(sx, sy)]) bgCount++
        }
      }
      // If surrounded by some background, partially transparent (feathered edge)
      feather[i] = total > 0 ? 1 - (bgCount / total) : 1
    }
  }

  // Apply alpha
  for (let i = 0; i < pixelCount; i++) {
    const alpha = Math.round(feather[i] * 255)
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], alpha)
  }

  return sharp(data, { raw: { width, height, channels } })
    .png()
    .toBuffer()
}

// Convert codepoint string to emoji character
function codepointToEmoji(codepoint) {
  return codepoint.split('-').map(cp => String.fromCodePoint(parseInt(cp, 16))).join('')
}

// ── Middleware ───────────────────────────────────────────────────
app.use(cors())
app.use(express.json())
app.use('/api/uploads', express.static(UPLOADS_DIR))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept any image mimetype + HEIC/HEIF by extension
    if (file.mimetype.startsWith('image/') ||
        /\.(heic|heif|jpg|jpeg|png|webp|avif|tiff?)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// ── Routes ──────────────────────────────────────────────────────

// Process an uploaded image → transparent PNG
app.post('/api/images/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

    console.log(`Processing image: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`)

    // Step 1: Auto-orient (EXIF rotation from phones) + convert to PNG
    let pngBuffer
    try {
      pngBuffer = await sharp(req.file.buffer)
        .rotate()  // auto-orient based on EXIF
        .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer()
    } catch (err) {
      console.error('Sharp conversion failed:', err.message)
      return res.status(400).json({
        error: `Cannot process this image format. ${err.message.includes('heif') ? 'HEIC/HEIF support not available — try converting to JPG first.' : 'Try a different image.'}`,
      })
    }

    // Step 2: Background removal
    try {
      pngBuffer = await removeBackground(pngBuffer)
    } catch (e) {
      console.warn('Background removal skipped:', e.message)
    }

    // Step 3: Save
    const filename = `${crypto.randomUUID()}.png`
    writeFileSync(join(UPLOADS_DIR, filename), pngBuffer)

    console.log(`Saved processed image: ${filename}`)
    res.json({ url: `/api/uploads/${filename}` })
  } catch (err) {
    console.error('Image processing error:', err)
    res.status(500).json({ error: 'Failed to process image. Try a JPG or PNG.' })
  }
})

// Generate a transparent PNG for an ingredient name using AI (Pollinations.ai — free, no key)
// Falls back to emoji match if image generation fails
app.post('/api/images/generate', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const trimmed = name.trim()

  // Try AI image generation first
  try {
    const prompt = encodeURIComponent(
      `${trimmed}, single food ingredient, centered, isolated on pure white background, studio food photography, no text, no labels, clean`
    )
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true&seed=${Date.now()}`

    console.log(`Generating image for "${trimmed}" via Pollinations...`)
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })

    if (response.ok) {
      const arrayBuf = await response.arrayBuffer()
      const imgBuffer = Buffer.from(arrayBuf)

      // Convert to 256x256 PNG
      let pngBuffer = await sharp(imgBuffer)
        .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer()

      // Remove background
      try {
        pngBuffer = await removeBackground(pngBuffer)
      } catch (e) {
        console.warn('Background removal skipped for generated image:', e.message)
      }

      const filename = `gen-${crypto.randomUUID()}.png`
      writeFileSync(join(UPLOADS_DIR, filename), pngBuffer)

      console.log(`Generated image for "${trimmed}" → ${filename}`)
      return res.json({ url: `/api/uploads/${filename}`, emoji: null, matched: true })
    }
  } catch (err) {
    console.warn(`AI generation failed for "${trimmed}":`, err.message)
  }

  // Fallback: emoji match
  const codepoint = findEmojiCodepoint(trimmed)
  if (codepoint) {
    const emoji = codepointToEmoji(codepoint)
    console.log(`Emoji fallback for "${trimmed}" → ${emoji}`)
    return res.json({ url: null, emoji, matched: true })
  }

  res.json({ url: null, emoji: null, matched: false })
})

// Get custom ingredients
app.get('/api/ingredients', (_req, res) => {
  const data = readData()
  res.json(data.ingredients)
})

// Add a custom ingredient
app.post('/api/ingredients', (req, res) => {
  const { name, imageUrl, emoji } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' })

  const data = readData()
  const ingredient = {
    id: name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: name.trim(),
    image: imageUrl || null,
    emoji: emoji || null,
    custom: true,
  }

  data.ingredients.push(ingredient)
  writeData(data)

  res.status(201).json(ingredient)
})

// Delete a custom ingredient
app.delete('/api/ingredients/:id', (req, res) => {
  const data = readData()
  data.ingredients = data.ingredients.filter((i) => i.id !== req.params.id)
  writeData(data)
  res.json({ ok: true })
})

// Express error handler (catches multer errors, etc.)
app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Cook API server running on http://localhost:${PORT}`)
})
