import type { ContentBlock } from '../../types/index.js'
import { AudioButton } from './AudioButton.js'

export function ParagraphBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="p-4 flex items-start gap-3">
      <AudioButton url={block.audio_url} text={block.tamil_text} />
      <div>
        <p className="text-lg text-gray-800 whitespace-pre-wrap" style={{ lineHeight: '2.5' }}>
          {block.tamil_text}
        </p>
        {block.translation && (
          <p className="text-sm text-gray-500 mt-1 italic">{block.translation}</p>
        )}
      </div>
    </div>
  )
}
