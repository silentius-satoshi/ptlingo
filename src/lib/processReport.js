// ── Mock process report ────────────────────────────────────────────────────────
// Pure derivation of the four process measures from an already-loaded session:
// score, pacing, answer changes, and ramp-up/attention. No fetching, no side
// effects — everything is computed from data the app has already persisted,
// so the report can be re-derived (and unit-tested) from raw arrays alone.
//
// The JSON produced by buildProcessReport IS the deliverable: it is handed back
// to the tutor thread whole, raw arrays included, and re-derived there. Summary
// numbers without the raw arrays would not be trusted, so never strip them.

// Extension is required: scripts/*.mjs load this under Node ESM, which does not
// resolve extensionless specifiers.
import { visitCounts } from './visitLog.js'

const LETTERS = ['A', 'B', 'C', 'D']

// Bump when the export shape or a measure's math changes, so cross-mock
// comparisons know which instrument produced which reading.
export const REPORT_VERSION = '2.1'

export function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function mean(arr) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

const pct1 = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : null)
const round2 = (x) => Math.round(x * 100) / 100

/**
 * Build the full process report object (§4.7 export shape).
 *
 * @param session   the sessions row, as loaded (answers, marked,
 *                  time_per_question, question_ids, timestamps, ...)
 * @param questions questions in TRUE FORM ORDER (session.question_ids order,
 *                  quarantined items already excluded), each carrying at least
 *                  { id, section, subject, correct_index }
 * @param changeLog the merged answer-change log (server/localStorage merge)
 * @param examSeries display string for the form, or null
 * @returns the report object, or null if there is nothing to report on
 */
export function buildProcessReport({ session, questions, changeLog = [], examSeries = null, visitLog = [] }) {
  if (!session || !questions?.length) return null
  const visits = visitCounts(visitLog)

  const answers = session.answers || {}
  const tpq = session.time_per_question || {}
  const markedSet = new Set(session.marked || [])

  // ── Per-item base table (true form order — everything derives from this) ──
  const perItem = questions.map((q, idx) => {
    const answered = answers[q.id] ?? null
    return {
      idx,
      qid: q.id,
      // question_number lets offline analysis join each item back to the
      // source form text (e.g. for work-activity classification, which the
      // app's data cannot express).
      question_number: q.question_number ?? null,
      section: q.section != null ? Number(q.section) : 1,
      subject: q.subject ?? null,
      difficulty: q.difficulty ?? null,
      answered,
      correct_index: q.correct_index ?? null,
      correct: answered !== null && answered === q.correct_index,
      seconds: tpq[q.id] || 0,
      marked: markedSet.has(q.id),
      changes: 0,
      visits: visits.get(q.id) || 0,
    }
  })
  const byQid = new Map(perItem.map((it) => [it.qid, it]))
  changeLog.forEach((c) => {
    const it = byQid.get(c.qid)
    if (it) it.changes += 1
  })

  const sections = [...new Set(perItem.map((it) => it.section))].sort((a, b) => a - b)
  const bySection = new Map(sections.map((s) => [s, perItem.filter((it) => it.section === s)]))

  // ── Measure 1 — score (raw only; the FSBPT scale conversion is not public,
  //    and a fabricated scale number would be actively misleading) ──
  const scorable = perItem.length
  const correct = perItem.filter((it) => it.correct).length
  const unanswered = perItem.filter((it) => it.answered === null).length
  const rawPct = pct1(correct, scorable)

  const scoreBySection = sections.map((s) => {
    const items = bySection.get(s)
    const c = items.filter((it) => it.correct).length
    return {
      section: s,
      n: items.length,
      correct: c,
      unanswered: items.filter((it) => it.answered === null).length,
      raw_pct: pct1(c, items.length),
    }
  })

  const subjects = [...new Set(perItem.map((it) => it.subject).filter(Boolean))]
  const scoreBySubject = subjects
    .map((j) => {
      const items = perItem.filter((it) => it.subject === j)
      const c = items.filter((it) => it.correct).length
      return { subject: j, n: items.length, correct: c, raw_pct: pct1(c, items.length) }
    })
    .sort((a, b) => (a.raw_pct ?? 0) - (b.raw_pct ?? 0))

  const difficulties = [...new Set(perItem.map((it) => it.difficulty).filter(Boolean))]
  const scoreByDifficulty = difficulties.map((d) => {
    const items = perItem.filter((it) => it.difficulty === d)
    const c = items.filter((it) => it.correct).length
    return { difficulty: d, n: items.length, correct: c, raw_pct: pct1(c, items.length) }
  })

  const markedItems = perItem.filter((it) => it.marked)
  const unmarkedItems = perItem.filter((it) => !it.marked)
  const markedSplit = {
    marked:   { n: markedItems.length,   correct: markedItems.filter((it) => it.correct).length,
                raw_pct: pct1(markedItems.filter((it) => it.correct).length, markedItems.length) },
    unmarked: { n: unmarkedItems.length, correct: unmarkedItems.filter((it) => it.correct).length,
                raw_pct: pct1(unmarkedItems.filter((it) => it.correct).length, unmarkedItems.length) },
  }

  const scoreFlags = scoreBySection
    .filter((r) => r.raw_pct != null && rawPct != null && rawPct - r.raw_pct > 8)
    .map((r) => `section ${r.section} is ${(rawPct - r.raw_pct).toFixed(1)} points below overall`)

  // ── Measure 2 — pacing ──
  // Compression ratio: mean time on the last 10 items of a section vs the mean
  // on everything before them. < 0.70 means the section ended in a sprint —
  // the failure mode that produces blanks and rushed misses in the same place.
  const overCeiling = perItem.filter((it) => it.seconds > 150).length
  const rushed = perItem.filter((it) => it.seconds < 30).length

  const pacingBySection = sections.map((s) => {
    const t = bySection.get(s).map((it) => it.seconds)
    const split = Math.max(1, t.length - 10)
    const head = t.slice(0, split)
    const tail = t.slice(split)
    const headMean = mean(head)
    const compression =
      head.length && tail.length && headMean > 0 ? round2(mean(tail) / headMean) : null
    return {
      section: s,
      median: median(t),
      rushed_under_30s: t.filter((x) => x < 30).length,
      over_ceiling_150s: t.filter((x) => x > 150).length,
      compression_ratio: compression,
    }
  })

  const pacingFlags = []
  const compressed = pacingBySection.filter(
    (r) => r.compression_ratio != null && r.compression_ratio < 0.7,
  )
  if (compressed.length) {
    pacingFlags.push(
      `end-of-section compression in ${compressed.map((r) => `S${r.section}`).join(', ')}`,
    )
  }
  if (overCeiling > 15) {
    pacingFlags.push(
      `${overCeiling} items over the 2:30 ceiling — the flag-and-move rule is not firing`,
    )
  }
  pacingBySection
    .filter((r) => r.rushed_under_30s > 10)
    .forEach((r) =>
      pacingFlags.push(
        `S${r.section}: ${r.rushed_under_30s} items under 30s — items are being abandoned rather than answered`,
      ),
    )

  const startedMs = session.started_at ? new Date(session.started_at).getTime() : null
  const submittedMs = session.submitted_at ? new Date(session.submitted_at).getTime() : null
  const grossMinutes =
    Number.isFinite(startedMs) && Number.isFinite(submittedMs)
      ? Math.round((submittedMs - startedMs) / 60000)
      : null
  // The scheduled break after Section 2 stops the clock; it exists whenever the
  // form actually has a section structure past Section 2.
  const breakDeducted = sections.length >= 3 ? 15 : 0
  const elapsedMinutes = grossMinutes != null ? Math.max(0, grossMinutes - breakDeducted) : null

  // ── Measure 3 — answer changes (the load-bearing measure) ──
  const classify = (c) => {
    const ci = c.correct_index ?? byQid.get(c.qid)?.correct_index ?? null
    if (ci == null) return null
    const key = LETTERS[ci]
    return { wasRight: c.from === key, nowRight: c.to === key }
  }

  let rightWrong = 0
  let wrongRight = 0
  let wrongWrong = 0
  let onMarked = 0
  const sectionNet = new Map(sections.map((s) => [s, 0]))

  changeLog.forEach((c) => {
    const item = byQid.get(c.qid)
    if (item?.marked) onMarked += 1
    const v = classify(c)
    if (!v) return
    const sec = Number(c.sec) || item?.section || null
    if (v.wasRight && !v.nowRight) {
      rightWrong += 1
      if (sec != null && sectionNet.has(sec)) sectionNet.set(sec, sectionNet.get(sec) - 1)
    } else if (!v.wasRight && v.nowRight) {
      wrongRight += 1
      if (sec != null && sectionNet.has(sec)) sectionNet.set(sec, sectionNet.get(sec) + 1)
    } else if (!v.wasRight && !v.nowRight) {
      wrongWrong += 1
    }
  })

  const net = wrongRight - rightWrong
  const intoVals = changeLog.map((c) => c.into).filter((x) => Number.isFinite(x))

  const changeFlags = []
  if (changeLog.length) {
    if (net <= -2) {
      changeFlags.push(
        `net ${net}: changing answers is costing more than it earns — first instinct stands unless the rule violated on the first pass can be NAMED`,
      )
    }
    if (net >= 3) {
      changeFlags.push(
        `net +${net}: revisiting works — the pacing plan should reserve time for it rather than letting it get squeezed`,
      )
    }
    if (wrongWrong > rightWrong + wrongRight) {
      changeFlags.push(
        `wrong→wrong dominates (${wrongWrong} of ${changeLog.length}): churn between distractors — those misses are content gaps, not slips`,
      )
    }
  }

  // ── Measure 4 — ramp-up / attention (tests the odd-section hypothesis) ──
  const acc1 = (arr) =>
    arr.length ? Math.round((arr.filter((it) => it.correct).length / arr.length) * 1000) / 10 : null

  const attentionBySection = sections.map((s) => {
    const items = bySection.get(s)
    const opener = items.slice(0, 5)
    const body = items.slice(5)
    const openerAcc = acc1(opener)
    const bodyAcc = acc1(body)
    const med = median(items.map((it) => it.seconds))
    const openerMean = mean(opener.map((it) => it.seconds))
    return {
      section: s,
      opener_acc: openerAcc,
      body_acc: bodyAcc,
      opener_delta:
        openerAcc != null && bodyAcc != null ? Math.round((openerAcc - bodyAcc) * 10) / 10 : null,
      opener_mean_seconds: openerMean != null ? Math.round(openerMean) : null,
      time_ratio: openerMean != null && med > 0 ? round2(openerMean / med) : null,
    }
  })

  // Breaks are offered at every section boundary, so "first items after a
  // break" is the opener window of every section after the first.
  const postBreakItems = sections.slice(1).flatMap((s) => bySection.get(s).slice(0, 5))
  const postBreakAcc = acc1(postBreakItems)

  // Verdict — stated explicitly, never left for the reader to infer.
  const saggingCount = attentionBySection.filter(
    (r) => r.opener_delta != null && r.opener_delta < -10,
  ).length
  const sectionAccs = scoreBySection.map((r) => r.raw_pct).filter((v) => v != null)
  const monotonicDecline =
    sectionAccs.length >= 3 &&
    sectionAccs.every((v, i) => i === 0 || v <= sectionAccs[i - 1]) &&
    sectionAccs[sectionAccs.length - 1] < sectionAccs[0]

  let verdict
  if (sections.length < 2) {
    verdict = 'not computable: this session has no section structure'
  } else if (saggingCount >= 3) {
    verdict = `ramp-up confirmed: ${saggingCount} of ${sections.length} sections show a >10-point opener deficit — the fix is a per-section reset ritual`
  } else if (monotonicDecline) {
    verdict =
      'fatigue, not ramp-up: openers are roughly flat but section accuracy declines monotonically across the sitting — the earlier ramp-up reading was wrong'
  } else {
    verdict =
      'neither pattern holds: no consistent opener deficit and no monotonic decline — the odd/even section pattern reads as variance'
  }

  return {
    report_version: REPORT_VERSION,
    session_id: session.id,
    exam_series: examSeries,
    generated_at: new Date().toISOString(),
    started_at: session.started_at ?? null,
    submitted_at: session.submitted_at ?? null,
    elapsed_minutes: elapsedMinutes,
    break_deducted_minutes: breakDeducted,

    score: {
      scorable,
      correct,
      unanswered,
      raw_pct: rawPct,
      by_section: scoreBySection,
      by_subject: scoreBySubject,
      by_difficulty: scoreByDifficulty,
      marked_split: markedSplit,
      flags: scoreFlags,
    },

    pacing: {
      median_seconds: median(perItem.map((it) => it.seconds)),
      over_ceiling_150s: overCeiling,
      rushed_under_30s: rushed,
      by_section: pacingBySection,
      by_subject: subjects.map((j) => {
        const t = perItem.filter((it) => it.subject === j).map((it) => it.seconds)
        return { subject: j, n: t.length, median_seconds: median(t),
                 over_ceiling_150s: t.filter((x) => x > 150).length }
      }),
      // Only meaningful when a visit log exists; 0/false otherwise.
      visit_log_present: (visitLog?.length ?? 0) > 0,
      revisited_items: perItem.filter((it) => it.visits > 1).length,
      flags: pacingFlags,
    },

    answer_changes: {
      total: changeLog.length,
      right_wrong: rightWrong,
      wrong_right: wrongRight,
      wrong_wrong: wrongWrong,
      net,
      median_into_ms: median(intoVals),
      on_marked: onMarked,
      on_unmarked: changeLog.length - onMarked,
      by_section: sections.map((s) => ({ section: s, net: sectionNet.get(s) })),
      flags: changeFlags,
      raw: changeLog,
    },

    attention: {
      by_section: attentionBySection,
      post_break_acc: postBreakAcc,
      verdict,
      flags: [],
    },

    raw: {
      question_ids: perItem.map((it) => it.qid),
      per_item: perItem,
      // Every visit, verbatim — revisit behavior, first-decision latency, and
      // exact compression all re-derive from this offline.
      visit_log: Array.isArray(visitLog) ? visitLog : [],
    },
  }
}
