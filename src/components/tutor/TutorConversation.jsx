import { useEffect, useRef } from 'react'
import TutorMessage from './TutorMessage'
import TutorDrillCard from './TutorDrillCard'
import TutorRationaleCard from './TutorRationaleCard'

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function TutorConversation({ messages, isStreaming, onDrillAnswer, answeredDrillIds }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const showTyping = isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      {messages.map((msg) => {
        if (msg.type === 'drill_question') {
          return (
            <TutorDrillCard
              key={msg.id}
              question={msg.question}
              answered={answeredDrillIds?.has(msg.id)}
              onAnswerSubmit={(idx) => onDrillAnswer(msg.id, msg.question, idx)}
            />
          )
        }
        if (msg.type === 'rationale_card') {
          return <TutorRationaleCard key={msg.id} question={msg.question} />
        }
        if (!msg.content && msg.role === 'assistant') return null
        return <TutorMessage key={msg.id} role={msg.role} content={msg.content} />
      })}
      {showTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
