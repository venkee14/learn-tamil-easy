import { useNavigate } from 'react-router-dom'
import { useLanguages, useGrades, useUnits, useChapters } from '../../hooks/index.js'
import { adminApi } from '../../api/index.js'
import { useState } from 'react'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { data: languages, refetch: refetchLanguages } = useLanguages()
  const language = languages?.[0]
  const { data: grades, refetch: refetchGrades } = useGrades(language?._id ?? '')
  const [selectedGradeId, setSelectedGradeId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const { data: units } = useUnits(selectedGradeId)
  const { data: chapters } = useChapters(selectedUnitId)

  const createSeedLanguage = async () => {
    await adminApi.createLanguage({ name: 'Tamil', code: 'ta' })
    refetchLanguages()
  }

  const createGrade = async () => {
    const name = prompt('Grade name (e.g. Kindergarten)')
    if (!name || !language) return
    await adminApi.createGrade({ language_id: language._id, name, order: (grades?.length ?? 0) + 1 })
    refetchGrades()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-indigo-700 mb-8">Admin Dashboard</h1>

      {!language && (
        <button onClick={createSeedLanguage} className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-xl">
          Seed Tamil Language
        </button>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Grades</h2>
          <button onClick={createGrade} className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
            + Add Grade
          </button>
        </div>
        <div className="grid gap-2">
          {grades?.map((grade) => (
            <button
              key={grade._id}
              onClick={() => setSelectedGradeId(grade._id)}
              className={`w-full text-left p-4 rounded-xl border-2 ${selectedGradeId === grade._id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
            >
              {grade.name}
            </button>
          ))}
        </div>
      </section>

      {selectedGradeId && (
        <UnitSection
          gradeId={selectedGradeId}
          units={units ?? []}
          onSelectUnit={setSelectedUnitId}
          selectedUnitId={selectedUnitId}
        />
      )}

      {selectedUnitId && (
        <ChapterSection
          unitId={selectedUnitId}
          chapters={chapters ?? []}
          onEdit={(id) => navigate(`/admin/chapter/${id}`)}
        />
      )}
    </div>
  )
}

function UnitSection({ gradeId, units, onSelectUnit, selectedUnitId }: {
  gradeId: string
  units: { _id: string; title: string }[]
  onSelectUnit: (id: string) => void
  selectedUnitId: string
}) {
  const createUnit = async () => {
    const title = prompt('Unit title (e.g. Uyir Ezhuthu)')
    if (!title) return
    await adminApi.createUnit({ grade_id: gradeId, title, order: units.length + 1 })
    window.location.reload()
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Units</h2>
        <button onClick={createUnit} className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
          + Add Unit
        </button>
      </div>
      <div className="grid gap-2">
        {units.map((unit) => (
          <button
            key={unit._id}
            onClick={() => onSelectUnit(unit._id)}
            className={`w-full text-left p-4 rounded-xl border-2 ${selectedUnitId === unit._id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
          >
            {unit.title}
          </button>
        ))}
      </div>
    </section>
  )
}

function ChapterSection({ unitId, chapters, onEdit }: {
  unitId: string
  chapters: { _id: string; title: string; is_published: boolean }[]
  onEdit: (id: string) => void
}) {
  const createChapter = async () => {
    const title = prompt('Chapter title (e.g. அ)')
    if (!title) return
    await adminApi.createChapter({ unit_id: unitId, title, order: chapters.length + 1 })
    window.location.reload()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Chapters</h2>
        <button onClick={createChapter} className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
          + Add Chapter
        </button>
      </div>
      <div className="grid gap-2">
        {chapters.map((ch) => (
          <div key={ch._id} className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white">
            <span className="flex-1 font-medium">{ch.title}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${ch.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {ch.is_published ? 'Published' : 'Draft'}
            </span>
            <button onClick={() => onEdit(ch._id)} className="text-sm text-indigo-600 hover:underline">
              Edit
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
