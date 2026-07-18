import { useQuery } from '@tanstack/react-query'
import { api } from '../api/index.js'

export const useLanguages = () =>
  useQuery({ queryKey: ['languages'], queryFn: api.getLanguages })

export const useGrades = (languageId: string) =>
  useQuery({
    queryKey: ['grades', languageId],
    queryFn: () => api.getGrades(languageId),
    enabled: !!languageId,
  })

export const useUnits = (gradeId: string) =>
  useQuery({
    queryKey: ['units', gradeId],
    queryFn: () => api.getUnits(gradeId),
    enabled: !!gradeId,
  })

export const useUnit = (unitId: string) =>
  useQuery({
    queryKey: ['unit', unitId],
    queryFn: () => api.getUnit(unitId),
    enabled: !!unitId,
  })

export const useChapters = (unitId: string) =>
  useQuery({
    queryKey: ['chapters', unitId],
    queryFn: () => api.getChapters(unitId),
    enabled: !!unitId,
  })

export const useChapter = (chapterId: string) =>
  useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => api.getChapter(chapterId),
    enabled: !!chapterId,
  })
