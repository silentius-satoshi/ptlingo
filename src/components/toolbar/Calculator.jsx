import { useState, useCallback } from 'react'

function evaluate(a, b, op) {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 'Error'
    default:  return b
  }
}

// Trim floating-point noise: 0.1 + 0.2 → 0.3 not 0.30000000000000004
function clean(n) {
  if (typeof n !== 'number') return n
  return parseFloat(n.toPrecision(12))
}

export default function Calculator() {
  const [display, setDisplay]               = useState('0')
  const [prev, setPrev]                     = useState(null)
  const [op, setOp]                         = useState(null)
  const [waitingForOperand, setWaiting]     = useState(false)

  const pushDigit = useCallback((d) => {
    setDisplay((cur) => {
      if (waitingForOperand) { setWaiting(false); return String(d) }
      if (cur === '0' && d !== '.') return String(d)
      if (d === '.' && cur.includes('.')) return cur
      return cur + d
    })
  }, [waitingForOperand])

  const pushOperator = useCallback((nextOp) => {
    const current = parseFloat(display)
    if (prev !== null && op && !waitingForOperand) {
      const result = clean(evaluate(prev, current, op))
      setDisplay(String(result))
      setPrev(typeof result === 'number' ? result : null)
    } else {
      setPrev(current)
    }
    setOp(nextOp)
    setWaiting(true)
  }, [display, prev, op, waitingForOperand])

  const pushEquals = useCallback(() => {
    if (op === null || prev === null) return
    const result = clean(evaluate(prev, parseFloat(display), op))
    setDisplay(String(result))
    setPrev(null)
    setOp(null)
    setWaiting(false)
  }, [display, prev, op])

  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setWaiting(false) }
  const backspace = () => setDisplay((c) => c.length > 1 ? c.slice(0, -1) : '0')
  const negate = () => setDisplay((c) => String(-parseFloat(c)))

  const BTN = 'flex items-center justify-center rounded-lg font-medium transition-colors text-sm h-10'
  const NUM  = `${BTN} bg-white dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600`
  const OP   = `${BTN} bg-teal-600 text-white hover:bg-teal-700`
  const FUNC = `${BTN} bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Calculator</h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Display */}
        <div className="bg-slate-950 dark:bg-black rounded-xl px-4 py-3 min-h-[64px] flex flex-col items-end justify-end gap-0.5">
          {op && prev !== null && (
            <span className="text-xs text-slate-500 font-mono">
              {prev} {op}
            </span>
          )}
          <span
            className="text-white font-mono font-medium leading-none"
            style={{ fontSize: display.length > 9 ? '14px' : display.length > 6 ? '20px' : '28px' }}
          >
            {display}
          </span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button className={FUNC} onClick={clear}>C</button>
          <button className={FUNC} onClick={negate}>±</button>
          <button className={FUNC} onClick={backspace}>⌫</button>
          <button className={OP}   onClick={() => pushOperator('÷')}>÷</button>
          {/* Row 2 */}
          <button className={NUM}  onClick={() => pushDigit('7')}>7</button>
          <button className={NUM}  onClick={() => pushDigit('8')}>8</button>
          <button className={NUM}  onClick={() => pushDigit('9')}>9</button>
          <button className={OP}   onClick={() => pushOperator('×')}>×</button>
          {/* Row 3 */}
          <button className={NUM}  onClick={() => pushDigit('4')}>4</button>
          <button className={NUM}  onClick={() => pushDigit('5')}>5</button>
          <button className={NUM}  onClick={() => pushDigit('6')}>6</button>
          <button className={OP}   onClick={() => pushOperator('−')}>−</button>
          {/* Row 4 */}
          <button className={NUM}  onClick={() => pushDigit('1')}>1</button>
          <button className={NUM}  onClick={() => pushDigit('2')}>2</button>
          <button className={NUM}  onClick={() => pushDigit('3')}>3</button>
          <button className={OP}   onClick={() => pushOperator('+')}>+</button>
          {/* Row 5 */}
          <button className={`${NUM} col-span-2`} onClick={() => pushDigit('0')}>0</button>
          <button className={NUM}  onClick={() => pushDigit('.')}>.</button>
          <button className={`${BTN} bg-teal-700 text-white hover:bg-teal-800`} onClick={pushEquals}>=</button>
        </div>
      </div>
    </div>
  )
}
