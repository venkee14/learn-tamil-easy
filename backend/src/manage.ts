/**
 * Targeted DB management — no full wipe.
 *
 * Usage:
 *   npm run manage -- list-words <letter>
 *   npm run manage -- remove-word <letter> <roman>
 *   npm run manage -- list-chapters <unit-title>
 *   npm run manage -- remove-chapter <chapter-title>
 */

import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { Chapter, Section, ContentBlock, Unit } from './models/index.js'

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
const IMAGE_DIR = path.join(process.cwd(), 'uploads', 'images')
const WIKI_UA = 'LearnTamilEasy/1.0 (https://github.com/learntamileasy; contact@learntamileasy.com) Node.js'

async function downloadWikiImage(wikiTitle: string, filename: string): Promise<string> {
  await fs.mkdir(IMAGE_DIR, { recursive: true })
  const dest = path.join(IMAGE_DIR, filename)

  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=400`
  const apiRes = await fetch(apiUrl, { headers: { 'User-Agent': WIKI_UA } })
  if (!apiRes.ok) throw new Error(`Wikipedia API ${apiRes.status}`)
  const json = await apiRes.json() as Record<string, unknown>
  const pages = (json.query as Record<string, unknown>)?.pages as Record<string, unknown>
  const page = Object.values(pages ?? {})[0] as Record<string, unknown>
  const thumbUrl = (page?.thumbnail as Record<string, string>)?.source
  if (!thumbUrl) throw new Error(`No thumbnail found for "${wikiTitle}"`)

  const imgRes = await fetch(thumbUrl, { headers: { 'User-Agent': WIKI_UA } })
  if (!imgRes.ok) throw new Error(`Image download ${imgRes.status}`)
  await fs.writeFile(dest, Buffer.from(await imgRes.arrayBuffer()))
  return `${BASE_URL}/uploads/images/${filename}`
}

const SEED_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed.ts')

async function removeSeedWord(roman: string) {
  const src = await fs.readFile(SEED_PATH, 'utf-8')
  // Match a full word entry line containing roman: 'VALUE'
  const pattern = new RegExp(
    `[ \t]*\\{[^}]*roman:\\s*'${roman}'[^}]*\\},?\\n`,
    'g'
  )
  const updated = src.replace(pattern, '')
  if (updated === src) {
    console.log(`  seed.ts: no entry with roman="${roman}" found — check manually`)
    return
  }
  await fs.writeFile(SEED_PATH, updated, 'utf-8')
  console.log(`  seed.ts: removed entry with roman="${roman}"`)
}

async function connect() {
  await mongoose.connect(process.env.MONGODB_URI!)
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function findChapterByTitle(title: string) {
  const chapter = await Chapter.findOne({ title, is_archived: false })
  if (!chapter) throw new Error(`Chapter "${title}" not found`)
  return chapter
}

async function sectionIds(chapterId: mongoose.Types.ObjectId) {
  const sections = await Section.find({ chapter_id: chapterId, is_archived: false })
  return sections.map((s) => s._id)
}

// ── commands ──────────────────────────────────────────────────────────────────

async function listWords(letter: string) {
  const chapter = await findChapterByTitle(letter)
  const secIds = await sectionIds(chapter._id as mongoose.Types.ObjectId)
  const blocks = await ContentBlock.find({
    section_id: { $in: secIds },
    type: { $in: ['WORD', 'MATCHING_PAIR'] },
    is_archived: false,
  }).sort({ type: 1, order: 1 })

  if (!blocks.length) { console.log('No words found.'); return }

  const seen = new Set<string>()
  console.log(`\nWords in chapter "${letter}":\n`)
  for (const b of blocks) {
    const key = b.transliteration ?? b.tamil_text
    if (seen.has(key)) continue
    seen.add(key)
    console.log(`  ${b.tamil_text.padEnd(12)} ${(b.transliteration ?? '').padEnd(14)} ${b.translation ?? ''}`)
  }
  console.log()
}

async function removeWord(letter: string, roman: string) {
  const chapter = await findChapterByTitle(letter)
  const secIds = await sectionIds(chapter._id as mongoose.Types.ObjectId)

  const result = await ContentBlock.updateMany(
    {
      section_id: { $in: secIds },
      transliteration: roman,
      type: { $in: ['WORD', 'MATCHING_PAIR'] },
    },
    { $set: { is_archived: true } }
  )

  if (result.modifiedCount === 0) {
    console.log(`No blocks found with roman="${roman}" in chapter "${letter}".`)
  } else {
    console.log(`Archived ${result.modifiedCount} block(s) (roman="${roman}") from chapter "${letter}".`)
    await removeSeedWord(roman)
  }
}

async function listChapters(unitTitle: string) {
  const unit = await Unit.findOne({ title: { $regex: unitTitle, $options: 'i' } })
  if (!unit) throw new Error(`Unit matching "${unitTitle}" not found`)

  const chapters = await Chapter.find({ unit_id: unit._id, is_archived: false }).sort({ order: 1 })
  console.log(`\nChapters in unit "${unit.title}":\n`)
  for (const c of chapters) {
    console.log(`  [${c.order}] ${c.title}  (${c.is_published ? 'published' : 'draft'})`)
  }
  console.log()
}

async function patchImage(letter: string, roman: string, wikiTitle: string) {
  const chapter = await findChapterByTitle(letter)
  const secIds = await sectionIds(chapter._id as mongoose.Types.ObjectId)

  const filename = `word_${roman.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`
  process.stdout.write(`Downloading image for "${wikiTitle}"... `)
  const imageUrl = await downloadWikiImage(wikiTitle, filename)
  console.log('✓')

  const result = await ContentBlock.updateMany(
    { section_id: { $in: secIds }, transliteration: roman, is_archived: false },
    { $set: { image_url: imageUrl } }
  )
  console.log(`Updated image_url on ${result.modifiedCount} block(s) (roman="${roman}") → ${imageUrl}`)
}

async function removeChapter(title: string) {
  const chapter = await findChapterByTitle(title)
  const secIds = await sectionIds(chapter._id as mongoose.Types.ObjectId)

  await ContentBlock.updateMany({ section_id: { $in: secIds } }, { $set: { is_archived: true } })
  await Section.updateMany({ chapter_id: chapter._id }, { $set: { is_archived: true } })
  await Chapter.updateOne({ _id: chapter._id }, { $set: { is_archived: true } })

  console.log(`Archived chapter "${title}" and all its sections and blocks.`)
}

// ── main ──────────────────────────────────────────────────────────────────────

const [cmd, ...args] = process.argv.slice(2)

const USAGE = `
Usage:
  npm run manage -- list-words <letter>                        e.g. list-words அ
  npm run manage -- remove-word <letter> <roman>               e.g. remove-word அ adi
  npm run manage -- patch-image <letter> <roman> <wikiTitle>   e.g. patch-image ஈ iikai "Volunteering"
  npm run manage -- list-chapters <unit-title>                 e.g. list-chapters "Uyir"
  npm run manage -- remove-chapter <title>                     e.g. remove-chapter அ
`

async function main() {
  if (!cmd) { console.log(USAGE); process.exit(0) }

  await connect()

  switch (cmd) {
    case 'list-words':
      if (!args[0]) throw new Error('Usage: list-words <letter>')
      await listWords(args[0])
      break
    case 'remove-word':
      if (!args[0] || !args[1]) throw new Error('Usage: remove-word <letter> <roman>')
      await removeWord(args[0], args[1])
      break
    case 'list-chapters':
      if (!args[0]) throw new Error('Usage: list-chapters <unit-title>')
      await listChapters(args[0])
      break
    case 'patch-image':
      if (!args[0] || !args[1] || !args[2]) throw new Error('Usage: patch-image <letter> <roman> <wikiTitle>')
      await patchImage(args[0], args[1], args[2])
      break
    case 'remove-chapter':
      if (!args[0]) throw new Error('Usage: remove-chapter <title>')
      await removeChapter(args[0])
      break
    default:
      console.log(`Unknown command: ${cmd}${USAGE}`)
      process.exit(1)
  }

  await mongoose.disconnect()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
