import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

// ─── useDebounce ─────────────────────────────────────────────────────────────
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// ─── useAuth ──────────────────────────────────────────────────────────────────
export function useAuth() {
  return useAuthStore()
}

// ─── useRequireAuth ───────────────────────────────────────────────────────────
export function useRequireAuth(requiredRole = null) {
  const { user, accessToken, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!accessToken) { navigate('/login'); return }
    if (requiredRole && user?.role !== requiredRole) {
      navigate('/')
    }
  }, [accessToken, user, isLoading, requiredRole, navigate])

  return { user, isLoading }
}

// ─── useLocalFilters ──────────────────────────────────────────────────────────
export function useLocalFilters(initialState) {
  const [filters, setFilters] = useState(initialState)

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => setFilters(initialState)

  return { filters, updateFilter, resetFilters }
}
