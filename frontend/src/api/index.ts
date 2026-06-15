import type { Language, Grade, Unit, Chapter, ChapterDetail } from '../types/index.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  getLanguages: () => get<Language[]>('/api/languages'),
  getGrades: (languageId: string) => get<Grade[]>(`/api/languages/${languageId}/grades`),
  getUnits: (gradeId: string) => get<Unit[]>(`/api/grades/${gradeId}/units`),
  getChapters: (unitId: string) => get<Chapter[]>(`/api/units/${unitId}/chapters`),
  getChapter: (chapterId: string) => get<ChapterDetail>(`/api/chapters/${chapterId}`),
}

// Admin API client — sends ADMIN_PASSWORD from sessionStorage
function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('adminPassword') ?? ''}`,
  }
}

async function adminReq<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: adminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error(`Admin API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const adminApi = {
  // Languages
  createLanguage: (body: object) => adminReq('POST', '/api/admin/languages', body),
  // Grades
  createGrade: (body: object) => adminReq('POST', '/api/admin/grades', body),
  // Units
  createUnit: (body: object) => adminReq('POST', '/api/admin/units', body),
  // Chapters
  createChapter: (body: object) => adminReq('POST', '/api/admin/chapters', body),
  updateChapter: (id: string, body: object) => adminReq('PATCH', `/api/admin/chapters/${id}`, body),
  // Sections
  createSection: (body: object) => adminReq('POST', '/api/admin/sections', body),
  updateSection: (id: string, body: object) => adminReq('PATCH', `/api/admin/sections/${id}`, body),
  deleteSection: (id: string) => adminReq('DELETE', `/api/admin/sections/${id}`),
  reorderBlocks: (sectionId: string, items: { id: string; order: number }[]) =>
    adminReq('PATCH', `/api/admin/sections/${sectionId}/reorder`, items),
  // Content blocks
  createBlock: (body: object) => adminReq('POST', '/api/admin/content-blocks', body),
  updateBlock: (id: string, body: object) => adminReq('PATCH', `/api/admin/content-blocks/${id}`, body),
  deleteBlock: (id: string) => adminReq('DELETE', `/api/admin/content-blocks/${id}`),
  // Upload a file directly to the backend (local dev).
  // Returns the public URL to store in audio_url / image_url.
  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/api/admin/upload/file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionStorage.getItem('adminPassword') ?? ''}` },
      body: formData,
    })
    if (res.status === 401) throw new Error('Unauthorized')
    if (!res.ok) throw new Error('Upload failed')
    const { url } = await res.json() as { url: string }
    return url
  },
}
