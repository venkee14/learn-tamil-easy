import mongoose, { Schema, Types } from 'mongoose'

export const ContentType = {
  LETTER: 'LETTER',
  WORD: 'WORD',
  SENTENCE: 'SENTENCE',
  PARAGRAPH: 'PARAGRAPH',
  QUIZ_QUESTION: 'QUIZ_QUESTION',
  QUIZ_OPTION: 'QUIZ_OPTION',
  MATCHING_PAIR: 'MATCHING_PAIR',
} as const
export type ContentType = (typeof ContentType)[keyof typeof ContentType]

export const SectionType = {
  INTRO: 'INTRO',
  GALLERY: 'GALLERY',
  STORY: 'STORY',
  SONG: 'SONG',
  QUIZ_MCQ: 'QUIZ_MCQ',
  QUIZ_MATCHING: 'QUIZ_MATCHING',
} as const
export type SectionType = (typeof SectionType)[keyof typeof SectionType]

const languageSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  is_archived: { type: Boolean, default: false },
})

const gradeSchema = new Schema({
  language_id: { type: Types.ObjectId, ref: 'Language', required: true },
  name: { type: String, required: true },
  order: { type: Number, required: true },
  is_archived: { type: Boolean, default: false },
})
gradeSchema.index({ language_id: 1, order: 1 })

const unitSchema = new Schema({
  grade_id: { type: Types.ObjectId, ref: 'Grade', required: true },
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true },
  is_archived: { type: Boolean, default: false },
})
unitSchema.index({ grade_id: 1, order: 1 })

const chapterSchema = new Schema({
  unit_id: { type: Types.ObjectId, ref: 'Unit', required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true },
  is_published: { type: Boolean, default: false },
  is_archived: { type: Boolean, default: false },
})
chapterSchema.index({ unit_id: 1, order: 1 })

const sectionSchema = new Schema({
  chapter_id: { type: Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  section_type: { type: String, enum: Object.values(SectionType), required: true, default: SectionType.INTRO },
  order: { type: Number, required: true },
  is_archived: { type: Boolean, default: false },
})
sectionSchema.index({ chapter_id: 1, order: 1 })

const contentBlockSchema = new Schema({
  section_id: { type: Types.ObjectId, ref: 'Section', default: null },
  parent_id: { type: Types.ObjectId, ref: 'ContentBlock', default: null },
  type: { type: String, enum: Object.values(ContentType), required: true },
  tamil_text: { type: String, required: true },
  transliteration: { type: String },
  translation: { type: String },
  audio_url: { type: String },
  image_url: { type: String },
  is_correct: { type: Boolean },
  order: { type: Number, required: true },
  is_archived: { type: Boolean, default: false },
})
contentBlockSchema.index({ section_id: 1, order: 1 })
contentBlockSchema.index({ parent_id: 1, order: 1 })

export const Language = mongoose.model('Language', languageSchema)
export const Grade = mongoose.model('Grade', gradeSchema)
export const Unit = mongoose.model('Unit', unitSchema)
export const Chapter = mongoose.model('Chapter', chapterSchema)
export const Section = mongoose.model('Section', sectionSchema)
export const ContentBlock = mongoose.model('ContentBlock', contentBlockSchema)
