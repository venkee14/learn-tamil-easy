import { useState, useMemo } from 'react'
import type { ContentBlock } from '../../types/index.js'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function MatchingQuiz({ pairs }: { pairs: ContentBlock[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongId, setWrongId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const leftItems = useMemo(() => shuffle(pairs), [pairs, attempt])
  const rightItems = useMemo(() => shuffle(pairs), [pairs, attempt])

  const done = matched.size === pairs.length

  const handleLeft = (id: string) => {
    if (matched.has(id)) return
    setSelectedId(id === selectedId ? null : id)
  }

  const handleRight = (id: string) => {
    if (matched.has(id) || !selectedId) return
    if (selectedId === id) {
      setMatched((prev) => new Set([...prev, id]))
      setSelectedId(null)
    } else {
      setWrongId(id)
      setTimeout(() => { setWrongId(null); setSelectedId(null) }, 600)
    }
  }

  const retry = () => {
    setSelectedId(null)
    setMatched(new Set())
    setWrongId(null)
    setAttempt((n) => n + 1)
  }

  return (
    <div key={attempt}>
      <p className="text-base text-gray-500 mb-4">
        Tap a Tamil word, then tap its matching meaning.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {/* Left column: Tamil words */}
        <div className="flex flex-col gap-3">
          {leftItems.map((pair) => {
            const isMatched = matched.has(pair._id)
            const isSelected = selectedId === pair._id
            return (
              <button
                key={pair._id}
                onClick={() => handleLeft(pair._id)}
                disabled={isMatched}
                className={[
                  'p-4 rounded-xl border-2 text-xl font-semibold transition-all min-h-[152px]',
                  isMatched
                    ? 'bg-green-50 border-green-300 text-green-700 opacity-60 cursor-default'
                    : isSelected
                    ? 'bg-indigo-100 border-indigo-500 text-indigo-800 scale-105'
                    : 'bg-white border-gray-200 hover:border-indigo-300 text-gray-800',
                ].join(' ')}
              >
                {pair.tamil_text}
              </button>
            )
          })}
        </div>

        {/* Right column: Images or English meanings */}
        <div className="flex flex-col gap-3">
          {rightItems.map((pair) => {
            const isMatched = matched.has(pair._id)
            const isWrong = wrongId === pair._id
            return (
              <button
                key={pair._id}
                onClick={() => handleRight(pair._id)}
                disabled={isMatched}
                className={[
                  'p-2 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden',
                  isMatched
                    ? 'bg-green-50 border-green-300 text-green-700 opacity-60 cursor-default'
                    : isWrong
                    ? 'bg-red-100 border-red-400 text-red-700 scale-95'
                    : 'bg-white border-gray-200 hover:border-indigo-300 text-gray-700',
                ].join(' ')}
              >
                {pair.image_url ? (
                  pair.image_url.startsWith('http') || pair.image_url.startsWith('/') ? (
                    <img src={pair.image_url} alt={pair.translation} className="w-full h-36 object-contain rounded-lg" />
                  ) : (
                    <span className="text-5xl">{pair.image_url}</span>
                  )
                ) : (
                  <span className="text-base font-medium">{pair.translation}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {done && (
        <div className="mt-6 p-6 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
          <p className="text-3xl font-bold text-indigo-700 mb-1">All matched!</p>
          <p className="text-gray-600 mb-4">Great job!</p>
          <button
            onClick={retry}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
