import { create } from 'zustand'

const getInitialDarkMode = () => {
  try {
    const dark = localStorage.getItem('darkMode') === 'true'
    if (dark) document.documentElement.classList.add('dark')
    return dark
  } catch {
    return false
  }
}

export const useUiStore = create((set) => ({
  darkMode: getInitialDarkMode(),
  sidebarOpen: true,
  toolbarExpanded: true,
  toolbarPanel: null, // 'progress' | 'calculator' | 'notes' | null

  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      try { localStorage.setItem('darkMode', String(next)) } catch {}
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { darkMode: next }
    }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleToolbar: () => set((state) => ({ toolbarExpanded: !state.toolbarExpanded })),

  setToolbarPanel: (panel) =>
    set((state) => ({
      toolbarPanel: state.toolbarPanel === panel ? null : panel,
    })),
}))
