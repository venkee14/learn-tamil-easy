import type { ContentBlock } from '../../types/index.js'
import { AudioButton } from './AudioButton.js'

export function SentenceBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
      <p className="text-xl font-medium text-gray-800">{block.tamil_text}</p>
      {block.transliteration && (
        <p className="text-sm text-gray-500 mt-1">{block.transliteration}</p>
      )}
      {block.translation && (
        <p className="text-sm text-amber-700 mt-1">{block.translation}</p>
      )}
      <div className="mt-2">
        <AudioButton url={block.audio_url} text={block.tamil_text} />
      </div>
    </div>
  )
}
