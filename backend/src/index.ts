import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectDB } from './db.js'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin.js'
import uploadRoutes from './routes/upload.js'

const app = new Hono()

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
app.use('*', cors({
  origin: isDev
    ? (origin) => origin  // allow any origin locally
    : process.env.FRONTEND_URL ?? '*',
}))

app.route('/api', publicRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/admin/upload', uploadRoutes)

app.get('/health', (c) => c.json({ ok: true }))

// TTS proxy — fetches Google Translate audio for Tamil text and caches it in memory.
const ttsCache = new Map<string, ArrayBuffer>()
app.get('/api/tts', async (c) => {
  const text = c.req.query('text') ?? ''
  if (!text) return c.json({ error: 'text required' }, 400)

  if (ttsCache.has(text)) {
    return new Response(ttsCache.get(text)!, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
    })
  }

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ta&client=tw-ob`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const buf = await res.arrayBuffer()
    ttsCache.set(text, buf)
    return new Response(buf, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
    })
  } catch (e) {
    console.error('TTS error:', e)
    return c.json({ error: 'TTS unavailable' }, 503)
  }
})

// Serve locally uploaded files (supports subdirectories: /uploads/audio/x.mp3, /uploads/images/x.jpg)
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const MIME: Record<string, string> = {
  mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
}
app.get('/uploads/*', async (c) => {
  const subpath = c.req.path.replace(/^\/uploads\//, '')
  if (subpath.includes('..')) return c.json({ error: 'Invalid' }, 400)
  const filepath = path.join(UPLOADS_DIR, subpath)
  if (!filepath.startsWith(UPLOADS_DIR)) return c.json({ error: 'Invalid' }, 400)
  try {
    const data = await fs.readFile(filepath)
    const ext = path.extname(filepath).slice(1).toLowerCase()
    return new Response(data, { headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream' } })
  } catch {
    return c.json({ error: 'Not found' }, 404)
  }
})

connectDB().then(() => {
  const port = Number(process.env.PORT ?? 3001)
  serve({ fetch: app.fetch, port })
  console.log(`API running on http://localhost:${port}`)
})
