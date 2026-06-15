import type { ContentBlock } from '../../types/index.js'
import { AudioButton } from './AudioButton.js'

export function LetterBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <span className="text-9xl font-bold text-indigo-700">{block.tamil_text}</span>
      {block.transliteration && (
        <span className="text-2xl text-gray-500">{block.transliteration}</span>
      )}
      {block.translation && (
        <span className="text-lg text-gray-400">{block.translation}</span>
      )}
      <AudioButton url={block.audio_url} text={block.tamil_text} />
    </div>
  )
}
