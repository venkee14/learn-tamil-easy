import { Hono } from 'hono'
import { adminAuth } from '../middleware/adminAuth.js'
import { Language, Grade, Unit, Chapter, Section, ContentBlock } from '../models/index.js'

const app = new Hono()
app.use('*', adminAuth)

// --- Languages ---
app.post('/languages', async (c) => {
  const body = await c.req.json()
  const doc = await Language.create(body)
  return c.json(doc, 201)
})

// --- Grades ---
app.post('/grades', async (c) => {
  const body = await c.req.json()
  const doc = await Grade.create(body)
  return c.json(doc, 201)
})

// --- Units ---
app.post('/units', async (c) => {
  const body = await c.req.json()
  const doc = await Unit.create(body)
  return c.json(doc, 201)
})

// --- Chapters ---
app.post('/chapters', async (c) => {
  const body = await c.req.json()
  const doc = await Chapter.create(body)
  return c.json(doc, 201)
})

app.patch('/chapters/:id', async (c) => {
  const body = await c.req.json()
  const doc = await Chapter.findByIdAndUpdate(c.req.param('id'), body, { new: true })
  if (!doc) return c.json({ error: 'Not found' }, 404)
  return c.json(doc)
})

// --- Sections ---
app.post('/sections', async (c) => {
  const body = await c.req.json()
  const doc = await Section.create(body)
  return c.json(doc, 201)
})

app.patch('/sections/:id', async (c) => {
  const body = await c.req.json()
  const doc = await Section.findByIdAndUpdate(c.req.param('id'), body, { new: true })
  if (!doc) return c.json({ error: 'Not found' }, 404)
  return c.json(doc)
})

app.delete('/sections/:id', async (c) => {
  await Section.findByIdAndUpdate(c.req.param('id'), { is_archived: true })
  return c.json({ ok: true })
})

// Reorder blocks within a section: body = [{ id, order }]
app.patch('/sections/:id/reorder', async (c) => {
  const items = await c.req.json<{ id: string; order: number }[]>()
  await Promise.all(
    items.map(({ id, order }) => ContentBlock.findByIdAndUpdate(id, { order }))
  )
  return c.json({ ok: true })
})

// --- Content Blocks ---
app.post('/content-blocks', async (c) => {
  const body = await c.req.json()
  const doc = await ContentBlock.create(body)
  return c.json(doc, 201)
})

app.patch('/content-blocks/:id', async (c) => {
  const body = await c.req.json()
  const doc = await ContentBlock.findByIdAndUpdate(c.req.param('id'), body, { new: true })
  if (!doc) return c.json({ error: 'Not found' }, 404)
  return c.json(doc)
})

app.delete('/content-blocks/:id', async (c) => {
  await ContentBlock.findByIdAndUpdate(c.req.param('id'), { is_archived: true })
  return c.json({ ok: true })
})

export default app
