// Simple markdown renderer — handles bold, italic, inline code, bullet/numbered lists.
// Content comes only from Claude so no sanitization needed beyond structural parsing.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      )
    return part
  })
}

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const result = []
  let listItems = []
  let listType = null
  let key = 0

  const flushList = () => {
    if (!listItems.length) return
    const Tag = listType === 'ol' ? 'ol' : 'ul'
    result.push(
      <Tag
        key={key++}
        className={listType === 'ol' ? 'list-decimal ml-5 space-y-0.5 my-1' : 'list-disc ml-5 space-y-0.5 my-1'}
      >
        {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </Tag>
    )
    listItems = []
    listType = null
  }

  for (const line of lines) {
    const olMatch = line.match(/^\d+\.\s+(.+)/)
    const ulMatch = line.match(/^[-*]\s+(.+)/)
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(olMatch[1])
    } else if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(ulMatch[1])
    } else {
      flushList()
      if (line.trim()) {
        result.push(<p key={key++} className="leading-relaxed">{renderInline(line)}</p>)
      }
    }
  }
  flushList()
  return result
}

export default function TutorMessage({ role, content }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 space-y-1.5">
        {renderMarkdown(content)}
      </div>
    </div>
  )
}
