import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import useGamificationStore from '../stores/gamificationStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import PathNode, { HexNode } from '../components/gamification/PathNode'
import TreasureChest from '../components/gamification/TreasureChest'
import MissionCard from '../components/gamification/MissionCard'
import StreakBadge from '../components/gamification/StreakBadge'
import LevelBadge from '../components/gamification/LevelBadge'
import AllMissionsBanner from '../components/gamification/AllMissionsBanner'
import { PATH_SECTIONS, getNodeState } from '../lib/pathSections'

// X-position pattern: nodeIndex % 4
const JUSTIFY = ['justify-center', 'justify-start pl-8', 'justify-center', 'justify-end pr-8']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ThePathPage() {
  const navigate = useNavigate()
  const {
    loaded,
    streak, level, xp,
    subjectMastery,
    dailyMissions,
    generateDailyMissions,
    refreshHeartsForNewDay,
    awardXP,
  } = useGamificationStore()

  const { user } = useAuthStore()

  const [generatingMissions, setGeneratingMissions] = useState(false)
  const [showAllMissionsBanner, setShowAllMissionsBanner] = useState(false)
  const [claimedSystems, setClaimedSystems] = useState(() => new Set())

  const prevNodeStatesRef = useRef({})
  const globalActiveRef = useRef(null)
  const prevAllCompleteRef = useRef(false)

  // Generate missions if stale
  useEffect(() => {
    if (!loaded) return
    if (!dailyMissions?.date || dailyMissions.date !== todayStr()) {
      setGeneratingMissions(true)
      Promise.all([generateDailyMissions(), refreshHeartsForNewDay()])
        .finally(() => setGeneratingMissions(false))
    }
  }, [loaded, dailyMissions?.date, generateDailyMissions, refreshHeartsForNewDay])

  const missions = dailyMissions?.missions ?? []
  const allComplete = dailyMissions?.all_complete ?? false

  // Detect all_complete transition → show banner + confetti
  useEffect(() => {
    if (allComplete && !prevAllCompleteRef.current) {
      setShowAllMissionsBanner(true)
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { x: 0.5, y: 0.7 },
        colors: ['#14b8a6', '#f59e0b', '#ef4444', '#22c55e'],
      })
    }
    prevAllCompleteRef.current = allComplete
  }, [allComplete])

  // Auto-scroll to global active node after load
  useEffect(() => {
    if (loaded && globalActiveRef.current) {
      setTimeout(() => {
        globalActiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [loaded])

  // Load claimed milestones from Supabase
  useEffect(() => {
    if (!loaded || !user) return
    supabase.from('path_milestones')
      .select('system_name')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setClaimedSystems(new Set(data.map(r => r.system_name)))
      })
  }, [loaded, user])

  const allAbove60 = PATH_SECTIONS.every((s) => {
    const pct = subjectMastery[s.masteryKey]?.pct ?? subjectMastery[s.masteryKey] ?? 0
    return pct >= 60
  })

  const handleChestClaim = useCallback(async (sectionSystem, sectionLabel) => {
    if (claimedSystems.has(sectionSystem)) return
    setClaimedSystems(prev => new Set([...prev, sectionSystem]))
    awardXP(50, `${sectionLabel} Milestone! 🎉`)
    await supabase.from('path_milestones').insert({
      user_id: user.id,
      system_name: sectionSystem,
      xp_awarded: 50,
    })
  }, [claimedSystems, awardXP, user])

  // Build render items list
  const renderItems = []
  let nodeIndex = 0

  PATH_SECTIONS.forEach((section, sectionIdx) => {
    const masteryPct = subjectMastery[section.masteryKey]?.pct ?? subjectMastery[section.masteryKey] ?? 0

    renderItems.push({ type: 'banner', section, masteryPct, key: `banner-${section.system}` })

    section.nodes.forEach((node) => {
      const state = getNodeState(masteryPct, node)
      const prevState = prevNodeStatesRef.current[node.id] ?? state
      const wasLocked = prevState === 'locked' && state === 'active'
      prevNodeStatesRef.current[node.id] = state

      renderItems.push({
        type: 'node',
        node,
        state,
        section,
        masteryPct,
        wasLocked,
        isGlobalActive: false,
        nodeIndex,
        key: node.id,
      })
      nodeIndex++
    })

    // Treasure chest after each section
    const questionsAnswered = subjectMastery[section.masteryKey]?.total ?? 0
    const chestState = claimedSystems.has(section.system)
      ? 'opened'
      : (questionsAnswered >= 20 && masteryPct >= 60) ? 'unlocked' : 'locked'
    renderItems.push({ type: 'chest', chestState, section, key: `chest-${section.system}` })
    nodeIndex++
  })

  // Mark the FIRST active node across all sections as isGlobalActive
  let globalActiveFound = false
  for (const item of renderItems) {
    if (item.type === 'node' && item.state === 'active' && !globalActiveFound) {
      item.isGlobalActive = true
      globalActiveFound = true
      break
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 max-w-2xl mx-auto flex flex-col">

      {/* Streak + Level strip */}
      <section className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-6 flex-wrap">
        <StreakBadge streak={streak} />
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 flex-shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-[180px]">
          <LevelBadge level={level} xp={xp} />
        </div>
      </section>

      {/* Daily Missions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Today's Missions
          </h2>
          {allComplete && (
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              All complete!
            </span>
          )}
        </div>

        {generatingMissions ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <svg className="w-4 h-4 text-teal-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-400 dark:text-slate-500">Generating today's missions…</p>
          </div>
        ) : missions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 dark:text-slate-500 italic py-4 text-center">
            Generating missions…
          </div>
        )}
      </section>

      {/* The Path */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
          The Path
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
          Complete topics to master the NPTE blueprint
        </p>

        <div className="max-w-sm mx-auto flex flex-col">
          {renderItems.map((item, i) => {
            if (item.type === 'banner') {
              return (
                <div
                  key={item.key}
                  className={`rounded-xl px-4 py-3 flex items-center justify-between mb-3 ${i > 0 ? 'mt-6' : ''}`}
                  style={{ background: item.section.color }}
                >
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-white/70 tracking-wider">Body System</p>
                    <p className="text-white font-bold text-xl leading-tight">{item.section.label}</p>
                    <p className="text-white/60 text-[11px] mt-0.5">{item.masteryPct}% mastered</p>
                  </div>
                  <img
                    src={`/mascots/${item.section.mascot}.png`}
                    alt=""
                    className="w-16 h-16 object-contain flex-shrink-0"
                  />
                </div>
              )
            }

            if (item.type === 'chest') {
              return (
                <div key={item.key} className="flex justify-center my-5">
                  <TreasureChest
                    state={item.chestState}
                    onClaim={() => handleChestClaim(item.section.system, item.section.label)}
                  />
                </div>
              )
            }

            // Node row
            const justifyClass = JUSTIFY[item.nodeIndex % 4]
            const nextItem = renderItems[i + 1]
            const showConnector = nextItem && nextItem.type !== 'banner'

            return (
              <div key={item.key}>
                <div
                  ref={item.isGlobalActive ? globalActiveRef : undefined}
                  className={`flex ${justifyClass} py-2`}
                >
                  <PathNode
                    node={item.node}
                    state={item.state}
                    section={item.section}
                    masteryPct={item.masteryPct}
                    isGlobalActive={item.isGlobalActive}
                    wasLocked={item.wasLocked}
                    onPress={() => navigate(`/question-bank?subject=${encodeURIComponent(item.section.masteryKey)}`)}
                  />
                </div>
                {showConnector && (
                  <div className="flex justify-center">
                    <div className="w-px h-6 border-l-2 border-dashed border-slate-300 dark:border-slate-700" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Mock Exam hex nodes */}
          <div className="mt-8 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-2xl overflow-hidden">
            <HexNode
              label="Mock Exam 1"
              locked={!allAbove60}
              badge="Legendary"
              onClick={() => navigate('/exam/1/start')}
            />
            <div className="border-t border-slate-100 dark:border-slate-800" />
            <HexNode
              label="Mock Exam 2"
              locked={!allAbove60}
              badge="Legendary"
              onClick={() => navigate('/exam/2/start')}
            />
          </div>
        </div>
      </section>

      {/* All missions complete banner */}
      {showAllMissionsBanner && (
        <AllMissionsBanner onDismiss={() => setShowAllMissionsBanner(false)} />
      )}
    </div>
  )
}
