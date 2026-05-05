#!/usr/bin/env node
/**
 * importQuestions.js
 *
 * Parses structured markdown files and bulk-upserts questions into Supabase.
 *
 * Usage:
 *   node scripts/importQuestions.js path/to/questions.md
 *
 * Environment (from .env in project root, or pre-set):
 *   SUPABASE_URL         — project URL
 *   SUPABASE_SERVICE_KEY — service role key (NOT the anon key)
 *
 * ── Supported formats (auto-detected) ───────────────────────────────────────
 *
 * FORMAT A — no section headers (section inferred from question-number resets):
 *   # Series 3 Form A – Mock Exam A Complete (All 5 Sections)
 *   Question numbers reset to Q1 at each section boundary. The parser increments
 *   an internal section counter whenever qNum <= prevQNum (a reset is detected).
 *
 * FORMAT B — section headers present:
 *   # Mock Exam B – Complete
 *   ## Section 1 – Questions 1–45
 *   … questions for section 1 …
 *   ## Section 2 – Questions 46–90
 *   … etc.
 *
 * In both formats, question blocks are separated by --- and follow this structure:
 *
 *   **Q1.** Stem text here. May continue on
 *   subsequent lines until the first choice.
 *
 *   A. First choice
 *   B. Second choice
 *   C. Third choice
 *   D. Fourth choice
 *
 *   **Correct Answer:**
 *   - **B.** Explanation for why B is correct. May span
 *   multiple lines until the next section marker.
 *
 *   **Incorrect Answers:**
 *   - **A.** Why A is wrong.
 *   - **C.** Why C is wrong.
 *   - **D.** Why D is wrong.
 *
 * Optional scenario blocks (either format):
 *   ## Scenario (applies to Q3–Q5)
 *   Patient is a 45-year-old woman who presents…
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

;(function loadDotEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq  = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !(key in process.env)) process.env[key] = val
    }
  } catch { /* .env is optional; env vars may be pre-set */ }
})(resolve(__dirname, '..', '.env.local'))

// Accept VITE_SUPABASE_URL as a fallback for SUPABASE_URL
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL
}

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.')
  process.exit(1)
}

const [,, mdPath] = process.argv
if (!mdPath) {
  console.error('Usage: node scripts/importQuestions.js <path-to-markdown>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Subject inference ────────────────────────────────────────────────────────
// Rules are tested in order; first match wins (most-specific first).

const SUBJECT_RULES = [
  {
    subject: 'Integumentary',
    keywords: [
      'wound', 'skin', 'dressing', 'burn', 'ulcer', 'maceration',
      'pressure injury', 'lymphedema', 'lymph node', 'edema',
    ],
  },
  {
    subject: 'Pediatrics',
    keywords: [
      'infant', 'pediatric', 'child', 'neonatal', 'congenital',
      'erb palsy', "erb's", 'apgar', 'osgood', 'legg-calv', 'developmental',
    ],
  },
  {
    subject: 'Neuromuscular',
    keywords: [
      'stroke', 'spinal cord', 'hemiplegia', 'hemiparesis', 'ataxia',
      'babinski', 'reflex', 'cranial nerve', 'motor neuron', 'cerebellar',
      'vestibular', 'cerebral palsy', 'guillain', 'parkinson',
      'multiple sclerosis', 'neuropathy', 'peripheral nerve',
      'seizure', 'cortex', 'neuromuscular',
    ],
  },
  {
    subject: 'Cardiovascular and Pulmonary',
    keywords: [
      'cardiac', 'heart', 'pulmonary', 'lung', 'blood pressure',
      'exercise test', 'aerobic', 'vo2', 'postural drainage',
      'myocardial', 'angina', 'nitroglycerin', 'carotid', 'venous',
      'arrhythmia', 'oxygen saturation',
    ],
  },
  {
    subject: 'Musculoskeletal',
    keywords: [
      'fracture', 'ligament', 'tendon', 'meniscus', 'rotator cuff',
      'scoliosis', 'arthritis', 'joint', 'range of motion', 'rom',
      'muscle', 'orthopedic', 'lumbar', 'cervical', 'thoracic',
      'shoulder', 'knee', 'hip', 'ankle', 'wrist', 'elbow',
      'spine', 'gait',
    ],
  },
]

function inferSubject(text) {
  const lower = text.toLowerCase()
  for (const { subject, keywords } of SUBJECT_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return subject
  }
  return 'Other'
}

// ── Tag extraction ───────────────────────────────────────────────────────────
// Multi-word terms listed first so they take precedence over their substrings.

const TAG_TERMS = [
  'rotator cuff', 'spinal cord', 'blood pressure', 'range of motion',
  'multiple sclerosis', 'cerebral palsy', 'pressure injury',
  'peripheral neuropathy', 'cranial nerve', 'motor neuron',
  'oxygen saturation', 'postural drainage',
  'Guillain-Barré', 'Parkinson', 'Babinski',
  'fracture', 'ligament', 'tendon', 'meniscus', 'scoliosis', 'arthritis',
  'lumbar', 'cervical', 'thoracic', 'shoulder', 'knee', 'hip',
  'ankle', 'wrist', 'elbow', 'stroke', 'ataxia', 'hemiplegia',
  'hemiparesis', 'neuropathy', 'angina', 'pulmonary', 'wound',
  'burn', 'ulcer', 'edema', 'gait', 'orthosis', 'prosthesis',
  'vestibular', 'developmental',
]

const TAG_STOP = new Set([
  'Physical', 'Therapy', 'Therapist', 'Patient', 'Treatment', 'Exercise',
  'Following', 'Presents', 'History', 'Which', 'What', 'This', 'That',
  'With', 'From', 'Into', 'Upon', 'Most', 'Best', 'Next',
])

function extractTags(stem) {
  const lower = stem.toLowerCase()
  const found = []

  for (const term of TAG_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      found.push(term)
      if (found.length >= 4) return found
    }
  }

  // Backfill to at least 2 tags using capitalized proper nouns from the stem
  if (found.length < 2) {
    for (const noun of (stem.match(/\b[A-Z][a-z]{4,}\b/g) || [])) {
      if (!TAG_STOP.has(noun) && !found.includes(noun)) {
        found.push(noun)
        if (found.length >= 4) return found
      }
    }
  }

  return found.slice(0, 4)
}

// ── Markdown parser ──────────────────────────────────────────────────────────

function parseFile(md) {
  // Header: "# {exam_series} – {anything}"
  // Both formats keep exam_series as the part before the first – / — / -
  const headerLine = md.split('\n').find((l) => l.startsWith('# '))
  if (!headerLine) throw new Error('Missing file header (expected: # Exam Name – …)')

  const hm = headerLine.match(/^#\s+(.+?)\s+[–—-]+/)
  if (!hm) throw new Error(`Cannot parse header: "${headerLine}"`)
  const examSeries = hm[1].trim()

  // If the header names a section ("… Section 2 …"), use it as the starting
  // section for both Format A (sectionCounter) and Format B (currentSection).
  const headerSectionMatch = headerLine.match(/Section\s+(\d+)/i)
  const headerSection = headerSectionMatch ? parseInt(headerSectionMatch[1]) : null

  // Split on --- separators
  const blocks = md.split(/\n---+\n/).map((b) => b.trim()).filter(Boolean)

  // Auto-detect format: Format B has "## Section N" blocks; Format A does not.
  const hasSectionHeaders = blocks.some((b) => /^##\s+Section\s+\d+/i.test(b))

  // First pass: collect scenario text by question number { [qNum]: text }
  const scenarios = {}
  for (const block of blocks) {
    const sm = block.match(/^##\s+Scenario\s*\(applies to Q(\d+)[–—-]+Q(\d+)\)/i)
    if (!sm) continue
    const body = block.split('\n').slice(1).join('\n').trim()
    for (let n = parseInt(sm[1]); n <= parseInt(sm[2]); n++) scenarios[n] = body
  }

  // Second pass: parse questions in block order.
  // Format B: section from explicit "## Section N" headers.
  // Format A: section tracked via question-number resets — when qNum <= prevQNum,
  //           the numbering has reset, signaling the start of the next section.
  const questions = []
  let currentSection  = headerSection ?? null  // Format B: seed from header if present
  let sectionCounter  = headerSection ?? 1     // Format A: seed from header if present
  let prevQNum        = null                   // Format A

  for (const block of blocks) {
    // Format B: update section context when a "## Section N" block is seen
    const sm = block.match(/^##\s+Section\s+(\d+)/i)
    if (sm) {
      currentSection = parseInt(sm[1])
      continue
    }

    const qm = block.match(/^\*\*Q(\d+)\.\*\*/)
    if (!qm) continue
    const qNum = parseInt(qm[1])

    let section
    if (hasSectionHeaders) {
      section = currentSection
    } else {
      if (prevQNum !== null && qNum <= prevQNum) sectionCounter++
      prevQNum = qNum
      section  = sectionCounter
    }

    if (!section || section < 1 || section > 5) {
      console.warn(`  ⚠  Q${qNum}: cannot determine section — skipped`)
      continue
    }

    try {
      questions.push(parseQuestion(block, qNum, scenarios[qNum] ?? null, examSeries, section))
    } catch (err) {
      console.warn(`  ⚠  Q${qNum}: ${err.message}`)
    }
  }

  return { examSeries, hasSectionHeaders, questions }
}

function parseQuestion(block, qNum, scenario, examSeries, section) {
  const lines = block.split('\n')

  // ── Stem ────────────────────────────────────────────────────────────────────
  const firstLineStem = lines[0].replace(/^\*\*Q\d+\.\*\*\s*/, '').trim()
  const stemParts     = firstLineStem ? [firstLineStem] : []
  let i = 1
  while (i < lines.length) {
    const t = lines[i].trim()
    if (/^[A-D]\.\s/.test(t) || /^\*\*Correct Answer/.test(t)) break
    if (t && !/^##/.test(t)) stemParts.push(t)
    i++
  }
  let stem = stemParts.join(' ').trim()
  if (!stem) throw new Error('empty stem')
  if (scenario) stem = `[SCENARIO]\n${scenario}\n\n${stem}`

  // ── Choices A–D ─────────────────────────────────────────────────────────────
  const choiceMap = {}
  while (i < lines.length) {
    const m = lines[i].trim().match(/^([A-D])\.\s+(.+)/)
    if (!m) break
    choiceMap[m[1]] = m[2].trim()
    i++
  }
  const choices = ['A', 'B', 'C', 'D'].map((letter) => {
    if (!choiceMap[letter]) throw new Error(`missing choice ${letter}`)
    return choiceMap[letter]
  })

  // ── Locate section markers ───────────────────────────────────────────────────
  const correctStart   = lines.findIndex((l) => /^\*\*Correct Answer:\*\*/.test(l.trim()))
  const incorrectStart = lines.findIndex((l) => /^\*\*Incorrect Answers:\*\*/.test(l.trim()))
  if (correctStart === -1) throw new Error('missing **Correct Answer:**')

  // ── Parse correct answer ─────────────────────────────────────────────────────
  const correctBlock = incorrectStart !== -1
    ? lines.slice(correctStart + 1, incorrectStart)
    : lines.slice(correctStart + 1)

  const cEntryIdx = correctBlock.findIndex((l) => /^-\s+\*\*[A-D]\.\*\*/.test(l.trim()))
  if (cEntryIdx === -1) throw new Error('missing correct answer entry (- **B.** …)')

  const cMatch = correctBlock[cEntryIdx].trim().match(/^-\s+\*\*([A-D])\.\*\*\s*(.*)/)
  if (!cMatch) throw new Error('cannot parse correct answer entry')
  const correctLetter = cMatch[1]
  const correctIndex  = 'ABCD'.indexOf(correctLetter)

  // Collect multi-line correct rationale until next entry or end of block
  const rParts = cMatch[2].trim() ? [cMatch[2].trim()] : []
  for (let j = cEntryIdx + 1; j < correctBlock.length; j++) {
    const t = correctBlock[j].trim()
    if (!t || /^-\s+\*\*[A-D]\.\*\*/.test(t)) break
    rParts.push(t)
  }
  const rationale = rParts.filter(Boolean).join(' ').trim()
  if (!rationale) throw new Error('empty rationale for correct answer')

  // ── Build rationale_map { "0": text, "1": text, "2": text, "3": text } ───────
  const rationaleMap = { [String(correctIndex)]: rationale }

  if (incorrectStart !== -1) {
    let j = incorrectStart + 1
    while (j < lines.length) {
      const m = lines[j].trim().match(/^-\s+\*\*([A-D])\.\*\*\s*(.*)/)
      if (!m) { j++; continue }
      const idx   = String('ABCD'.indexOf(m[1]))
      const parts = m[2].trim() ? [m[2].trim()] : []
      j++
      while (j < lines.length) {
        const t = lines[j].trim()
        if (!t || /^-\s+\*\*[A-D]\.\*\*/.test(t)) break
        parts.push(t)
        j++
      }
      rationaleMap[idx] = parts.filter(Boolean).join(' ').trim()
    }
  }

  // Fill any missing indices with empty string
  for (let k = 0; k < 4; k++) {
    if (rationaleMap[String(k)] === undefined) rationaleMap[String(k)] = ''
  }

  return {
    stem,
    choices,
    correct_index:   correctIndex,
    rationale,
    rationale_map:   rationaleMap,
    subject:         inferSubject(stem),
    difficulty:      'Medium',
    tags:            extractTags(stem),
    exam_series:     examSeries,
    section,
    question_number: qNum,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = resolve(process.cwd(), mdPath)

  let md
  try {
    md = readFileSync(filePath, 'utf-8')
  } catch {
    console.error(`ERROR: File not found: ${filePath}`)
    process.exit(1)
  }

  let parsed
  try {
    parsed = parseFile(md)
  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    process.exit(1)
  }

  const { examSeries, hasSectionHeaders, questions } = parsed
  const fmt = hasSectionHeaders ? 'Format B (section headers)' : 'Format A (continuous)'
  console.log(`Parsed ${questions.length} question(s) — "${examSeries}" [${fmt}]`)

  if (questions.length === 0) {
    console.error('No questions parsed — check your markdown format.')
    process.exit(1)
  }

  // Validate before insert
  const valid = []
  for (const q of questions) {
    const errs = []
    if (q.choices.length !== 4)                      errs.push('choices.length !== 4')
    if (q.correct_index < 0 || q.correct_index > 3) errs.push('correct_index out of range')
    if (!q.stem)                                     errs.push('empty stem')
    if (!q.rationale)                                errs.push('empty rationale')
    if (errs.length) {
      console.warn(`  ⚠  Q${q.question_number}: ${errs.join(', ')} — skipped`)
      continue
    }
    valid.push(q)
  }

  if (valid.length === 0) {
    console.error('All questions failed validation.')
    process.exit(1)
  }

  // Deduplicate on (exam_series, section, question_number) — keep last occurrence.
  // Supabase throws "ON CONFLICT DO UPDATE command cannot affect row a second time"
  // if the same conflict key appears twice in a single upsert payload.
  const seen = new Map()
  for (const row of valid) {
    const key = `${row.exam_series}|${row.section}|${row.question_number}`
    if (seen.has(key)) console.warn(`  ⚠  duplicate key ${key} — keeping later occurrence`)
    seen.set(key, row)
  }
  const deduped = [...seen.values()]
  if (deduped.length < valid.length) {
    console.warn(`  ${valid.length - deduped.length} duplicate(s) removed before insert`)
  }

  // Report any question numbers missing from the expected Q1–Q225 range
  const parsedNums = new Set(deduped.map((q) => q.question_number))
  const missing = []
  for (let n = 1; n <= 225; n++) {
    if (!parsedNums.has(n)) missing.push(n)
  }
  if (missing.length > 0) {
    console.warn(`  Missing ${missing.length} question(s) from Q1–Q225: ${missing.join(', ')}`)
  }

  const { error } = await supabase
    .from('questions')
    .upsert(deduped, { onConflict: 'exam_series,section,question_number' })

  if (error) {
    console.error('ERROR: Supabase upsert failed:', error.message)
    process.exit(1)
  }

  // Log section breakdown
  const bySection = deduped.reduce((acc, q) => { acc[q.section] = (acc[q.section] || 0) + 1; return acc }, {})
  const breakdown = Object.entries(bySection).sort(([a], [b]) => a - b).map(([s, n]) => `S${s}:${n}`).join('  ')
  console.log(`Imported ${deduped.length} question(s) — ${breakdown}`)
}

main()
