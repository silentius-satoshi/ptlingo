// Assertions for src/lib/processReport.js — run: node scripts/testProcessReport.mjs
import { buildProcessReport, median, mean } from '../src/lib/processReport.js'

let n = 0
const ok = (cond, msg) => {
  n += 1
  if (!cond) {
    console.error(`FAIL ${n}: ${msg}`)
    process.exit(1)
  }
  console.log(`ok ${n} - ${msg}`)
}

// ── Fixture: the real scorable Form A shape — S1:45 S2:42 S3:45 S4:41 S5:45 = 218
const SECTION_SIZES = { 1: 45, 2: 42, 3: 45, 4: 41, 5: 45 }
const questions = []
Object.entries(SECTION_SIZES).forEach(([sec, count]) => {
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `q-${sec}-${i}`,
      section: Number(sec),
      subject: i % 3 === 0 ? 'Neuromuscular' : 'Musculoskeletal',
      difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
      question_number: (Number(sec) - 1) * 45 + i + 1,
      correct_index: 2,
    })
  }
})
ok(questions.length === 218, 'fixture is the 218-item scorable form')

// Answers: openers (first 5 of each section) wrong in S1/S3/S5, right elsewhere;
// body items right except every 10th; 3 blanks at the end of S3.
const answers = {}
const tpq = {}
questions.forEach((q) => {
  const idxInSection = Number(q.id.split('-')[2])
  const isOpener = idxInSection < 5
  const oddSection = q.section % 2 === 1
  const blank = q.section === 3 && idxInSection >= 42
  if (!blank) {
    if (isOpener && oddSection) answers[q.id] = 0        // opener misses in S1/S3/S5
    else if (!isOpener && idxInSection % 10 === 0) answers[q.id] = 1
    else answers[q.id] = 2
  }
  // Times: 100s baseline; last 10 of S1 at 40s (compression); opener of S1 slow.
  tpq[q.id] = q.section === 1 && idxInSection >= 35 ? 40 : isOpener && q.section === 1 ? 140 : 100
})

const changeLog = [
  { qid: 'q-1-7', idx: 7, sec: 1, from: 'C', to: 'A', correct_index: 2, into: 12000, onitem: 90000 },  // right→wrong
  { qid: 'q-1-8', idx: 8, sec: 1, from: 'C', to: 'B', correct_index: 2, into: 8000, onitem: 60000 },   // right→wrong
  { qid: 'q-2-9', idx: 54, sec: 2, from: 'A', to: 'C', correct_index: 2, into: 30000, onitem: 45000 }, // wrong→right
  { qid: 'q-2-11', idx: 56, sec: 2, from: 'A', to: 'B', correct_index: 2, into: 5000, onitem: 20000 }, // wrong→wrong
]

const session = {
  id: 'sess-1',
  type: 'exam',
  exam_number: 1,
  answers,
  time_per_question: tpq,
  marked: ['q-1-7'],
  started_at: '2026-08-04T13:00:00.000Z',
  submitted_at: '2026-08-04T20:44:00.000Z', // 464 gross minutes
}

const r = buildProcessReport({ session, questions, changeLog, examSeries: 'Series 3 Form A' })

// ── helpers ──
ok(median([1, 2, 3, 4]) === 2.5 && median([5]) === 5 && median([]) === null, 'median: even, single, empty')
ok(mean([]) === null && mean([2, 4]) === 3, 'mean: empty is null')

// ── shape / reconciliation ──
ok(r !== null, 'report builds')
ok(r.exam_series === 'Series 3 Form A', 'exam_series carried through')
ok(r.raw.per_item.length === 218 && r.raw.question_ids.length === 218, 'raw arrays kept, full length')
ok(r.answer_changes.total === r.answer_changes.raw.length, 'answer_changes.total === raw.length')
ok(r.score.by_section.map((s) => s.n).join(',') === '45,42,45,41,45', 'per-section item counts off the data')

// ── score ──
const expectCorrect = questions.filter((q) => answers[q.id] === 2).length
ok(r.score.correct === expectCorrect, `score.correct matches direct count (${expectCorrect})`)
ok(r.score.unanswered === 3, 'three blanks counted')
ok(r.score.by_section.find((s) => s.section === 3).unanswered === 3, 'blanks land in S3')
ok(r.score.by_subject.length === 2 && r.score.by_subject[0].raw_pct <= r.score.by_subject[1].raw_pct, 'subjects sorted ascending')

// ── pacing ──
const s1 = r.pacing.by_section.find((p) => p.section === 1)
ok(s1.compression_ratio === 0.38, `S1 compression 40/~106 ≈ 0.38 (got ${s1.compression_ratio})`)
ok(r.pacing.flags.some((f) => f.includes('compression') && f.includes('S1')), 'compression flag names S1')
ok(r.pacing.by_section.find((p) => p.section === 2).compression_ratio === 1, 'flat section ratio = 1')
ok(r.elapsed_minutes === 464 - 15 && r.break_deducted_minutes === 15, 'elapsed nets out the mandatory break')

// ── answer changes ──
ok(r.answer_changes.right_wrong === 2 && r.answer_changes.wrong_right === 1 && r.answer_changes.wrong_wrong === 1, 'classification 2/1/1')
ok(r.answer_changes.net === -1, 'net = -1')
ok(r.answer_changes.by_section.find((s) => s.section === 1).net === -2, 'S1 net -2')
ok(r.answer_changes.by_section.find((s) => s.section === 2).net === +1, 'S2 net +1')
ok(r.answer_changes.median_into_ms === 10000, 'median into = 10000ms')
ok(r.answer_changes.on_marked === 1 && r.answer_changes.on_unmarked === 3, 'marked split 1/3')
ok(!r.answer_changes.flags.some((f) => f.startsWith('net -')), 'net -1 does not trip the net<=-2 flag')

// ── attention ──
const a1 = r.attention.by_section.find((a) => a.section === 1)
ok(a1.opener_acc === 0, 'S1 opener 0/5')
ok(a1.opener_delta != null && a1.opener_delta < -10, 'S1 opener deficit > 10 points')
ok(r.attention.by_section.filter((a) => a.opener_delta < -10).length === 3, 'exactly 3 sagging sections (S1,S3,S5)')
ok(r.attention.verdict.startsWith('ramp-up confirmed'), `verdict is ramp-up (got: ${r.attention.verdict})`)
ok(r.attention.post_break_acc != null, 'post-break accuracy computed')

// ── zero-change degradation / edge cases ──
const r0 = buildProcessReport({ session: { ...session, answers: {}, marked: [] }, questions, changeLog: [] })
ok(r0.answer_changes.total === 0 && r0.answer_changes.net === 0 && r0.answer_changes.median_into_ms === null, 'zero changes degrade to 0/null, no division by zero')
ok(r0.score.correct === 0 && r0.score.unanswered === 218, 'all-blank session handled')
ok(buildProcessReport({ session: null, questions, changeLog: [] }) === null, 'null session → null')
ok(buildProcessReport({ session, questions: [], changeLog: [] }) === null, 'no questions → null')

// ── FSBPT-style breakdowns ──
ok(r.raw.per_item[0].question_number === 1 && r.raw.per_item[0].difficulty === 'Easy', 'per_item carries question_number + difficulty for offline joins')
ok(r.score.by_difficulty.length === 3 && r.score.by_difficulty.reduce((a, d) => a + d.n, 0) === 218, 'difficulty breakdown covers all items')
ok(r.score.marked_split.marked.n + r.score.marked_split.unmarked.n === 218, 'marked split partitions the form')
ok(r.pacing.by_subject.length === 2 && r.pacing.by_subject.every((s) => s.median_seconds != null), 'pacing by subject computed')

// change record with null correct_index falls back to the question row
const rFallback = buildProcessReport({
  session, questions,
  changeLog: [{ qid: 'q-4-3', idx: 0, sec: 4, from: 'C', to: 'A', correct_index: null, into: null, onitem: 0 }],
})
ok(rFallback.answer_changes.right_wrong === 1, 'null correct_index falls back to question row')

// sections absent → single-section, verdict not computable
const rFlat = buildProcessReport({
  session,
  questions: questions.slice(0, 20).map((q) => ({ ...q, section: null })),
  changeLog: [],
})
ok(rFlat.score.by_section.length === 1 && rFlat.attention.verdict.startsWith('not computable'), 'sectionless data degrades to one section, explicit verdict')

// fatigue verdict: flat openers, monotonically declining sections
const fatQ = questions
const fatAnswers = {}
fatQ.forEach((q) => {
  const idxInSection = Number(q.id.split('-')[2])
  // accuracy declines with section: miss every (7 - section)th item
  fatAnswers[q.id] = idxInSection % (8 - q.section) === 0 ? 0 : 2
})
const rFat = buildProcessReport({
  session: { ...session, answers: fatAnswers },
  questions: fatQ,
  changeLog: [],
})
ok(rFat.attention.verdict.startsWith('fatigue'), `fatigue pattern detected (got: ${rFat.attention.verdict})`)

console.log(`\nAll ${n} assertions passed.`)
