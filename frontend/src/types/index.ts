export type ContentType =
  | 'LETTER'
  | 'WORD'
  | 'SENTENCE'
  | 'PARAGRAPH'
  | 'QUIZ_QUESTION'
  | 'QUIZ_OPTION'
  | 'MATCHING_PAIR'

export type SectionType = 'INTRO' | 'GALLERY' | 'STORY' | 'SONG' | 'QUIZ_MCQ' | 'QUIZ_MATCHING'

export interface ContentBlock {
  _id: string
  type: ContentType
  tamil_text: string
  transliteration?: string
  translation?: string
  audio_url?: string
  image_url?: string
  is_correct?: boolean
  order: number
  children?: ContentBlock[] // QUIZ_OPTION blocks under a QUIZ_QUESTION
}

export interface Section {
  _id: string
  title: string
  section_type: SectionType
  order: number
  content_blocks: ContentBlock[]
}

export interface Chapter {
  _id: string
  unit_id: string
  title: string
  order: number
  is_published: boolean
}

export interface ChapterDetail extends Chapter {
  sections: Section[]
}

export interface Unit {
  _id: string
  title: string
  description?: string
  order: number
}

export interface Grade {
  _id: string
  name: string
  order: number
}

export interface Language {
  _id: string
  name: string
  code: string
}
