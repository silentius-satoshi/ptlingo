import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

function ToolBtn({ active, onMouseDown, title, children }) {
  return (
    <button
      onMouseDown={onMouseDown}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

// ── Rich Text Editor ───────────────────────────────────────────────────────────

function RichEditor({ note, onSave, onDelete }) {
  const saveRef = useRef(null)
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: 'Start typing your notes…' }),
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (saveRef.current) clearTimeout(saveRef.current)
      saveRef.current = setTimeout(async () => {
        setSaving(true)
        await onSave(note.id, html)
        setSaving(false)
      }, 1000)
    },
  })

  useEffect(() => () => { if (saveRef.current) clearTimeout(saveRef.current) }, [])

  if (!editor) return null

  const cmd = (e, fn) => { e.preventDefault(); fn(); editor.commands.focus() }

  const toolbar = [
    {
      title: 'Bold',
      active: editor.isActive('bold'),
      onMouseDown: (e) => cmd(e, () => editor.chain().toggleBold().run()),
      icon: <strong>B</strong>,
    },
    {
      title: 'Italic',
      active: editor.isActive('italic'),
      onMouseDown: (e) => cmd(e, () => editor.chain().toggleItalic().run()),
      icon: <em>I</em>,
    },
    {
      title: 'Underline',
      active: editor.isActive('underline'),
      onMouseDown: (e) => cmd(e, () => editor.chain().toggleUnderline().run()),
      icon: <span className="underline">U</span>,
    },
    {
      title: 'Bullet list',
      active: editor.isActive('bulletList'),
      onMouseDown: (e) => cmd(e, () => editor.chain().toggleBulletList().run()),
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      title: 'Highlight',
      active: editor.isActive('highlight'),
      onMouseDown: (e) => cmd(e, () => editor.chain().toggleHighlight().run()),
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h4" strokeWidth={3} />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-1">
          {toolbar.map((t) => (
            <ToolBtn key={t.title} active={t.active} onMouseDown={t.onMouseDown} title={t.title}>
              {t.icon}
            </ToolBtn>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Saving…</span>
          )}
          <button
            onClick={onDelete}
            title="Delete note"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Question stem context */}
      {note.question?.stem && (
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Question
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
            {note.question.stem}
          </p>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-4 py-4 tiptap-editor scrollbar-thin">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}

// ── Note Card ──────────────────────────────────────────────────────────────────

function NoteCard({ note, isSelected, onClick }) {
  const excerpt = stripHtml(note.content)
  const stem = note.question?.stem || ''
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 transition-colors ${
        isSelected
          ? 'bg-teal-50 dark:bg-teal-900/15 border-l-2 border-l-teal-500'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug mb-1">
        {stem.slice(0, 100)}{stem.length > 100 ? '…' : ''}
      </p>
      {excerpt && (
        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 mb-1.5">
          {excerpt.slice(0, 80)}{excerpt.length > 80 ? '…' : ''}
        </p>
      )}
      <p className="text-[10px] text-slate-300 dark:text-slate-600">{fmtDate(note.updated_at)}</p>
    </button>
  )
}

// ── Folder item ────────────────────────────────────────────────────────────────

function FolderItem({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
        active
          ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={`text-xs ml-2 flex-shrink-0 ${
        active ? 'text-teal-500 dark:text-teal-400' : 'text-slate-300 dark:text-slate-600'
      }`}>
        {count}
      </span>
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { user } = useAuthStore()
  const [loading, setLoading]           = useState(true)
  const [notes, setNotes]               = useState([])
  const [selectedId, setSelectedId]     = useState(null)
  const [activeFolder, setActiveFolder] = useState('all')
  const [search, setSearch]             = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: notesData } = await supabase
        .from('notes')
        .select('id, question_id, content, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (!notesData?.length) { setNotes([]); setLoading(false); return }

      const qIds = [...new Set(notesData.map((n) => n.question_id))]
      const { data: qData } = await supabase
        .from('questions')
        .select('id, stem, subject')
        .in('id', qIds)

      const qMap = Object.fromEntries((qData || []).map((q) => [q.id, q]))
      setNotes(notesData.map((n) => ({ ...n, question: qMap[n.question_id] || null })))
      setLoading(false)
    }
    load()
  }, [user.id])

  // ── Derived ────────────────────────────────────────────────────────────────

  const allSubjects = [...new Set(notes.map((n) => n.question?.subject).filter(Boolean))].sort()

  const filteredNotes = notes.filter((n) => {
    if (activeFolder !== 'all' && n.question?.subject !== activeFolder) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!n.question?.stem?.toLowerCase().includes(q) && !stripHtml(n.content).toLowerCase().includes(q)) return false
    }
    return true
  })

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(async (noteId, html) => {
    const { error } = await supabase
      .from('notes')
      .update({ content: html })
      .eq('id', noteId)
      .eq('user_id', user.id)
    if (!error) {
      setNotes((prev) =>
        prev.map((n) => n.id === noteId ? { ...n, content: html, updated_at: new Date().toISOString() } : n)
      )
    }
  }, [user.id])

  const handleDelete = useCallback(async (noteId) => {
    await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    if (selectedId === noteId) setSelectedId(null)
    setDeleteConfirm(null)
  }, [user.id, selectedId])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — folder list */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          <FolderItem
            label="All Notes"
            count={notes.length}
            active={activeFolder === 'all'}
            onClick={() => { setActiveFolder('all'); setSelectedId(null) }}
          />
          {allSubjects.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Subjects
              </p>
              {allSubjects.map((subject) => {
                const count = notes.filter((n) => n.question?.subject === subject).length
                return (
                  <FolderItem
                    key={subject}
                    label={subject}
                    count={count}
                    active={activeFolder === subject}
                    onClick={() => { setActiveFolder(subject); setSelectedId(null) }}
                  />
                )
              })}
            </>
          )}
        </nav>
      </aside>

      {/* Center — note list */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {activeFolder === 'all' ? 'All Notes' : activeFolder}
            <span className="ml-2 text-slate-300 dark:text-slate-600 font-normal">{filteredNotes.length}</span>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-2.5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
              <svg className="w-8 h-8 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {notes.length === 0
                  ? 'No notes yet. Add notes while studying questions.'
                  : 'No notes match your filter.'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={selectedId === note.id}
                onClick={() => setSelectedId(note.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right — editor */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
        {selectedNote ? (
          <RichEditor
            key={selectedNote.id}
            note={selectedNote}
            onSave={handleSave}
            onDelete={() => setDeleteConfirm(selectedNote.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <svg className="w-10 h-10 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select a note to edit</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Notes auto-save as you type.</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Delete note?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This note will be permanently deleted and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
