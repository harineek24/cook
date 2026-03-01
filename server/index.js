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

// Initialize data file
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

app.use(cors())
app.use(express.json())

// Serve uploaded images
app.use('/api/uploads', express.static(UPLOADS_DIR))

// Multer config — accept any image, keep in memory for sharp processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.originalname.match(/\.(heic|heif)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

/**
 * Remove near-background-color pixels using a flood-fill-like approach.
 * Samples the corners to detect the dominant background color,
 * then makes all pixels within a color-distance threshold transparent.
 */
async function removeBackground(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info

  // Sample corner pixels to find dominant background color
  const cornerPositions = [
    [0, 0], [width - 1, 0],
    [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ]

  let rSum = 0, gSum = 0, bSum = 0, count = 0
  for (const [x, y] of cornerPositions) {
    const idx = (y * width + x) * channels
    rSum += data[idx]
    gSum += data[idx + 1]
    bSum += data[idx + 2]
    count++
  }

  const bgR = Math.round(rSum / count)
  const bgG = Math.round(gSum / count)
  const bgB = Math.round(bSum / count)

  // Color distance threshold — higher = more aggressive removal
  const threshold = 45

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)

    if (dist < threshold) {
      data[i + 3] = 0 // fully transparent
    } else if (dist < threshold + 20) {
      // Feather edges for smoother transition
      const alpha = Math.round(((dist - threshold) / 20) * 255)
      data[i + 3] = Math.min(data[i + 3], alpha)
    }
  }

  return sharp(data, { raw: { width, height, channels } })
    .png()
    .toBuffer()
}

// POST /api/images/process — upload an image, convert & remove background
app.post('/api/images/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

    // Convert any format to PNG first
    let pngBuffer = await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()

    // Attempt background removal
    try {
      pngBuffer = await removeBackground(pngBuffer)
    } catch (e) {
      console.warn('Background removal failed, using plain conversion:', e.message)
    }

    // Save to disk
    const filename = `${crypto.randomUUID()}.png`
    const filepath = join(UPLOADS_DIR, filename)
    writeFileSync(filepath, pngBuffer)

    res.json({ url: `/api/uploads/${filename}` })
  } catch (err) {
    console.error('Image processing error:', err)
    res.status(500).json({ error: 'Failed to process image. Try JPG or PNG format.' })
  }
})

// GET /api/ingredients — return custom ingredients
app.get('/api/ingredients', (_req, res) => {
  const data = readData()
  res.json(data.ingredients)
})

// POST /api/ingredients — add a custom ingredient
app.post('/api/ingredients', (req, res) => {
  const { name, imageUrl } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' })

  const data = readData()
  const ingredient = {
    id: name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: name.trim(),
    image: imageUrl || null,
    custom: true,
  }

  data.ingredients.push(ingredient)
  writeData(data)

  res.status(201).json(ingredient)
})

// DELETE /api/ingredients/:id
app.delete('/api/ingredients/:id', (req, res) => {
  const data = readData()
  data.ingredients = data.ingredients.filter((i) => i.id !== req.params.id)
  writeData(data)
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Cook API server running on http://localhost:${PORT}`)
})
