import { useEffect, useRef, useState, useCallback, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import confetti from 'canvas-confetti'
import useGamificationStore from '../stores/gamificationStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import PathNode, { HexNode } from '../components/gamification/PathNode'
import TreasureChest from '../components/gamification/TreasureChest'
import { PATH_SECTIONS, getNodeState } from '../lib/pathSections'
import { getDueCount } from '../lib/reviewQueue'
import { rollXP } from '../lib/rewardEngine'
import ActiveSectionBanner from '../components/path/ActiveSectionBanner'


function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ThePathPage() {
  const navigate = useNavigate()
  const {
    loaded,
    subjectMastery,
    dailyMissions,
    generateDailyMissions,
    refreshHeartsForNewDay,
    awardXP,
  } = useGamificationStore()

  const { user } = useAuthStore()

  const [claimedSystems, setClaimedSystems] = useState(() => new Set())
  const [dueCount, setDueCount] = useState(0)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [activeSystemFilter, setActiveSystemFilter] = useState(null)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [visibleSystem, setVisibleSystem] = useState(PATH_SECTIONS[0].system)

  const prevNodeStatesRef = useRef({})
  const globalActiveRef = useRef(null)
  const prevAllCompleteRef = useRef(false)
  const sectionMarkersRef = useRef({})
  const scrollContainerRef = useRef(null)

  // Generate missions if stale
  useEffect(() => {
    if (!loaded) return
    if (!dailyMissions?.date || dailyMissions.date !== todayStr()) {
      Promise.all([generateDailyMissions(), refreshHeartsForNewDay()])
    }
  }, [loaded, dailyMissions?.date, generateDailyMissions, refreshHeartsForNewDay])

  const allComplete = dailyMissions?.all_complete ?? false

  // Confetti when all missions complete
  useEffect(() => {
    if (allComplete && !prevAllCompleteRef.current) {
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

  // Load due review count
  useEffect(() => {
    if (!user) return
    getDueCount(user.id, supabase)
      .then(setDueCount)
      .catch(err => console.error('getDueCount error:', err))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update sticky banner to match the section scrolled into view
  useEffect(() => {
    const container = scrollContainerRef.current ?? document.querySelector('main')
    if (!container) return

    const BANNER_HEIGHT = 80

    const handleScroll = () => {
      const scrollTop = container.scrollTop + BANNER_HEIGHT
      let currentSystem = PATH_SECTIONS[0].system
      for (const [system, el] of Object.entries(sectionMarkersRef.current)) {
        if (el && el.offsetTop <= scrollTop) {
          currentSystem = system
        }
      }
      setVisibleSystem(currentSystem)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [loaded])

  const allAbove60 = PATH_SECTIONS.every((s) => {
    const pct = subjectMastery[s.masteryKey]?.pct ?? subjectMastery[s.masteryKey] ?? 0
    return pct >= 60
  })

  const handleChestClaim = useCallback(async (sectionSystem, sectionLabel) => {
    if (claimedSystems.has(sectionSystem)) return
    setClaimedSystems(prev => new Set([...prev, sectionSystem]))
    const reward = rollXP(50)
    awardXP(reward.xp, `${sectionLabel} Milestone! 🎉`, reward.tier)
    await supabase.from('path_milestones').insert({
      user_id: user.id,
      system_name: sectionSystem,
      xp_awarded: 50,
    })
  }, [claimedSystems, awardXP, user])

  // Build render items list
  const renderItems = []
  let nodeIndex = 0

  PATH_SECTIONS.forEach((section) => {
    const masteryPct = subjectMastery[section.masteryKey]?.pct ?? subjectMastery[section.masteryKey] ?? 0
    const sessionsCompleted = Math.min(4, Math.floor((subjectMastery[section.masteryKey]?.total ?? 0) / 10))

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
        sessionsCompleted,
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

  const activeSection = activeSystemFilter
    ? (PATH_SECTIONS.find(s => s.system === activeSystemFilter) ?? PATH_SECTIONS[0])
    : (renderItems.find(i => i.type === 'node' && i.state === 'active')?.section ?? PATH_SECTIONS[0])

  const bannerSection = (visibleSystem
    ? PATH_SECTIONS.find(s => s.system === visibleSystem)
    : null) ?? activeSection

  const bannerMasteryPct = Math.round(subjectMastery[bannerSection.masteryKey]?.pct ?? 0)

  const visibleItems = activeSystemFilter
    ? renderItems.filter(item => item.section?.system === activeSystemFilter)
    : renderItems

  const sectionGroups = []
  let currentGroup = null
  for (const item of visibleItems) {
    if (item.type === 'banner') continue
    if (!currentGroup || currentGroup.section.system !== item.section?.system) {
      const pathSectionIdx = PATH_SECTIONS.findIndex(s => s.system === item.section.system)
      currentGroup = { section: item.section, pathSectionIdx, items: [] }
      sectionGroups.push(currentGroup)
    }
    currentGroup.items.push(item)
  }

  return (
    <div className="flex-1 flex flex-col w-full">

        {/* Sticky section banner */}
        <div className="sticky top-0 z-[35] px-4 pt-3 pb-2 bg-[#080d18] w-full">
          <ActiveSectionBanner
            systemLabel={bannerSection.label}
            systemColor={bannerSection.color}
            masteryPct={bannerMasteryPct}
            missions={dailyMissions?.missions ?? []}
            missionsOpen={missionsOpen}
            onToggleMissions={() => setMissionsOpen(o => !o)}
            onSwitcherOpen={() => setShowSwitcher(true)}
            dueCount={dueCount}
            onReviewTap={() => navigate(`/question-bank?mode=review&limit=${Math.min(dueCount, 10)}`)}
          />
        </div>

        {/* The Path */}
        <section className="px-4 pb-8">
          <div className="max-w-sm mx-auto flex flex-col mt-4">
            {sectionGroups.map(({ section, pathSectionIdx, items }, groupIndex) => {
              const mascotSide = pathSectionIdx % 2 === 0 ? 'left' : 'right'
              const isActiveSection = visibleSystem === section.system
                || (!visibleSystem && section === activeSection)
              const sectionNodes = items.filter(it => it.type === 'node')
              const totalNodes = sectionNodes.length
              const direction = pathSectionIdx % 2 === 0 ? 1 : -1
              const mascotImg = (
                <img
                  src={`/mascots/${section.mascot}.png`}
                  alt=""
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 120,
                    objectFit: 'contain',
                    objectPosition: 'top center',
                    opacity: isActiveSection ? 1 : 0.35,
                    filter: isActiveSection ? 'none' : 'grayscale(60%)',
                    transition: 'opacity 300ms ease, filter 300ms ease',
                  }}
                />
              )

              return (
                <Fragment key={section.system}>
                  {groupIndex > 0 && (
                    <div className="flex items-center gap-3 my-6 px-2">
                      <div className="flex-1 h-px bg-slate-700/60" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {section.label}
                      </span>
                      <div className="flex-1 h-px bg-slate-700/60" />
                    </div>
                  )}
                  <div>
                    <div
                      data-system={section.system}
                      ref={el => { sectionMarkersRef.current[section.system] = el }}
                    />
                    <div className="flex items-start">
                      {/* Left mascot column */}
                      <div className="w-[72px] md:w-[120px] flex-shrink-0 pt-8">
                        {mascotSide === 'left' && mascotImg}
                      </div>

                      {/* Path nodes center column */}
                      <div className="flex-1 flex flex-col">
                        {items.map((item) => {
                          if (item.type === 'chest') {
                            return (
                              <div key={item.key} className="flex justify-center my-4">
                                <TreasureChest
                                  state={item.chestState}
                                  onClaim={() => handleChestClaim(item.section.system, item.section.label)}
                                />
                              </div>
                            )
                          }

                          const nodeInSection = sectionNodes.indexOf(item)
                          const t = totalNodes > 1 ? nodeInSection / (totalNodes - 1) : 0.5
                          const bell = 4 * t * (1 - t)
                          const offsetPct = Math.round(bell * 26)
                          const translateX = direction * offsetPct

                          return (
                            <div
                              key={item.key}
                              ref={item.isGlobalActive ? globalActiveRef : undefined}
                              style={{
                                display: 'flex',
                                justifyContent: 'center',
                                transform: `translateX(${translateX}%)`,
                                paddingTop: 12,
                                paddingBottom: 12,
                              }}
                            >
                              <PathNode
                                node={item.node}
                                state={item.state}
                                section={item.section}
                                masteryPct={item.masteryPct}
                                isGlobalActive={item.isGlobalActive}
                                wasLocked={item.wasLocked}
                                sessionsCompleted={item.sessionsCompleted}
                                onPress={() => navigate(`/question-bank?subject=${encodeURIComponent(item.section.masteryKey)}`)}
                              />
                            </div>
                          )
                        })}
                      </div>

                      {/* Right mascot column */}
                      <div className="w-[72px] md:w-[120px] flex-shrink-0 pt-8">
                        {mascotSide === 'right' && mascotImg}
                      </div>
                    </div>
                  </div>
                </Fragment>
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

      {/* Subject switcher bottom sheet */}
      <AnimatePresence>
        {showSwitcher && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowSwitcher(false)}
            />

            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
              style={{ backgroundColor: '#1C1F2E', maxHeight: '80vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Handle + header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/20" />
                <p className="text-white font-bold text-base mt-2">Switch Subject</p>
                <button
                  className="rounded-full p-1.5 bg-white/10 active:opacity-70"
                  onClick={() => setShowSwitcher(false)}
                >
                  <X size={16} color="white" />
                </button>
              </div>

              {/* Section rows */}
              <div className="overflow-y-auto pb-8 px-4">
                {/* "All subjects" option */}
                <button
                  className="w-full flex items-center gap-3 py-3 border-b border-white/5 active:opacity-70"
                  onClick={() => { setActiveSystemFilter(null); setShowSwitcher(false) }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  >
                    🗺️
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold text-sm">All Subjects</p>
                    <p className="text-slate-400 text-xs mt-0.5">Show full path</p>
                  </div>
                  {activeSystemFilter === null && (
                    <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>

                {PATH_SECTIONS.map((section, idx) => {
                  const pct = Math.round(subjectMastery[section.masteryKey]?.pct ?? 0)
                  const isSelected = activeSystemFilter === section.system
                  const circ = 2 * Math.PI * 15
                  const offset = circ * (1 - pct / 100)
                  return (
                    <button
                      key={section.system}
                      className={`w-full flex items-center gap-3 py-3 active:opacity-70 ${idx < PATH_SECTIONS.length - 1 ? 'border-b border-white/5' : ''}`}
                      onClick={() => {
                        setActiveSystemFilter(isSelected ? null : section.system)
                        setShowSwitcher(false)
                      }}
                    >
                      <img
                        src={`/mascots/${section.mascot}.png`}
                        alt=""
                        className="w-14 h-14 object-contain flex-shrink-0"
                      />
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">{section.label}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{pct}% mastered</p>
                      </div>

                      {/* Mini progress ring */}
                      <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
                        <circle cx="18" cy="18" r="15" fill="none"
                          stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none"
                          stroke={section.color} strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          transform="rotate(-90 18 18)" />
                      </svg>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
