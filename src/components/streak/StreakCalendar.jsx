const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function buildWeekRows(year, month) {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function findRuns(row, year, month, practicedDays) {
  const runs = []
  let i = 0
  while (i < 7) {
    const day = row[i]
    if (day && practicedDays.has(toDateStr(year, month, day))) {
      const start = i
      while (i < 7 && row[i] && practicedDays.has(toDateStr(year, month, row[i]))) i++
      runs.push({ startCol: start, length: i - start })
    } else {
      i++
    }
  }
  return runs
}

export default function StreakCalendar({ practicedDays, month }) {
  const year = month.getFullYear()
  const mon = month.getMonth()
  const rows = buildWeekRows(year, mon)

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(h => (
          <div key={h} className="flex items-center justify-center">
            <span className="text-[10px] font-medium text-slate-500">{h}</span>
          </div>
        ))}
      </div>

      {/* Week rows */}
      {rows.map((row, rowIdx) => {
        const runs = findRuns(row, year, mon, practicedDays)
        return (
          <div key={rowIdx} className="grid grid-cols-7 relative items-center" style={{ minHeight: 40 }}>
            {/* Gradient overlay pill per consecutive run */}
            {runs.map(run => (
              <div
                key={run.startCol}
                className="absolute pointer-events-none rounded-full"
                style={{
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `${(run.startCol / 7) * 100}%`,
                  width: `${(run.length / 7) * 100}%`,
                  height: 32,
                  background: 'linear-gradient(to right, #FF9600, #FF4B4B)',
                }}
              />
            ))}

            {/* Day cells */}
            {row.map((day, colIdx) => {
              const isPracticed = day && practicedDays.has(toDateStr(year, mon, day))
              return (
                <div key={colIdx} className="flex items-center justify-center" style={{ height: 40 }}>
                  {day && (
                    <span
                      className="relative z-10 text-sm font-bold"
                      style={{ color: isPracticed ? 'white' : 'rgba(255,255,255,0.3)' }}
                    >
                      {day}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
