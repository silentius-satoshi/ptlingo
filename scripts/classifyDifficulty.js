#!/usr/bin/env node
/**
 * classifyDifficulty.js
 *
 * Uses Claude to classify difficulty for all questions currently marked 'Medium'.
 * Updates each question in Supabase with the model's response.
 *
 * Usage:
 *   node scripts/classifyDifficulty.js
 *
 * Requires in .env.local:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_URL  (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY
 */

import Anthropic        from '@anthropic-ai/sdk'
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
  } catch { /* .env.local is optional; env vars may be pre-set */ }
})(resolve(__dirname, '..', '.env.local'))

if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL
}

const { ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env

if (!ANTHROPIC_API_KEY)      { console.error('ERROR: ANTHROPIC_API_KEY must be set.'); process.exit(1) }
if (!SUPABASE_URL)           { console.error('ERROR: SUPABASE_URL must be set.');       process.exit(1) }
if (!SUPABASE_SERVICE_KEY)   { console.error('ERROR: SUPABASE_SERVICE_KEY must be set.'); process.exit(1) }

// ── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Classify ─────────────────────────────────────────────────────────────────

const VALID = new Set(['Easy', 'Medium', 'Hard'])

async function classify(stem) {
  const msg = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 5,
    messages: [
      {
        role:    'user',
        content: `You are an NPTE question difficulty classifier.
Rate this question Easy, Medium, or Hard based on:
- Easy: straightforward recall, single-step reasoning
- Medium: requires clinical reasoning or 2-step logic
- Hard: complex multi-step reasoning, rare concepts, or requires synthesizing multiple systems

Question: ${stem}

Respond with only one word: Easy, Medium, or Hard.`,
      },
    ],
  })

  const raw = msg.content[0]?.text?.trim() ?? ''
  // Normalise in case the model adds punctuation despite the instruction
  const word = raw.replace(/[^A-Za-z]/g, '')
  const capitalised = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  return VALID.has(capitalised) ? capitalised : null
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch all Medium questions
  const { data: questions, error: fetchErr } = await supabase
    .from('questions')
    .select('id, stem, exam_series, section')
    .eq('difficulty', 'Medium')
    .order('exam_series', { ascending: true })
    .order('section',     { ascending: true })

  if (fetchErr) {
    console.error('ERROR fetching questions:', fetchErr.message)
    process.exit(1)
  }

  if (!questions || questions.length === 0) {
    console.log('No questions with difficulty = Medium found.')
    return
  }

  console.log(`Found ${questions.length} question(s) to classify.\n`)

  const tally = { Easy: 0, Medium: 0, Hard: 0 }
  let n = 0

  for (const q of questions) {
    n++
    const label = `Q${n} (${q.exam_series ?? 'bank'} S${q.section ?? '?'})`

    let difficulty
    try {
      difficulty = await classify(q.stem)
    } catch (err) {
      console.warn(`  ⚠  ${label}: API error — ${err.message}`)
      await sleep(500)
      continue
    }

    if (!difficulty) {
      console.warn(`  ⚠  ${label}: unexpected response — skipping`)
      await sleep(500)
      continue
    }

    // Update Supabase
    const { error: updateErr } = await supabase
      .from('questions')
      .update({ difficulty })
      .eq('id', q.id)

    if (updateErr) {
      console.warn(`  ⚠  ${label}: Supabase update failed — ${updateErr.message}`)
    } else {
      tally[difficulty]++
      console.log(`Classified ${label}: ${difficulty}`)
    }

    await sleep(500)
  }

  console.log(`\nDone — Easy: ${tally.Easy}  Medium: ${tally.Medium}  Hard: ${tally.Hard}`)
}

main()
