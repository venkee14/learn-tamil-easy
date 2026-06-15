import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GradesPage } from './pages/GradesPage.js'
import { UnitsPage } from './pages/UnitsPage.js'
import { ChaptersPage } from './pages/ChaptersPage.js'
import { ChapterPage } from './pages/ChapterPage.js'
import { AdminLogin } from './pages/admin/AdminLogin.js'
import { AdminDashboard } from './pages/admin/AdminDashboard.js'
import { AdminChapterEditor } from './pages/admin/AdminChapterEditor.js'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<GradesPage />} />
            <Route path="/grade/:gradeId" element={<UnitsPage />} />
            <Route path="/unit/:unitId" element={<ChaptersPage />} />
            <Route path="/chapter/:chapterId" element={<ChapterPage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/chapter/:chapterId" element={<AdminChapterEditor />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
