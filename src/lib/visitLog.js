// Visit-level timing for mock sittings. Pure — no React, no browser APIs — so
// ExamPage (writer), ResultsPage (reader), and scripts/ share one implementation.
//
// A "visit" is one continuous stay on one item: { idx, qid, enter, leave, ms }.
// enter/leave are ISO strings; ms is the visit duration; leave/ms are null while
// the visit is open. The log is append-only in visit order, which makes revisit
// counts, first-decision latency, and exact end-of-section compression all
// derivable offline — time_per_question alone aggregates away the visit shape.
//
// Persistence mirrors the answer-change log: Supabase (sessions.visit_log) is
// the system of record, localStorage is the crash mirror, longer log wins on
// load, server wins ties. The server write is a SEPARATE .update() from
// examSnapshot() — deliberately, so a missing visit_log column degrades to
// localStorage-only instead of failing every save (PostgREST fails the whole
// update on an unknown column).

export const visitLogKey = (sessionId) => `ptlingo_visit_log_${sessionId}`

export function mergeVisitLogs(localLog, serverLog) {
  const local  = Array.isArray(localLog)  ? localLog  : []
  const server = Array.isArray(serverLog) ? serverLog : []
  return local.length > server.length ? local : server
}

// Close the trailing open visit, if any. Returns a NEW array; never mutates.
export function closeLastVisit(log, leaveMs) {
  if (!Array.isArray(log) || log.length === 0) return Array.isArray(log) ? log : []
  const last = log[log.length - 1]
  if (!last || last.leave != null) return log
  const enterMs = new Date(last.enter).getTime()
  const closed = {
    ...last,
    leave: new Date(leaveMs).toISOString(),
    ms: Number.isFinite(enterMs) ? Math.max(0, leaveMs - enterMs) : null,
  }
  return [...log.slice(0, -1), closed]
}

// Close any open visit, then open a new one — unless the trailing visit is
// already open on the same item (StrictMode double-invoke / re-render guard).
export function appendVisit(log, idx, qid, enterMs) {
  const base = Array.isArray(log) ? log : []
  const last = base[base.length - 1]
  if (last && last.leave == null && last.idx === idx) return base
  const closed = closeLastVisit(base, enterMs)
  return [...closed, { idx, qid, enter: new Date(enterMs).toISOString(), leave: null, ms: null }]
}

// Visit counts per qid, for per-item enrichment in the process report.
export function visitCounts(log) {
  const counts = new Map()
  for (const v of Array.isArray(log) ? log : []) {
    if (!v?.qid) continue
    counts.set(v.qid, (counts.get(v.qid) || 0) + 1)
  }
  return counts
}
