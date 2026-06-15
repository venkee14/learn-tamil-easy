import { useNavigate } from 'react-router-dom'
import { useLanguages, useGrades } from '../hooks/index.js'

export function GradesPage() {
  const { data: languages, isLoading } = useLanguages()
  const navigate = useNavigate()

  // For MVP there is one language (Tamil). We auto-select it.
  const language = languages?.[0]
  const { data: grades } = useGrades(language?._id ?? '')

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">
        {language?.name ?? 'LearnTamilEasy'}
      </h1>
      <p className="text-gray-500 mb-8">Choose your grade to begin</p>
      <div className="grid gap-4">
        {grades?.map((grade) => (
          <button
            key={grade._id}
            onClick={() => navigate(`/grade/${grade._id}`)}
            className="w-full p-5 rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-400 text-left text-xl font-semibold text-gray-800 transition-colors shadow-sm min-h-[44px]"
          >
            {grade.name}
          </button>
        ))}
      </div>
    </div>
  )
}
