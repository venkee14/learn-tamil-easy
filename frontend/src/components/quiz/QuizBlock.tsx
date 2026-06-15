import { useState } from 'react'
import type { ContentBlock } from '../../types/index.js'

function QuizOption({
  option,
  selected,
  revealed,
  onClick,
}: {
  option: ContentBlock
  selected: boolean
  revealed: boolean
  onClick: () => void
}) {
  let classes =
    'w-full p-4 rounded-xl border-2 text-left text-lg font-medium transition-colors min-h-[44px] '

  if (revealed) {
    if (option.is_correct) {
      classes += 'bg-green-100 border-green-500 text-green-800'
    } else if (selected && !option.is_correct) {
      classes += 'bg-red-100 border-red-400 text-red-700'
    } else {
      classes += 'bg-gray-50 border-gray-200 text-gray-400'
    }
  } else {
    classes += selected
      ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
      : 'bg-white border-gray-200 hover:border-indigo-300 text-gray-800'
  }

  return (
    <button onClick={onClick} disabled={revealed} className={classes}>
      {option.image_url && (
        <img src={option.image_url} alt={option.tamil_text} className="w-12 h-12 object-cover rounded mb-1" />
      )}
      {option.tamil_text}
      {option.transliteration && (
        <span className="block text-sm font-normal opacity-70">{option.transliteration}</span>
      )}
    </button>
  )
}

function QuizQuestion({
  question,
  onAnswered,
}: {
  question: ContentBlock
  onAnswered: (correct: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const revealed = selectedId !== null

  const handleSelect = (option: ContentBlock) => {
    if (revealed) return
    setSelectedId(option._id)
    onAnswered(option.is_correct ?? false)
  }

  return (
    <div className="mb-6">
      <p className="text-xl font-semibold text-gray-800 mb-3">{question.tamil_text}</p>
      {question.translation && (
        <p className="text-sm text-gray-500 mb-3">{question.translation}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {(question.children ?? []).map((opt) => (
          <QuizOption
            key={opt._id}
            option={opt}
            selected={selectedId === opt._id}
            revealed={revealed}
            onClick={() => handleSelect(opt)}
          />
        ))}
      </div>
    </div>
  )
}

export function QuizBlock({ questions }: { questions: ContentBlock[] }) {
  const [answers, setAnswers] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const handleAnswered = (idx: number, correct: boolean) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[idx] = correct
      if (next.filter((a) => a !== undefined).length === questions.length) {
        setTimeout(() => setDone(true), 800)
      }
      return next
    })
  }

  const retry = () => {
    setAnswers([])
    setDone(false)
    setAttempt((n) => n + 1)
  }

  const score = answers.filter(Boolean).length

  return (
    <div key={attempt}>
      {questions.map((q, i) => (
        <QuizQuestion key={q._id} question={q} onAnswered={(c) => handleAnswered(i, c)} />
      ))}
      {done && (
        <div className="mt-6 p-6 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
          <p className="text-3xl font-bold text-indigo-700 mb-1">
            {score} / {questions.length}
          </p>
          <p className="text-gray-600 mb-4">
            {score === questions.length ? '🎉 Perfect score!' : 'Good effort — try again!'}
          </p>
          <button
            onClick={retry}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
