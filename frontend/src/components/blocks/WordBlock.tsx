import type { ContentBlock } from '../../types/index.js'
import { AudioButton } from './AudioButton.js'

export function WordBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
      {block.image_url ? (
        block.image_url.startsWith('http') || block.image_url.startsWith('/') ? (
          <img
            src={block.image_url}
            alt={block.transliteration ?? block.tamil_text}
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <span className="text-4xl">{block.image_url}</span>
          </div>
        )
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold text-gray-800">{block.tamil_text}</p>
        {block.transliteration && (
          <p className="text-sm text-gray-500">{block.transliteration}</p>
        )}
        {block.translation && (
          <p className="text-sm text-indigo-600">{block.translation}</p>
        )}
      </div>
      <AudioButton url={block.audio_url} text={block.tamil_text} />
    </div>
  )
}
