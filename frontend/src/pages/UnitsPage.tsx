import { useNavigate, useParams } from 'react-router-dom'
import { useUnits } from '../hooks/index.js'

export function UnitsPage() {
  const { gradeId } = useParams<{ gradeId: string }>()
  const navigate = useNavigate()
  const { data: units, isLoading } = useUnits(gradeId ?? '')

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button onClick={() => navigate('/')} className="text-indigo-500 mb-6 hover:underline">
        ← Back
      </button>
      <h1 className="text-3xl font-bold text-indigo-700 mb-8">Units</h1>
      <div className="grid gap-4">
        {units?.map((unit) => (
          <button
            key={unit._id}
            onClick={() => navigate(`/unit/${unit._id}`)}
            className="w-full p-5 rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-400 text-left shadow-sm min-h-[44px]"
          >
            <p className="text-xl font-semibold text-gray-800">{unit.title}</p>
            {unit.description && (
              <p className="text-sm text-gray-500 mt-1">{unit.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
