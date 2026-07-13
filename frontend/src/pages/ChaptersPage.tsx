import { useNavigate, useParams } from 'react-router-dom'
import { useChapters } from '../hooks/index.js'

export function ChaptersPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { data: chapters, isLoading } = useChapters(unitId ?? '')

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button onClick={() => navigate(-1)} className="text-indigo-500 mb-6 hover:underline">
        ← Back
      </button>
      <h1 className="text-3xl font-bold text-indigo-700 mb-8">Chapters</h1>
      <div className="grid grid-cols-3 gap-4">
        {chapters?.map((chapter) => (
          <button
            key={chapter._id}
            onClick={() => navigate(`/chapter/${chapter._id}`)}
            className="rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-400 flex items-center justify-center p-3 font-bold text-indigo-700 shadow-sm transition-colors min-h-[80px] text-center break-words"
            style={{ fontSize: chapter.title.length <= 3 ? '2.25rem' : chapter.title.length <= 15 ? '1rem' : '0.75rem' }}
          >
            {chapter.title}
          </button>
        ))}
      </div>
    </div>
  )
}
