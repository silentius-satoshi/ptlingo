export default function AnswerTokenChips({ keyTerms, primaryTerm, accentColor }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {keyTerms.map((term, i) => (
        <span
          key={i}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={
            term.toLowerCase() === primaryTerm?.toLowerCase()
              ? { background: accentColor, color: 'white' }
              : { background: '#2A2D3A', color: 'rgba(255,255,255,0.55)' }
          }
        >
          {term}
        </span>
      ))}
    </div>
  )
}
