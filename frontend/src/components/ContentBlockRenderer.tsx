import type { ContentBlock } from '../types/index.js'
import { LetterBlock } from './blocks/LetterBlock.js'
import { WordBlock } from './blocks/WordBlock.js'
import { SentenceBlock } from './blocks/SentenceBlock.js'
import { ParagraphBlock } from './blocks/ParagraphBlock.js'

// Renders a single non-quiz content block based on its type.
// QUIZ_QUESTION blocks are collected per section and rendered via QuizBlock (see SectionView).
export function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'LETTER':    return <LetterBlock block={block} />
    case 'WORD':      return <WordBlock block={block} />
    case 'SENTENCE':  return <SentenceBlock block={block} />
    case 'PARAGRAPH': return <ParagraphBlock block={block} />
    default:          return null
  }
}
