import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    // Verify password by making a test admin request
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/admin/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
      body: JSON.stringify({ _test: true }),
    })
    if (res.status === 401) {
      setError('Incorrect password')
      return
    }
    sessionStorage.setItem('adminPassword', password)
    navigate('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-indigo-700 mb-6">Admin Login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg focus:outline-none focus:border-indigo-400"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white rounded-xl py-3 text-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  )
}
