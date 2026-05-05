import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Badge from '../components/shared/Badge'
import Button from '../components/shared/Button'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return { date: '—', time: '' }
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

function fmtDuration(seconds) {
  if (seconds == null) return '—'
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function getTimeUsed(session) {
  const remaining = session.time_remaining ?? 0
  if (session.type === 'exam') return Math.max(0, 5 * 3600 * (session.time_multiplier || 1) - remaining)
  if (session.mode === 'practice') return Math.max(0, 9 * 3600 - remaining)
  return Math.max(0, (session.question_ids?.length || 0) * 90 - remaining)
}

function scoreColor(pct) {
  if (pct >= 75) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  // 8 cols: checkbox, date, type, questions, score, time (hidden), status, actions
  const widths = [0, 55, 40, 35, 30, 45, 50, 20]
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {widths.map((w, i) => (
        <td key={i} className={`px-4 py-4 ${i === 5 ? 'hidden md:table-cell' : ''}`}>
          {w > 0 && (
            <div
              className="h-4 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse"
              style={{ width: `${w}%` }}
            />
          )}
          {(i === 1 || i === 2) && (
            <div className="h-3 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse mt-1.5" style={{ width: `${w * 0.6}%` }} />
          )}
        </td>
      ))}
    </tr>
  )
}

function TypeBadge({ type, mode, examNumber }) {
  if (type === 'exam') return (
    <div>
      <Badge color="purple">Exam {examNumber ? `#${examNumber}` : ''}</Badge>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Timed</p>
    </div>
  )
  return (
    <div>
      <Badge color="teal">Quiz</Badge>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
        {mode === 'timed' ? 'Timed' : 'Practice'}
      </p>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'submitted') return <Badge color="green">Submitted</Badge>
  if (status === 'paused')    return <Badge color="amber">Paused</Badge>
  return <Badge color="blue">In Progress</Badge>
}

function MenuItem({ children, onClick, danger = false }) {
  return (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
      }`}
    >
      {children}
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const { user }   = useAuthStore()
  const navigate   = useNavigate()

  const [sessions, setSessions]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [openMenuId, setOpenMenuId]       = useState(null)
  const [selectedIds, setSelectedIds]     = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting]   = useState(false)

  const menuRef        = useRef(null)
  const selectAllRef   = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('id, type, mode, exam_number, question_ids, answers, score, time_remaining, time_multiplier, status, started_at, submitted_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keep select-all checkbox indeterminate state in sync
  useEffect(() => {
    if (!selectAllRef.current || sessions.length === 0) return
    const allChecked  = sessions.every((s) => selectedIds.has(s.id))
    const someChecked = sessions.some((s) => selectedIds.has(s.id))
    selectAllRef.current.indeterminate = someChecked && !allChecked
    selectAllRef.current.checked       = allChecked
  }, [selectedIds, sessions])

  // ── Selection helpers ───────────────────────────────────────────────────────

  const handleSelectAll = () => {
    const allChecked = sessions.every((s) => selectedIds.has(s.id))
    if (allChecked) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)))
    }
  }

  const handleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  const toggleMenu = (id, e) => {
    e.stopPropagation()
    setOpenMenuId((cur) => (cur === id ? null : id))
  }

  const handleRowClick = (s) => {
    if (s.status === 'submitted') navigate(`/results/${s.id}`)
    else navigate(`/exam/${s.id}`)
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    setOpenMenuId(null)
    if (!confirm('Delete this session? This cannot be undone.')) return
    await supabase.from('sessions').delete().eq('id', id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    const ids = [...selectedIds]
    const { error } = await supabase.from('sessions').delete().in('id', ids)
    if (!error) {
      setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)))
      setSelectedIds(new Set())
    }
    setConfirmBulkDelete(false)
    setBulkDeleting(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectionCount = selectedIds.size

  return (
    <div className="px-6 py-8">

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Submissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your past and in-progress sessions
          </p>
        </div>

        {selectionCount > 0 && (
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors"
          >
            Delete Selected ({selectionCount})
          </button>
        )}
      </div>

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <svg
            className="w-12 h-12 text-slate-300 dark:text-slate-600"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No submissions yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Start a session from the Question Bank or Mock Exams
            </p>
          </div>
          <Button onClick={() => navigate('/question-bank')}>Go to Question Bank</Button>
        </div>
      )}

      {/* Table */}
      {(loading || sessions.length > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {/* Select-all checkbox */}
                <th className="pl-4 pr-2 py-3 w-8">
                  {!loading && sessions.length > 0 && (
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label="Select all"
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-teal-600 accent-teal-600 cursor-pointer"
                    />
                  )}
                </th>
                {[
                  { label: 'Date' },
                  { label: 'Type' },
                  { label: 'Questions' },
                  { label: 'Score' },
                  { label: 'Time Spent', narrow: true },
                  { label: 'Status' },
                  { label: '', w: 'w-10' },
                ].map(({ label, narrow, w }, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${narrow ? 'hidden md:table-cell' : ''} ${w || ''}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                : sessions.map((s, ri) => {
                    const { date, time } = fmtDate(s.started_at)
                    const scorePercent   = s.score != null ? Math.round(s.score * 100) : null
                    const answeredCount  = Object.keys(s.answers || {}).length
                    const totalQ         = s.question_ids?.length ?? 0
                    const timeUsed       = s.status === 'submitted' ? getTimeUsed(s) : null
                    const isMenuOpen     = openMenuId === s.id
                    const isSelected     = selectedIds.has(s.id)

                    return (
                      <tr
                        key={s.id}
                        onClick={() => handleRowClick(s)}
                        className={`group cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                          isSelected
                            ? 'bg-teal-50/60 dark:bg-teal-900/10'
                            : ri % 2 === 1
                            ? 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/70 dark:hover:bg-slate-700/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="pl-4 pr-2 py-3.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(s.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-teal-600 accent-teal-600 cursor-pointer"
                          />
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="font-medium text-slate-700 dark:text-slate-200">{date}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{time}</p>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3.5">
                          <TypeBadge type={s.type} mode={s.mode} examNumber={s.exam_number} />
                        </td>

                        {/* Questions */}
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{totalQ}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                            {answeredCount} answered
                          </p>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3.5">
                          {scorePercent != null
                            ? <span className={`text-base font-bold tabular-nums ${scoreColor(scorePercent)}`}>{scorePercent}%</span>
                            : <span className="text-slate-300 dark:text-slate-600 font-semibold text-base">—</span>
                          }
                        </td>

                        {/* Time Spent — hidden on narrow viewports */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {timeUsed != null
                            ? <span className="text-slate-600 dark:text-slate-300 tabular-nums">{fmtDuration(timeUsed)}</span>
                            : s.time_remaining != null
                            ? <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                                {fmtDuration(s.time_remaining)} left
                              </span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>
                          }
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={s.status} />
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3.5 relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => toggleMenu(s.id, e)}
                            aria-label="Open menu"
                            className={`p-1.5 rounded-md transition-colors ${
                              isMenuOpen
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>

                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 overflow-hidden"
                            >
                              {s.status === 'submitted' ? (
                                <>
                                  <MenuItem
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      navigate(`/exam/${s.id}`, { state: { readOnly: true } })
                                    }}
                                  >
                                    Review Answers
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      navigate(`/results/${s.id}`)
                                    }}
                                  >
                                    View Results
                                  </MenuItem>
                                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                                  <MenuItem danger onClick={(e) => handleDelete(s.id, e)}>
                                    Delete
                                  </MenuItem>
                                </>
                              ) : (
                                <>
                                  <MenuItem
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      navigate(`/exam/${s.id}`)
                                    }}
                                  >
                                    {s.status === 'paused' ? 'Resume' : 'Continue'}
                                  </MenuItem>
                                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                                  <MenuItem danger onClick={(e) => handleDelete(s.id, e)}>
                                    Delete
                                  </MenuItem>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk-delete confirmation dialog */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Delete {selectionCount} submission{selectionCount !== 1 ? 's' : ''}?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
