import { Hono } from 'hono'
import { Language, Grade, Unit, Chapter, Section, ContentBlock } from '../models/index.js'

const app = new Hono()

app.get('/languages', async (c) => {
  const languages = await Language.find({ is_archived: false }).lean()
  return c.json(languages)
})

app.get('/languages/:id/grades', async (c) => {
  const grades = await Grade.find({
    language_id: c.req.param('id'),
    is_archived: false,
  }).sort({ order: 1 }).lean()
  return c.json(grades)
})

app.get('/grades/:id/units', async (c) => {
  const units = await Unit.find({
    grade_id: c.req.param('id'),
    is_archived: false,
  }).sort({ order: 1 }).lean()
  return c.json(units)
})

app.get('/units/:id', async (c) => {
  const unit = await Unit.findOne({
    _id: c.req.param('id'),
    is_archived: false,
  }).lean()
  if (!unit) return c.json({ error: 'Not found' }, 404)
  return c.json(unit)
})

app.get('/units/:id/chapters', async (c) => {
  const chapters = await Chapter.find({
    unit_id: c.req.param('id'),
    is_archived: false,
    is_published: true,
  }).sort({ order: 1 }).lean()
  return c.json(chapters)
})

// Returns the full chapter tree: sections → blocks → quiz option children
app.get('/chapters/:id', async (c) => {
  const chapter = await Chapter.findOne({
    _id: c.req.param('id'),
    is_archived: false,
  }).lean()
  if (!chapter) return c.json({ error: 'Not found' }, 404)

  const sections = await Section.find({
    chapter_id: chapter._id,
    is_archived: false,
  }).sort({ order: 1 }).lean()

  const sectionIds = sections.map((s) => s._id)
  const topLevelBlocks = await ContentBlock.find({
    section_id: { $in: sectionIds },
    is_archived: false,
  }).sort({ order: 1 }).lean()

  // Fetch QUIZ_OPTION children for all QUIZ_QUESTION blocks
  const questionIds = topLevelBlocks
    .filter((b) => b.type === 'QUIZ_QUESTION')
    .map((b) => b._id)

  const optionBlocks = questionIds.length
    ? await ContentBlock.find({
        parent_id: { $in: questionIds },
        is_archived: false,
      }).sort({ order: 1 }).lean()
    : []

  // Group options by parent_id
  const optionsByQuestion = new Map<string, typeof optionBlocks>()
  for (const opt of optionBlocks) {
    const key = opt.parent_id!.toString()
    if (!optionsByQuestion.has(key)) optionsByQuestion.set(key, [])
    optionsByQuestion.get(key)!.push(opt)
  }

  // Group top-level blocks by section_id
  const blocksBySection = new Map<string, typeof topLevelBlocks>()
  for (const block of topLevelBlocks) {
    const key = block.section_id!.toString()
    if (!blocksBySection.has(key)) blocksBySection.set(key, [])
    const entry = { ...block, children: optionsByQuestion.get(block._id.toString()) ?? [] }
    blocksBySection.get(key)!.push(entry as typeof block)
  }

  const result = {
    ...chapter,
    sections: sections.map((s) => ({
      ...s,
      content_blocks: blocksBySection.get(s._id.toString()) ?? [],
    })),
  }

  return c.json(result)
})

export default app
