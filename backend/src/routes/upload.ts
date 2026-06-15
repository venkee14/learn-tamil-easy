import fs from 'fs/promises'
import path from 'path'
import { Hono } from 'hono'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { adminAuth } from '../middleware/adminAuth.js'

const app = new Hono()
app.use('*', adminAuth)

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// Direct file upload — saves to local uploads/ and returns a URL.
// Used in local dev when R2 is not configured.
app.post('/file', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || typeof file === 'string') return c.json({ error: 'file required' }, 400)

  const f = file as File
  const ext = path.extname(f.name).slice(1).toLowerCase() || 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(await f.arrayBuffer()))

  const port = process.env.PORT ?? 3001
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`
  return c.json({ url: `${baseUrl}/uploads/${filename}` })
})

// R2 presigned URL — used in production when R2 credentials are configured.
app.post('/', async (c) => {
  const r2Id = process.env.R2_ACCOUNT_ID
  const r2Key = process.env.R2_ACCESS_KEY_ID
  const r2Secret = process.env.R2_SECRET_ACCESS_KEY
  if (!r2Id || !r2Key || !r2Secret) {
    return c.json({ error: 'R2 not configured — use /api/admin/upload/file for local uploads' }, 400)
  }

  const { filename, contentType } = await c.req.json<{ filename: string; contentType: string }>()
  if (!filename || !contentType) return c.json({ error: 'filename and contentType required' }, 400)

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2Id}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Key, secretAccessKey: r2Secret },
  })

  const key = `${Date.now()}-${filename}`
  const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = `https://pub-${r2Id}.r2.dev/${key}`

  return c.json({ uploadUrl, publicUrl })
})

export default app
