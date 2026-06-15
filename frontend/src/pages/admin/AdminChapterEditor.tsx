import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChapter } from '../../hooks/index.js'
import { adminApi } from '../../api/index.js'
import type { ContentType } from '../../types/index.js'

const BLOCK_TYPES: ContentType[] = ['LETTER', 'WORD', 'SENTENCE', 'PARAGRAPH', 'QUIZ_QUESTION', 'QUIZ_OPTION', 'MATCHING_PAIR']

async function uploadFile(file: File): Promise<string> {
  return adminApi.uploadFile(file)
}

export function AdminChapterEditor() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const { data: chapter, refetch } = useChapter(chapterId ?? '')

  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [addingSection, setAddingSection] = useState(false)

  const addSection = async () => {
    if (!newSectionTitle.trim() || !chapter) return
    await adminApi.createSection({
      chapter_id: chapter._id,
      title: newSectionTitle.trim(),
      order: (chapter.sections?.length ?? 0) + 1,
    })
    setNewSectionTitle('')
    setAddingSection(false)
    refetch()
  }

  const publishToggle = async () => {
    if (!chapter) return
    await adminApi.updateChapter(chapter._id, { is_published: !chapter.is_published })
    refetch()
  }

  if (!chapter) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={() => navigate('/admin/dashboard')} className="text-indigo-500 mb-6 hover:underline">
        ← Dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-indigo-700">{chapter.title}</h1>
        <button
          onClick={publishToggle}
          className={`px-4 py-2 rounded-xl font-semibold text-sm ${chapter.is_published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {chapter.is_published ? '✓ Published' : 'Publish'}
        </button>
      </div>

      {chapter.sections.map((section) => (
        <div key={section._id} className="mb-8 border border-gray-200 rounded-2xl p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{section.title}</h2>
            <button
              onClick={async () => { await adminApi.deleteSection(section._id); refetch() }}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Archive section
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {section.content_blocks.map((block) => (
              <div key={block._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                <span className="font-mono text-xs text-indigo-500 w-28">{block.type}</span>
                <span className="flex-1 truncate text-gray-700">{block.tamil_text}</span>
                <button
                  onClick={async () => { await adminApi.deleteBlock(block._id); refetch() }}
                  className="text-red-400 hover:text-red-600 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <AddBlockForm sectionId={section._id} onAdded={refetch} />
        </div>
      ))}

      {addingSection ? (
        <div className="flex gap-2 mt-4">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section title (e.g. Common Words)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-400"
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
          />
          <button onClick={addSection} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Add</button>
          <button onClick={() => setAddingSection(false)} className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAddingSection(true)} className="mt-4 w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-500 rounded-2xl hover:border-indigo-400 hover:text-indigo-700 transition-colors">
          + Add Section
        </button>
      )}
    </div>
  )
}

function AddBlockForm({ sectionId, onAdded }: { sectionId: string; onAdded: () => void }) {
  const [type, setType] = useState<ContentType>('WORD')
  const [tamilText, setTamilText] = useState('')
  const [transliteration, setTransliteration] = useState('')
  const [translation, setTranslation] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const save = async () => {
    if (!tamilText.trim()) return
    setSaving(true)
    try {
      const audio_url = audioFile ? await uploadFile(audioFile) : undefined
      const image_url = imageFile ? await uploadFile(imageFile) : undefined
      await adminApi.createBlock({
        section_id: sectionId,
        type,
        tamil_text: tamilText.trim(),
        transliteration: transliteration || undefined,
        translation: translation || undefined,
        audio_url,
        image_url,
        order: 999,
      })
      setTamilText(''); setTransliteration(''); setTranslation('')
      setAudioFile(null); setImageFile(null); setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-indigo-500 hover:text-indigo-700">
        + Add block
      </button>
    )
  }

  return (
    <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50 flex flex-col gap-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ContentType)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input placeholder="Tamil text *" value={tamilText} onChange={(e) => setTamilText(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2" />
      <input placeholder="Transliteration" value={transliteration} onChange={(e) => setTransliteration(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2" />
      <input placeholder="Translation / English meaning" value={translation} onChange={(e) => setTranslation(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2" />
      <label className="text-sm text-gray-600">
        Audio (mp3): <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
      </label>
      <label className="text-sm text-gray-600">
        Image: <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Block'}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg">Cancel</button>
      </div>
    </div>
  )
}
