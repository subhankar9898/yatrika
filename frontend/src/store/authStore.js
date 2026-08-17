import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true, // true on first load — waits for refresh attempt

  setAuth: (user, accessToken) => set({ user, accessToken, isLoading: false }),

  clearAuth: () => set({ user: null, accessToken: null, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  isAuthenticated: () => !!get().accessToken,

  hasRole: (role) => get().user?.role === role,

  isAdmin: () => get().user?.role === 'admin',
  isGuide: () => get().user?.role === 'guide',
  isUser: () => get().user?.role === 'user',
}))

export default useAuthStore
