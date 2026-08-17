// Theme store kept for backwards compatibility but dark mode is disabled.
// The app uses a light-only theme.
import { create } from 'zustand'

const useThemeStore = create(() => ({
  isDark: false,
  toggleTheme: () => {},
  initTheme: () => {
    // Ensure dark class is never applied
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('theme')
  },
}))

export default useThemeStore
