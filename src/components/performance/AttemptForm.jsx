import { useState, useEffect } from 'react'
import { saveAttempt } from '../../lib/npteAttempts'

const EMPTY_SCORES = { total_items: '', items_correct: '', scale_score: '' }

const INITIAL_FORM = () => ({
  attempt_number:      '',
  exam_date:           '',
  jurisdiction:        '',
  total_items:         200,
  items_correct:       '',
  scale_score:         '',
  passed:              false,
  retake_pass_rate:    '',
  retake_median_score: '',
  pwa: {
    pt_exam:       { ...EMPTY_SCORES },
    foundations:   { ...EMPTY_SCORES },
    interventions: { ...EMPTY_SCORES },
    nonsystem:     { ...EMPTY_SCORES },
  },
  body: {
    cardiopulmonary: { ...EMPTY_SCORES },
    musculoskeletal: { ...EMPTY_SCORES },
    neuromuscular:   { ...EMPTY_SCORES },
    integumentary:   { ...EMPTY_SCORES },
    other:           { ...EMPTY_SCORES },
  },
  sections: {
    1: { ...EMPTY_SCORES },
    2: { ...EMPTY_SCORES },
    3: { ...EMPTY_SCORES },
    4: { ...EMPTY_SCORES },
    5: { ...EMPTY_SCORES },
  },
})

const PWA_ROWS = [
  { key: 'pt_exam',       label: 'PT Examination' },
  { key: 'foundations',   label: 'Foundations/DDx' },
  { key: 'interventions', label: 'Interventions' },
  { key: 'nonsystem',     label: 'Nonsystem Domains' },
]

const BODY_ROWS = [
  { key: 'cardiopulmonary', label: 'Cardiovascular & Pulmonary' },
  { key: 'musculoskeletal', label: 'Musculoskeletal' },
  { key: 'neuromuscular',   label: 'Neuromuscular & Nervous' },
  { key: 'integumentary',   label: 'Integumentary & Lymphatic' },
  { key: 'other',           label: 'Other Systems' },
]

function attemptToForm(a) {
  const pwa      = {}
  const body     = {}
  const sections = {}
  ;(a.pwa      || []).forEach((r) => { pwa[r.activity]      = { total_items: r.total_items, items_correct: r.items_correct, scale_score: r.scale_score } })
  ;(a.body     || []).forEach((r) => { body[r.system]       = { total_items: r.total_items, items_correct: r.items_correct, scale_score: r.scale_score } })
  ;(a.sections || []).forEach((r) => { sections[r.section_number] = { total_items: r.total_items, items_correct: r.items_correct, scale_score: r.scale_score } })
  return {
    attempt_number:      a.attempt_number,
    exam_date:           a.exam_date,
    jurisdiction:        a.jurisdiction || '',
    total_items:         a.total_items,
    items_correct:       a.items_correct,
    scale_score:         a.scale_score,
    passed:              a.passed,
    retake_pass_rate:    a.retake_pass_rate ?? '',
    retake_median_score: a.retake_median_score ?? '',
    pwa:      { ...INITIAL_FORM().pwa,      ...pwa },
    body:     { ...INITIAL_FORM().body,     ...body },
    sections: { ...INITIAL_FORM().sections, ...sections },
  }
}

function validate(f) {
  const errs = {}
  if (!f.attempt_number) errs.attempt_number = 'Required'
  if (!f.exam_date)      errs.exam_date      = 'Required'
  if (!f.total_items)    errs.total_items    = 'Required'
  if (f.items_correct === '' || f.items_correct === undefined) errs.items_correct = 'Required'
  if (!f.scale_score)    errs.scale_score    = 'Required'
  const sc = parseInt(f.scale_score)
  if (sc < 300 || sc > 800) errs.scale_score = 'Must be 300–800'
  const ic = parseInt(f.items_correct), ti = parseInt(f.total_items)
  if (!isNaN(ic) && !isNaN(ti) && ic > ti) errs.items_correct = 'Cannot exceed total items'
  return errs
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, min, max, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${className}`}
    />
  )
}

function ScoreTableRow({ label, values, onChange }) {
  const pct = values.total_items && values.items_correct
    ? Math.round(parseInt(values.items_correct) / parseInt(values.total_items) * 100)
    : null
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium w-48">{label}</td>
      {['total_items', 'items_correct', 'scale_score'].map((field) => (
        <td key={field} className="px-2 py-2.5">
          <Input
            type="number"
            value={values[field]}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder="—"
            min={0}
            max={field === 'scale_score' ? 800 : undefined}
            className="text-center"
          />
        </td>
      ))}
      <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-500 text-center w-16">
        {pct != null ? `${pct}%` : '—'}
      </td>
    </tr>
  )
}

function ScoreTable({ rows, values, onChange }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-700">
          <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Domain</th>
          <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Items</th>
          <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Items Correct</th>
          <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Scale Score</th>
          <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <ScoreTableRow
            key={row.key}
            label={row.label}
            values={values[row.key]}
            onChange={(field, val) => onChange(row.key, field, val)}
          />
        ))}
      </tbody>
    </table>
  )
}

// ── Main Form ──────────────────────────────────────────────────────────────────

export default function AttemptForm({ userId, attempt, nextAttemptNumber, onSaved, onCancel }) {
  const [form, setForm]       = useState(attempt ? attemptToForm(attempt) : { ...INITIAL_FORM(), attempt_number: nextAttemptNumber })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setForm(attempt ? attemptToForm(attempt) : { ...INITIAL_FORM(), attempt_number: nextAttemptNumber })
  }, [attempt, nextAttemptNumber])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const setPwa = (key, field, val) =>
    setForm((f) => ({ ...f, pwa: { ...f.pwa, [key]: { ...f.pwa[key], [field]: val } } }))

  const setBody = (key, field, val) =>
    setForm((f) => ({ ...f, body: { ...f.body, [key]: { ...f.body[key], [field]: val } } }))

  const setSection = (n, field, val) =>
    setForm((f) => ({ ...f, sections: { ...f.sections, [n]: { ...f.sections[n], [field]: val } } }))

  const overallPct = form.total_items && form.items_correct
    ? Math.round(parseInt(form.items_correct) / parseInt(form.total_items) * 100)
    : null

  const handleSubmit = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true); setSaveError('')
    try {
      await saveAttempt(userId, form, attempt?.id ?? null)
      onSaved()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {attempt ? 'Edit NPTE Attempt' : 'Log NPTE Attempt'}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* ── Attempt Metadata ── */}
          <SectionHeader label="Attempt Metadata" />
          <div className="px-6 py-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Attempt #" error={errors.attempt_number}>
              <Input type="number" value={form.attempt_number} min={1}
                onChange={(e) => set('attempt_number', e.target.value)} placeholder="1" />
            </Field>
            <Field label="Exam Date" error={errors.exam_date}>
              <Input type="date" value={form.exam_date} onChange={(e) => set('exam_date', e.target.value)} />
            </Field>
            <Field label="Jurisdiction">
              <Input value={form.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)} placeholder="e.g. Texas" />
            </Field>
            <Field label="Result">
              <button
                onClick={() => set('passed', !form.passed)}
                className={`w-full py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  form.passed
                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
                    : 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {form.passed ? 'PASS' : 'FAIL'}
              </button>
            </Field>
            <Field label="Total Items" error={errors.total_items}>
              <Input type="number" value={form.total_items} min={1}
                onChange={(e) => set('total_items', e.target.value)} placeholder="200" />
            </Field>
            <Field label={`Items Correct${overallPct != null ? ` (${overallPct}%)` : ''}`} error={errors.items_correct}>
              <Input type="number" value={form.items_correct} min={0}
                onChange={(e) => set('items_correct', e.target.value)} placeholder="—" />
            </Field>
            <Field label="Scale Score (300–800)" error={errors.scale_score}>
              <Input type="number" value={form.scale_score} min={300} max={800}
                onChange={(e) => set('scale_score', e.target.value)} placeholder="—" />
            </Field>
            <Field label="Total Items">
              {/* spacer */}<div />
            </Field>
          </div>

          {/* Retake stats */}
          <div className="px-6 pb-4 grid grid-cols-2 gap-4">
            <Field label="Retake Pass Rate (% from report)">
              <Input type="number" value={form.retake_pass_rate} min={0} max={100}
                onChange={(e) => set('retake_pass_rate', e.target.value)} placeholder="e.g. 63" />
            </Field>
            <Field label="Retake Median Score (from report)">
              <Input type="number" value={form.retake_median_score} min={300} max={800}
                onChange={(e) => set('retake_median_score', e.target.value)} placeholder="e.g. 612" />
            </Field>
          </div>

          {/* ── Professional Work Activity ── */}
          <SectionHeader label="Professional Work Activity Scores" />
          <div className="overflow-x-auto">
            <ScoreTable
              rows={PWA_ROWS}
              values={form.pwa}
              onChange={setPwa}
            />
          </div>

          {/* ── Body Systems ── */}
          <SectionHeader label="Body System Scores" />
          <div className="overflow-x-auto">
            <ScoreTable
              rows={BODY_ROWS}
              values={form.body}
              onChange={setBody}
            />
          </div>

          {/* ── Section Scores ── */}
          <SectionHeader label="Section Scores" />
          <div className="overflow-x-auto">
            <ScoreTable
              rows={[1, 2, 3, 4, 5].map((n) => ({ key: n, label: `Section ${n}` }))}
              values={form.sections}
              onChange={(key, field, val) => setSection(key, field, val)}
            />
          </div>

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
          <div className="flex gap-3 ml-auto">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Attempt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
