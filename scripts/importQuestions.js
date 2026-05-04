#!/usr/bin/env node
/**
 * importQuestions.js
 *
 * Usage:
 *   node scripts/importQuestions.js <path-to-markdown-file> [--exam-number 1]
 *
 * Expects SUPABASE_URL and SUPABASE_SERVICE_KEY in environment:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... node scripts/importQuestions.js questions.md
 *
 * Or create a .env file in the project root (not .env.local — this is Node, not Vite):
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_KEY=...   ← use the service role key, NOT the anon key
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment.')
  process.exit(1)
}

const [,, mdPath, ...flags] = process.argv
if (!mdPath) {
  console.error('Usage: node scripts/importQuestions.js <path-to-markdown-file> [--exam-number 1]')
  process.exit(1)
}

const examNumberFlag = flags.indexOf('--exam-number')
const examNumber = examNumberFlag !== -1 ? parseInt(flags[examNumberFlag + 1]) : null

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Parser ────────────────────────────────────────────────────────────────────
// Expected markdown format per question block:
//
// ## Question
// <stem text>
//
// A) choice text
// B) choice text
// C) choice text
// D) choice text
//
// **Correct:** B
// **Subject:** Musculoskeletal
// **Difficulty:** Medium
// **Section:** 2
//
// **Rationale A:** ...
// **Rationale B:** ...
// **Rationale C:** ...
// **Rationale D:** ...
//
// **References:**
// - Reference 1
// - Reference 2
//
// ---

function parseMarkdown(md) {
  const blocks = md.split(/\n---+\n/).map((b) => b.trim()).filter(Boolean)
  const questions = []

  for (const block of blocks) {
    try {
      const q = parseBlock(block)
      if (q) questions.push(q)
    } catch (err) {
      console.warn('Skipping block — parse error:', err.message)
      console.warn('Block preview:', block.slice(0, 120))
    }
  }

  return questions
}

function parseBlock(block) {
  const lines = block.split('\n')

  // Stem: everything between "## Question" and first choice line
  const stemStart = lines.findIndex((l) => /^##\s+Question/i.test(l))
  if (stemStart === -1) return null

  const choiceStart = lines.findIndex((l) => /^[A-D]\)/i.test(l.trim()))
  if (choiceStart === -1) throw new Error('No choices found')

  const stem = lines.slice(stemStart + 1, choiceStart).join('\n').trim()
  if (!stem) throw new Error('Empty stem')

  // Choices A–D
  const choices = ['A', 'B', 'C', 'D'].map((letter) => {
    const line = lines.find((l) => l.trim().startsWith(`${letter})`))
    if (!line) throw new Error(`Missing choice ${letter}`)
    return line.trim().replace(/^[A-D]\)\s*/, '')
  })

  const get = (label) => {
    const line = lines.find((l) => new RegExp(`\\*\\*${label}:\\*\\*`, 'i').test(l))
    return line ? line.replace(new RegExp(`.*\\*\\*${label}:\\*\\*\\s*`, 'i'), '').trim() : null
  }

  const correctLetter = get('Correct')
  if (!correctLetter) throw new Error('Missing **Correct:**')
  const correctIndex = 'ABCD'.indexOf(correctLetter.toUpperCase())
  if (correctIndex === -1) throw new Error(`Invalid correct letter: ${correctLetter}`)

  const subject = get('Subject')
  if (!subject) throw new Error('Missing **Subject:**')

  const difficulty = get('Difficulty') || 'Medium'
  const sectionRaw = get('Section')
  const section = sectionRaw ? parseInt(sectionRaw) : null

  // Rationale per choice
  const rationale = ['A', 'B', 'C', 'D'].map((letter) => {
    const val = get(`Rationale ${letter}`)
    return val || ''
  })

  // References block
  const refStart = lines.findIndex((l) => /\*\*References:\*\*/i.test(l))
  const refs = []
  if (refStart !== -1) {
    for (let i = refStart + 1; i < lines.length; i++) {
      const l = lines[i].trim()
      if (!l) break
      if (l.startsWith('-')) refs.push(l.replace(/^-\s*/, ''))
    }
  }

  return { stem, choices, correct_index: correctIndex, rationale, references: refs, subject, difficulty, section }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = resolve(process.cwd(), mdPath)
  console.log(`Reading: ${filePath}`)

  let md
  try {
    md = readFileSync(filePath, 'utf-8')
  } catch {
    console.error(`ERROR: Cannot read file: ${filePath}`)
    process.exit(1)
  }

  const questions = parseMarkdown(md)
  console.log(`Parsed ${questions.length} questions`)

  if (questions.length === 0) {
    console.error('No questions parsed — check your markdown format.')
    process.exit(1)
  }

  // Add exam_number if flag provided
  const rows = questions.map((q) => ({ ...q, exam_number: examNumber }))

  // Batch insert in chunks of 100
  const CHUNK = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('questions').insert(chunk)
    if (error) {
      console.error(`ERROR inserting chunk ${i}–${i + chunk.length}:`, error.message)
      process.exit(1)
    }
    inserted += chunk.length
    console.log(`Inserted ${inserted} / ${rows.length}`)
  }

  console.log(`Done. ${inserted} questions imported.`)
}

main()
