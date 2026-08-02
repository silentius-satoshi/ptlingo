// Answer-change log storage contract, shared by ExamPage (writer) and
// ResultsPage (reader). Both used to carry their own copy of the key string and
// the merge rule; keeping one definition is what stops them drifting apart.

export const changeLogKey = (sessionId) => `ptlingo_answer_changes_${sessionId}`

// Supabase (sessions.answer_changes) is the system of record; localStorage is a
// redundant local mirror written synchronously by ExamPage. The mirror only wins
// when it holds MORE entries than the server copy — which is what a lost network
// write looks like. For an append-only, client-authored log, taking the longer of
// the two can never drop a change.
//
// The comparison is strict, so the server wins ties. That is deliberate: it is
// what keeps the server authoritative whenever the two agree in length.
export function mergeChangeLogs(localLog, serverLog) {
  const local  = Array.isArray(localLog)  ? localLog  : []
  const server = Array.isArray(serverLog) ? serverLog : []
  return local.length > server.length ? local : server
}
