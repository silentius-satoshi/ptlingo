export function buildDrillQueue(flaggedQuestions, weakTagQuestions = []) {
  const tier1 = flaggedQuestions.filter((q) => q.times_incorrect >= 3)
  const tier2 = flaggedQuestions.filter((q) => q.times_incorrect === 2)
  const seenIds = new Set([...tier1, ...tier2].map((q) => q.id))
  const tier3 = weakTagQuestions.filter((q) => !seenIds.has(q.id))

  const queue = [...tier1, ...tier2, ...tier3]
  const deduped = []
  const dedupIds = new Set()
  for (const q of queue) {
    if (!dedupIds.has(q.id)) {
      deduped.push(q)
      dedupIds.add(q.id)
    }
  }
  return deduped.slice(0, 10)
}
