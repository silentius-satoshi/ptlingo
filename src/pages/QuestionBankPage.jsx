import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Button from '../components/shared/Button'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const COUNT_PRESETS = [10, 25, 50, 75]

function ModeButton({ selected, onClick, title, sub }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
      }`}
    >
      <p className={`font-semibold ${selected ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
        {title}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
    </button>
  )
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
        selected
          ? 'bg-teal-600 border-teal-600 text-white'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {label}
    </button>
  )
}

export default function QuestionBankPage() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  const [allQuestions, setAllQuestions] = useState([])
  const [loadingQ, setLoadingQ]         = useState(true)
  const [mode, setMode]                 = useState('practice')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [selectedDiffs, setSelectedDiffs]       = useState([])
  const [countPreset, setCountPreset]   = useState(25)
  const [customCount, setCustomCount]   = useState('')
  const [useCustom, setUseCustom]       = useState(false)
  const [starting, setStarting]         = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    supabase
      .from('questions')
      .select('id, subject, difficulty')
      .then(({ data }) => {
        setAllQuestions(data || [])
        setLoadingQ(false)
      })
  }, [])

  const subjects = useMemo(
    () => [...new Set(allQuestions.map((q) => q.subject).filter(Boolean))].sort(),
    [allQuestions],
  )

  const matchingQuestions = useMemo(
    () =>
      allQuestions.filter((q) => {
        const s = selectedSubjects.length === 0 || selectedSubjects.includes(q.subject)
        const d = selectedDiffs.length === 0    || selectedDiffs.includes(q.difficulty)
        return s && d
      }),
    [allQuestions, selectedSubjects, selectedDiffs],
  )

  const requestedCount = useCustom ? (parseInt(customCount) || 0) : countPreset
  const actualCount    = Math.min(requestedCount, matchingQuestions.length)

  const toggleSubject = (s) =>
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )

  const toggleDiff = (d) =>
    setSelectedDiffs((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    )

  const handleStart = async () => {
    if (actualCount === 0) return
    setStarting(true)
    setError('')
    try {
      const shuffled    = [...matchingQuestions].sort(() => Math.random() - 0.5)
      const selectedIds = shuffled.slice(0, actualCount).map((q) => q.id)
      const timeRemaining = mode === 'timed' ? actualCount * 90 : 9 * 3600

      const { data: session, error: sErr } = await supabase
        .from('sessions')
        .insert({
          user_id:         user.id,
          type:            'quiz',
          mode,
          time_multiplier: 1,
          subjects:        selectedSubjects,
          difficulty:      selectedDiffs,
          question_ids:    selectedIds,
          total_questions: selectedIds.length,
          time_remaining:  timeRemaining,
          current_index:   0,
          status:          'in_progress',
        })
        .select()
        .single()

      if (sErr) throw sErr
      navigate(`/exam/${session.id}`)
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  const subjectLabel = selectedSubjects.length === 0
    ? 'All subjects'
    : selectedSubjects.length === 1
    ? selectedSubjects[0]
    : `${selectedSubjects.length} subjects`

  const diffLabel = selectedDiffs.length === 0
    ? 'All difficulties'
    : selectedDiffs.join(', ')

  const timeLabel = mode === 'timed'
    ? `~${Math.round(actualCount * 1.5)} min`
    : 'Unlimited'

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 py-8">
    <div className="w-full max-w-2xl flex flex-col gap-6">

      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Question Bank</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Build a custom quiz session.
        </p>
      </div>

      {/* Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Mode
        </p>
        <div className="flex gap-3">
          <ModeButton
            selected={mode === 'practice'}
            onClick={() => setMode('practice')}
            title="Practice"
            sub="Rationale revealed after each answer. No time pressure."
          />
          <ModeButton
            selected={mode === 'timed'}
            onClick={() => setMode('timed')}
            title="Timed"
            sub="Rationale revealed after each answer. Timer counts down."
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-5 space-y-5">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Filters
        </p>

        {/* Subjects */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5 text-center">Subject</p>
          {loadingQ ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {[80, 110, 95, 130, 90, 105].map((w, i) => (
                <div
                  key={i}
                  className="h-7 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
                  style={{ width: w }}
                />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No questions in database.</p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              <Chip
                label="All"
                selected={selectedSubjects.length === 0}
                onClick={() => setSelectedSubjects([])}
              />
              {subjects.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={selectedSubjects.includes(s)}
                  onClick={() => toggleSubject(s)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5 text-center">Difficulty</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Chip
              label="All"
              selected={selectedDiffs.length === 0}
              onClick={() => setSelectedDiffs([])}
            />
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={selectedDiffs.includes(d)}
                onClick={() => toggleDiff(d)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Question Count
          </p>
          {!loadingQ && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {matchingQuestions.length} available
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 justify-center">
          {COUNT_PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => { setCountPreset(n); setUseCustom(false) }}
              disabled={n > matchingQuestions.length}
              className={`w-14 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                !useCustom && countPreset === n
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {n}
            </button>
          ))}

          <div className={`flex items-center gap-1.5 rounded-xl border-2 px-3 transition-all ${
            useCustom
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
              : 'border-slate-200 dark:border-slate-700'
          }`}>
            <span className="text-xs text-slate-400 dark:text-slate-500 select-none">Custom</span>
            <input
              type="number"
              min="1"
              max={matchingQuestions.length}
              value={customCount}
              onFocus={() => setUseCustom(true)}
              onChange={(e) => { setCustomCount(e.target.value); setUseCustom(true) }}
              placeholder="—"
              className="w-12 py-2.5 bg-transparent text-sm font-semibold text-teal-700 dark:text-teal-400 focus:outline-none text-center tabular-nums placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {requestedCount > matchingQuestions.length && matchingQuestions.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 text-center">
            Only {matchingQuestions.length} questions match your filters — session will use all of them.
          </p>
        )}
        {matchingQuestions.length === 0 && !loadingQ && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-3 text-center">
            No questions match your current filters.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Session Summary
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: String(actualCount || '—'), label: 'Questions' },
            { value: mode === 'timed' ? 'Timed' : 'Practice',  label: 'Mode' },
            { value: timeLabel, label: 'Time' },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{item.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center">
          <span>{subjectLabel}</span>
          <span>·</span>
          <span>{diffLabel}</span>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <Button
        onClick={handleStart}
        disabled={starting || actualCount === 0 || loadingQ}
        size="lg"
        className="w-full"
      >
        {starting ? 'Creating session…' : `Start Quiz — ${actualCount || 0} Questions`}
      </Button>

      <p className="text-xs text-center text-slate-400 dark:text-slate-500">
        Progress is saved automatically. Resume anytime from Submissions.
      </p>
    </div>
    </div>
  )
}
