import { create } from 'zustand'

export const useSessionStore = create((set, get) => ({
  // Active session data (mirrors sessions table)
  sessionId: null,
  type: null,           // 'quiz' | 'exam'
  mode: null,           // 'timed' | 'practice'
  timeMultiplier: 1,
  questions: [],
  currentIndex: 0,
  answers: {},          // { [questionId]: choiceIndex }
  marked: [],           // [questionId, ...]
  eliminated: {},       // { [questionId]: [choiceIndex, ...] }
  highlights: {},       // { [questionId]: [{ start, end }, ...] }
  notes: {},            // { [questionId]: string }
  timePerQuestion: {},  // { [questionId]: seconds }
  timeRemaining: 0,
  status: null,         // 'in_progress' | 'submitted'
  correctStreak: 0,

  setSession: (session) => set(session),

  incrementStreak: () => set((s) => ({ correctStreak: s.correctStreak + 1 })),
  resetStreak: () => set({ correctStreak: 0 }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setAnswer: (questionId, choiceIndex) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: choiceIndex },
    })),

  toggleMarked: (questionId) =>
    set((state) => ({
      marked: state.marked.includes(questionId)
        ? state.marked.filter((id) => id !== questionId)
        : [...state.marked, questionId],
    })),

  toggleEliminated: (questionId, choiceIndex) =>
    set((state) => {
      const current = state.eliminated[questionId] || []
      const updated = current.includes(choiceIndex)
        ? current.filter((i) => i !== choiceIndex)
        : [...current, choiceIndex]
      return { eliminated: { ...state.eliminated, [questionId]: updated } }
    }),

  setNote: (questionId, text) =>
    set((state) => ({
      notes: { ...state.notes, [questionId]: text },
    })),

  setHighlights: (questionId, ranges) =>
    set((state) => ({
      highlights: { ...state.highlights, [questionId]: ranges },
    })),

  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),

  setTimePerQuestion: (questionId, seconds) =>
    set((state) => ({
      timePerQuestion: { ...state.timePerQuestion, [questionId]: seconds },
    })),

  resetSession: () =>
    set({
      sessionId: null,
      type: null,
      mode: null,
      timeMultiplier: 1,
      questions: [],
      currentIndex: 0,
      answers: {},
      marked: [],
      eliminated: {},
      highlights: {},
      notes: {},
      timePerQuestion: {},
      timeRemaining: 0,
      status: null,
      correctStreak: 0,
    }),
}))
