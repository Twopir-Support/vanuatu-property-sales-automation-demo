import {
  Monitor,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Download,
  FileText,
  FileUp,
  Folder,
  FolderPlus,
  HardDrive,
  Home,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Printer,
  Search,
  Settings,
  Sheet,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
  X,
  CheckCircle2,
  AlertOctagon,
  Share,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Drawer } from '../components/ui/overlays'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProductFrame } from '../components/ui/ProductFrame'
import { contractPreview } from '../data/seed'
import { IDS, USERS } from '../data/ids'
import type { DemoState, DriveFile } from '../data/types'
import { cn, driveDate, dateTime, initials, longDate, time, vt } from '../lib/format'
import { useDemo } from '../store/DemoStore'
import { createDriveFolder, toggleStar, uploadDriveFile } from '../store/engine'

const typeIcon: Record<DriveFile['type'], { Icon: typeof Folder; cls: string; label: string }> = {
  folder: { Icon: Folder, cls: 'text-[#444746] fill-[#444746]', label: 'Folder' },
  pdf: { Icon: FileText, cls: 'text-[#ea4335]', label: 'PDF' },
  doc: { Icon: FileText, cls: 'text-[#4285f4]', label: 'Google Docs' },
  sheet: { Icon: Sheet, cls: 'text-[#0f9d58]', label: 'Google Sheets' },
  image: { Icon: ImageIcon, cls: 'text-[#d93025]', label: 'Image' },
}

const labelCls: Record<NonNullable<DriveFile['label']>, string> = {
  Received: 'bg-[#e6f4ea] text-[#137333]',
  Draft: 'bg-[#f1f3f4] text-[#3c4043]',
  Signed: 'bg-[#e6f4ea] text-[#0d652d] font-semibold',
  Generated: 'bg-[#e8f0fe] text-[#1967d2]',
  'Pending approval': 'bg-[#fef7e0] text-[#b06000]',
  Approved: 'bg-[#e6f4ea] text-[#137333]',
  Uploaded: 'bg-[#f1f3f4] text-[#3c4043]',
  Completed: 'bg-[#e6f4ea] text-[#137333]',
  Synced: 'bg-[#e8f0fe] text-[#1967d2]',
}

function FileIcon({ type, size = 20 }: { type: DriveFile['type']; size?: number }) {
  const { Icon, cls } = typeIcon[type]
  return <Icon size={size} className={cn('shrink-0', cls)} strokeWidth={type === 'folder' ? 1.5 : 2} />
}

function sizeLabel(kb?: number) {
  if (!kb) return '—'
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

export default function Documents() {
  const { state, run } = useDemo()
  const navigate = useNavigate()
  const { folderId = IDS.driveFolder } = useParams()
  const [params, setParams] = useSearchParams()
  const fileId = params.get('file')
  const previewId = params.get('view') === 'preview' ? fileId : null
  const [sort, setSort] = useState<'name' | 'modified'>('name')
  const files = state.drive.files
  // The LOT-025 folder only exists once Zap 2A has run; fall back to the development folder.
  const folder = files.find((f) => f.id === folderId) ?? files.find((f) => f.id === IDS.driveFolder) ?? files.find((f) => f.id === 'gd-hvr')!
  const children = files.filter((f) => f.parentId === folder.id)
  const byName = (a: DriveFile, b: DriveFile) => a.name.localeCompare(b.name)
  const byModified = (a: DriveFile, b: DriveFile) => b.modifiedAt.localeCompare(a.modifiedAt)
  const folders = children.filter((f) => f.type === 'folder').sort(sort === 'name' ? byName : byModified)
  const docs = children.filter((f) => f.type !== 'folder').sort(sort === 'name' ? byName : byModified)
  const lotFolderMissing = folder.id === 'gd-hvr' && !files.some((f) => f.id === IDS.driveFolder)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<string | null>(null)
  const [details, setDetails] = useState(false)
  const [menu, setMenu] = useState(false)
  const [newFolder, setNewFolder] = useState<string | null>(null)
  const [uploads, setUploads] = useState<{ name: string; done: boolean }[]>([])
  const [q, setQ] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => setSelected(null), [folderId])

  const crumbs = useMemo(() => {
    const out: DriveFile[] = []
    let cur: DriveFile | undefined = folder
    while (cur) {
      out.unshift(cur)
      cur = files.find((f) => f.id === cur!.parentId)
    }
    return out
  }, [folder, files])

  const searchResults = q.trim() ? files.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())) : null
  const open = (f: DriveFile) => (f.type === 'folder' ? navigate(`/documents/${f.id}`) : setParams({ file: f.id }))
  const sel = files.find((f) => f.id === selected) ?? folder

  const onUpload = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const arr = Array.from(list)
    setUploads(arr.map((f) => ({ name: f.name, done: false })))
    window.setTimeout(() => {
      arr.forEach((f) => run((s) => uploadDriveFile(s, folder.id, f.name, f.size / 1024)))
      setUploads(arr.map((f) => ({ name: f.name, done: true })))
    }, 1300)
  }

  const navItems = [
    { Icon: Home, label: 'Home' },
    { Icon: HardDrive, label: 'My Drive' },
    { Icon: Monitor, label: 'Computers' },
    { Icon: Users, label: 'Shared drives', active: true },
    { Icon: Users, label: 'Shared with me' },
    { Icon: Clock, label: 'Recent' },
    { Icon: Star, label: 'Starred' },
    { Icon: AlertOctagon, label: 'Spam' },
    { Icon: Trash2, label: 'Trash' },
    { Icon: Cloud, label: 'Storage' },
  ]

  const rows = searchResults ?? [...folders, ...docs]
  // Tree rows: folders expand in place (default: 04 Contracts once it has files).
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['gd-025-ctr']))
  const kids = (id: string) => files.filter((x) => x.parentId === id).sort((a, b) => (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1) || byName(a, b))
  const toggleOpen = (id: string) => setExpanded((e) => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const renderRows = (f: DriveFile, depth: number): React.ReactNode[] => {
    const isFolder = f.type === 'folder'
    const children = isFolder ? kids(f.id) : []
    const isOpen = isFolder && expanded.has(f.id) && !searchResults
    const row = (
      <tr key={f.id} onClick={() => setSelected(f.id)} onDoubleClick={() => open(f)} className={cn('group cursor-default border-b border-[#e1e3e1]', selected === f.id ? 'bg-gd-active' : 'hover:bg-[#f0f4f9]')}>
        <td className="py-1.5 pl-2">
          <span className="flex items-center gap-2" style={{ paddingLeft: depth * 28 }}>
            {isFolder ? (
              <button onClick={(e) => { e.stopPropagation(); toggleOpen(f.id) }} className="rounded p-0.5 text-gd-muted hover:bg-black/5" aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}>
                <ChevronRight size={15} className={cn('transition-transform', isOpen && 'rotate-90')} />
              </button>
            ) : <span className="w-5" />}
            <FileIcon type={f.type} />
            <button onClick={(e) => { e.stopPropagation(); open(f) }} className="pr-4 text-left font-medium break-all hover:underline">{f.name}</button>
            {f.starred && <Star size={13} className="fill-gd-muted text-gd-muted" />}
          </span>
        </td>
        <td className="hidden py-1.5 pr-4 lg:table-cell">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex size-6 items-center justify-center rounded-full bg-teal-700 text-[10px] text-white">{f.owner === 'Shared drive' ? 'SD' : initials(f.owner)}</span>
            {f.owner === 'Sarah Williams' ? 'me' : f.owner}
          </span>
        </td>
        <td className="hidden py-1.5 pr-4 whitespace-nowrap text-gd-muted md:table-cell">{driveDate(f.modifiedAt)}</td>
        <td className="hidden py-1.5 pr-4 whitespace-nowrap text-gd-muted xl:table-cell">{isFolder ? '—' : sizeLabel(f.sizeKb)}</td>
        <td className="py-1.5 whitespace-nowrap">
          {isFolder ? <span className="text-xs text-gd-muted">{children.length === 0 ? 'Empty' : `${children.length} ${children.length === 1 ? 'item' : 'items'}`}</span>
            : f.label ? <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', labelCls[f.label])}>{f.label}</span> : <span className="text-gd-muted">—</span>}
        </td>
        <td className="py-1.5 pr-2 text-right">
          <button onClick={(e) => { e.stopPropagation(); run((s) => toggleStar(s, f.id)) }} className="rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/5" aria-label="Star"><Star size={16} className={f.starred ? 'fill-gd-muted' : ''} /></button>
        </td>
      </tr>
    )
    return isOpen ? [row, ...children.flatMap((c) => renderRows(c, depth + 1))] : [row]
  }

  return (
    <ProductFrame product="Google Drive">
      <div className="flex min-h-0 flex-1 flex-col bg-gd-bg text-gd-text" style={{ fontFamily: "'Google Sans', Roboto, Inter, sans-serif" }}>
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 px-4">
          <div className="flex w-56 items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm"><HardDrive size={20} className="text-gd-blue" /></span>
            <span className="text-[22px] text-gd-muted">Drive</span>
            <span className="rounded bg-[#e8f0fe] px-1.5 text-[10px] text-gd-blue">simulated</span>
          </div>
          <div className="flex h-12 max-w-2xl flex-1 items-center gap-3 rounded-full bg-gd-search px-4 focus-within:bg-white focus-within:shadow">
            <Search size={20} className="text-gd-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files" className="flex-1 bg-transparent text-base outline-none" />
            {q && <button onClick={() => setQ('')}><X size={18} /></button>}
            <SlidersHorizontal size={18} className="text-gd-muted" />
          </div>
          <div className="ml-auto flex items-center gap-3 text-gd-muted">
            <CheckCircle2 size={20} />
            <Settings size={20} />
            <span className="flex size-8 items-center justify-center rounded-full bg-teal-600 text-xs font-medium text-white">SW</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left nav */}
          <nav className="hidden w-64 shrink-0 flex-col px-3 md:flex">
            <div className="relative mb-4">
              <button onClick={() => setMenu((m) => !m)} className="flex h-14 items-center gap-3 rounded-2xl bg-white px-5 text-sm font-medium shadow-[0_1px_3px_rgba(0,0,0,.2)] hover:bg-[#edf2fa]">
                <Plus size={22} /> New
              </button>
              {menu && (
                <div className="absolute top-14 left-0 z-20 w-64 rounded-lg bg-white py-2 text-sm shadow-xl" onMouseLeave={() => setMenu(false)}>
                  <button onClick={() => { setNewFolder('Untitled folder'); setMenu(false) }} className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-100"><FolderPlus size={18} /> New folder</button>
                  <div className="my-1 border-t border-slate-200" />
                  <button onClick={() => { fileInput.current?.click(); setMenu(false) }} className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-100"><FileUp size={18} /> File upload</button>
                  <div className="my-1 border-t border-slate-200" />
                  <span className="flex items-center gap-3 px-4 py-2 text-slate-400"><FileText size={18} className="text-[#4285f4]" /> Google Docs ›</span>
                  <span className="flex items-center gap-3 px-4 py-2 text-slate-400"><Sheet size={18} className="text-[#0f9d58]" /> Google Sheets ›</span>
                </div>
              )}
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { onUpload(e.target.files); e.target.value = '' }} />
            </div>
            <ul className="space-y-0.5">
              {navItems.map(({ Icon, label, active }) => (
                <li key={label}>
                  <Link to={active ? '/documents/gd-root' : '#'} onClick={(e) => !active && e.preventDefault()} className={cn('flex h-8 items-center gap-4 rounded-full px-4 text-sm', active ? 'bg-gd-active font-medium' : 'hover:bg-[#e1e5ea]')}>
                    <Icon size={18} /> {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 px-4 text-xs text-gd-muted">
              <div className="mb-1 h-1 overflow-hidden rounded-full bg-[#e1e3e1]"><div className="h-full w-[34%] bg-gd-blue" /></div>
              6.8 GB of 20 GB used (demo)
            </div>
          </nav>

          {/* Main */}
          <section className="mr-2 mb-2 flex min-w-0 flex-1 flex-col rounded-2xl bg-gd-surface md:mr-4 md:mb-4">
            <div className="flex flex-wrap items-center gap-1 px-5 pt-4 pb-1 text-xl leading-tight">
              {searchResults ? (
                <span>Search results for “{q}”</span>
              ) : (
                <>
                  {crumbs.map((c, i) => (
                    <span key={c.id} className="flex items-center">
                      {i > 0 && <ChevronRight size={20} className="text-gd-muted" />}
                      {i === crumbs.length - 1 ? (
                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-slate-100">{c.name} <ChevronDown size={18} /></span>
                      ) : (
                        <Link to={`/documents/${c.id}`} className="rounded-full px-2 py-0.5 text-gd-muted hover:bg-slate-100">{c.name}</Link>
                      )}
                    </span>
                  ))}
                </>
              )}
              <div className="ml-auto flex items-center gap-1">
                <div className="flex overflow-hidden rounded-full border border-[#747775]">
                  <button onClick={() => setView('list')} className={cn('px-3 py-1', view === 'list' && 'bg-gd-active')} aria-label="List layout"><List size={18} /></button>
                  <button onClick={() => setView('grid')} className={cn('px-3 py-1', view === 'grid' && 'bg-gd-active')} aria-label="Grid layout"><LayoutGrid size={18} /></button>
                </div>
                <button onClick={() => setDetails((d) => !d)} className={cn('rounded-full p-2', details && 'bg-gd-active')} aria-label="View details"><Info size={18} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-6 py-2">
              {['Type', 'People', 'Modified'].map((c) => (
                <span key={c} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#747775] px-3 text-sm">{c} <ChevronDown size={16} /></span>
              ))}
              {folder.id === IDS.driveFolder && <span className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e8f0fe] px-3 text-xs text-gd-blue">Created by Zap 2A for {IDS.transaction}</span>}
              <label className="ml-auto inline-flex h-8 items-center gap-1.5 text-sm text-gd-muted">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'modified')} className="rounded-lg border border-[#747775] bg-white px-2 py-1 text-sm text-gd-text">
                  <option value="name">Name</option>
                  <option value="modified">Last modified</option>
                </select>
              </label>
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="scroll-thin min-w-0 flex-1 overflow-y-auto px-4 pb-4">
                {crumbs.length > 1 && !searchResults && (
                  <button onClick={() => navigate(`/documents/${folder.parentId}`)} className="mb-1 ml-2 inline-flex items-center gap-1 text-xs text-gd-muted hover:text-gd-blue"><ArrowLeft size={13} /> Up one level</button>
                )}
                {view === 'list' ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e1e3e1] text-left text-gd-muted">
                        <th className="py-2.5 pl-9 font-medium">Name <span className="ml-0.5">↑</span></th>
                        <th className="hidden py-2.5 font-medium lg:table-cell">Owner</th>
                        <th className="hidden py-2.5 font-medium whitespace-nowrap md:table-cell">Last modified</th>
                        <th className="hidden py-2.5 font-medium whitespace-nowrap xl:table-cell">File size</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.flatMap((f) => renderRows(f, 0))}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-5 px-2 pt-2">
                    {folders.length > 0 && !searchResults && (
                      <div>
                        <p className="mb-2 text-sm font-medium">Folders</p>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                          {folders.map((f) => (
                            <button key={f.id} onClick={() => setSelected(f.id)} onDoubleClick={() => open(f)} className={cn('flex h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium', selected === f.id ? 'bg-gd-active' : 'bg-[#f0f4f9] hover:bg-[#e1e5ea]')}>
                              <FileIcon type="folder" /> <span className="truncate">{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-sm font-medium">Files</p>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                        {(searchResults ?? docs).filter((f) => f.type !== 'folder').map((f) => (
                          <button key={f.id} onClick={() => setSelected(f.id)} onDoubleClick={() => open(f)} className={cn('rounded-xl p-2 text-left', selected === f.id ? 'bg-gd-active' : 'bg-[#f0f4f9] hover:bg-[#e1e5ea]')}>
                            <span className="flex items-center gap-2 px-1 pb-2 text-sm font-medium"><FileIcon type={f.type} size={16} /> <span className="truncate">{f.name}</span></span>
                            <span className="flex h-28 items-center justify-center rounded-md bg-white"><FileIcon type={f.type} size={44} /></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {lotFolderMissing && !searchResults && (
                  <div className="mx-2 mt-3 flex items-start gap-3 rounded-xl border border-dashed border-[#c4c7c5] px-4 py-3 text-sm">
                    <Folder size={20} className="mt-0.5 text-gd-muted" />
                    <div>
                      <p className="font-medium">No folder for LOT-025 — Alex Morgan yet</p>
                      <p className="text-gd-muted">Zap 2A creates it (with 5 sub-folders and the supporting documents) when step 6 “Contract generated” is completed in Process Street.</p>
                      <Link to="/workflow?step=6" className="mt-1 inline-block font-medium text-gd-blue hover:underline">Go to step 6 →</Link>
                    </div>
                  </div>
                )}
                {rows.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-center text-gd-muted">
                    <Folder size={56} strokeWidth={1} />
                    <p className="mt-3 text-base text-gd-text">Drop files here</p>
                    <p className="text-sm">or use the “New” button.</p>
                  </div>
                )}
              </div>

              {details && (
                <aside className="scroll-thin hidden w-80 shrink-0 overflow-y-auto border-l border-[#e1e3e1] px-5 py-4 text-sm lg:block">
                  <div className="mb-4 flex items-center gap-3">
                    <FileIcon type={sel.type} />
                    <p className="flex-1 font-medium break-words">{sel.name}</p>
                  </div>
                  <div className="mb-4 flex h-36 items-center justify-center rounded-lg bg-[#f0f4f9]"><FileIcon type={sel.type} size={56} /></div>
                  <p className="mb-2 font-medium">File details</p>
                  <dl className="space-y-3 text-xs">
                    <div><dt className="text-gd-muted">Type</dt><dd>{typeIcon[sel.type].label}</dd></div>
                    {sel.sizeKb && <div><dt className="text-gd-muted">Size</dt><dd>{sizeLabel(sel.sizeKb)}</dd></div>}
                    <div><dt className="text-gd-muted">Owner</dt><dd>{sel.owner}</dd></div>
                    <div><dt className="text-gd-muted">Modified</dt><dd>{dateTime(sel.modifiedAt)}</dd></div>
                    {sel.label && <div><dt className="text-gd-muted">Label · Sale status</dt><dd><span className={cn('rounded-md px-2 py-0.5 font-medium', labelCls[sel.label])}>{sel.label}</span></dd></div>}
                    <div><dt className="text-gd-muted">Linked records</dt><dd className="font-mono">{IDS.transaction} · {IDS.hubspotDeal}</dd></div>
                  </dl>
                  {sel.type !== 'folder' && <button onClick={() => open(sel)} className="mt-4 rounded-full border border-[#747775] px-4 py-1.5 text-sm font-medium text-gd-blue hover:bg-[#f0f4f9]">Open preview</button>}
                </aside>
              )}
            </div>
          </section>
        </div>

        {/* Upload progress */}
        {uploads.length > 0 && (
          <div className="fixed bottom-4 left-4 z-40 w-80 overflow-hidden rounded-lg bg-white shadow-2xl lg:left-64">
            <div className="flex items-center justify-between bg-[#f0f4f9] px-4 py-3 text-sm font-medium">
              {uploads.every((u) => u.done) ? `${uploads.length} upload${uploads.length > 1 ? 's' : ''} complete` : `Uploading ${uploads.length} item${uploads.length > 1 ? 's' : ''}`}
              <button onClick={() => setUploads([])} aria-label="Close"><X size={16} /></button>
            </div>
            <ul className="max-h-40 overflow-y-auto">
              {uploads.map((u) => (
                <li key={u.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <FileText size={16} className="text-[#4285f4]" />
                  <span className="flex-1 truncate">{u.name}</span>
                  {u.done ? <CheckCircle2 size={18} className="text-[#137333]" /> : <span className="size-4 animate-spin rounded-full border-2 border-gd-blue border-t-transparent" />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {newFolder !== null && (
          <div className="fixed inset-0 z-[59] flex items-center justify-center bg-black/40" onMouseDown={() => setNewFolder(null)}>
            <div className="w-96 rounded-3xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-2xl">New folder</h2>
              <input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onFocus={(e) => e.target.select()} className="w-full rounded border border-[#747775] px-3 py-2.5 outline-none focus:border-2 focus:border-gd-blue" />
              <div className="mt-6 flex justify-end gap-2 text-sm font-medium text-gd-blue">
                <button onClick={() => setNewFolder(null)} className="rounded-full px-4 py-2 hover:bg-[#f0f4f9]">Cancel</button>
                <button
                  onClick={() => {
                    if (newFolder.trim()) run((s) => createDriveFolder(s, folder.id, newFolder.trim()))
                    setNewFolder(null)
                  }}
                  className="rounded-full px-4 py-2 hover:bg-[#f0f4f9]"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {fileId && !previewId && <FileDrawer fileId={fileId} onClose={() => setParams({})} onOpen={() => setParams({ file: fileId, view: 'preview' })} />}
        {previewId && <Preview fileId={previewId} onClose={() => setParams({ file: previewId })} />}
      </div>
    </ProductFrame>
  )
}

function Preview({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { state } = useDemo()
  const f = state.drive.files.find((x) => x.id === fileId)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!f) return null
  const t = state.transaction
  const isContract = f.id === state.contract.driveFileId
  return (
    <div className="fixed inset-0 top-7 z-[58] flex flex-col bg-[#000000cc] text-white">
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close preview"><ArrowLeft size={20} /></button>
        <FileIcon type={f.type} />
        <span className="flex-1 truncate">{f.name}</span>
        <Printer size={20} className="text-white/80" />
        <Download size={20} className="text-white/80" />
        <MoreVertical size={20} className="text-white/80" />
        <button className="ml-2 inline-flex items-center gap-2 rounded-full bg-[#c2e7ff] px-4 py-2 text-sm font-medium text-[#001d35]"><Share size={16} /> Share</button>
      </div>
      <div className="scroll-thin flex flex-1 justify-center overflow-y-auto px-4 pb-10" onClick={onClose}>
        <div className="h-fit w-full max-w-[720px] bg-white px-14 py-12 text-[#202124] shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <p className="mb-6 rounded bg-amber-100 px-2 py-1 text-center text-[11px] font-semibold tracking-wider text-amber-900">SYNTHETIC DEMO DOCUMENT — NOT A REAL RECORD</p>
          {isContract ? (
            <div className="space-y-4 font-serif text-[15px] leading-relaxed">
              <h1 className="text-center text-xl font-bold">RESIDENTIAL LOT SALE AGREEMENT</h1>
              <p className="text-center text-sm">{IDS.contract} · Version {state.contract.version} · {state.contract.status}</p>
              <p><b>Vendor:</b> Pacific Horizon Developments, Port Vila, Vanuatu</p>
              <p><b>Purchaser:</b> {t.buyerName} ({t.email}, {t.phone}) — Buyer ID {t.buyerId}</p>
              <p><b>Property:</b> {t.project}, Lot {t.lotId}</p>
              <p><b>Purchase price:</b> {vt(t.salePrice)} (Vanuatu vatu)</p>
              <p><b>Deposit:</b> 10% ({vt(t.salePrice * 0.1)}) payable within 7 days of approval.</p>
              <p><b>Settlement date:</b> {longDate(t.settlementDate)}</p>
              <p className="text-sm text-slate-600">1. The Vendor agrees to sell and the Purchaser agrees to buy the Property for the Purchase Price on the terms of this Agreement. 2. Clauses are placeholder text for demonstration only and are not legal advice.</p>
              <div className="grid grid-cols-2 gap-8 pt-8 text-sm">
                <div className="border-t border-slate-400 pt-1">For the Vendor{state.contract.approver ? ` — approved by ${state.contract.approver}` : ''}</div>
                <div className="border-t border-slate-400 pt-1">Purchaser</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {(f.preview ?? [f.name, 'Preview not available for this synthetic file.']).map((line, i) => (
                <p key={i} className={i === 0 ? 'text-lg font-semibold' : 'text-sm text-slate-700'}>{line}</p>
              ))}
              {f.id === 'gd-tpl-contract' && <pre className="mt-4 rounded bg-slate-100 p-3 text-xs whitespace-pre-wrap">{contractPreview.join('\n')}</pre>}
              <div className="mt-8 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-2.5 rounded bg-slate-100" style={{ width: `${60 + ((i * 37) % 40)}%` }} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Activity shown for a file, derived from the same contract/engine timestamps the other screens use. */
function fileActivity(s: DemoState, f: DriveFile): { at: string; text: string; who: string }[] {
  const c = s.contract
  const out: { at: string; text: string; who: string }[] = []
  if (f.id.startsWith('gd-f-contract')) {
    if (c.generatedAt) out.push({ at: c.generatedAt, text: 'Contract generated from template', who: 'Zap 2A' })
    if (f.id.includes('contract-v') && !f.id.includes('approved') && !f.id.includes('signed')) out.push({ at: f.modifiedAt, text: 'Draft uploaded to 04 Contracts', who: 'Zap 2A' })
    if (c.reviewRequestedAt) out.push({ at: c.reviewRequestedAt, text: `Approval requested from ${USERS.director}`, who: USERS.sales })
    if (c.approvedAt && (f.id.includes('approved') || f.id.includes('signed'))) out.push({ at: c.approvedAt, text: `Approved by ${c.approver}; PDF uploaded`, who: 'Zap 2B' })
    if (c.sentAt && (f.id.includes('approved') || f.id.includes('signed'))) out.push({ at: c.sentAt, text: `Sent to ${s.transaction.email} for e-signature`, who: 'Zap 2B' })
    if (c.signedAt && f.id.includes('signed')) out.push({ at: c.signedAt, text: 'Signed PDF uploaded · deal Closed Won', who: 'Zap 2C' })
  } else if (f.parentId?.startsWith('gd-025') || f.id === IDS.driveFolder) {
    out.push({ at: f.modifiedAt, text: f.type === 'folder' ? 'Folder created' : 'Copied from Process Street run upload', who: 'Zap 2A' })
  } else {
    out.push({ at: f.modifiedAt, text: 'Last modified', who: f.owner })
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

function locationOf(s: DemoState, f: DriveFile) {
  const parts: string[] = []
  let cur = s.drive.files.find((x) => x.id === f.parentId)
  while (cur) { parts.unshift(cur.name); cur = s.drive.files.find((x) => x.id === cur!.parentId) }
  return parts.join(' › ')
}

function FileDrawer({ fileId, onClose, onOpen }: { fileId: string; onClose: () => void; onOpen: () => void }) {
  const { state } = useDemo()
  const f = state.drive.files.find((x) => x.id === fileId)
  if (!f) return null
  const inLot = locationOf(state, f).includes('LOT-025') || f.id === IDS.driveFolder
  return (
    <Drawer
      open
      onClose={onClose}
      width={400}
      title={<span className="flex items-center gap-2"><FileIcon type={f.type} size={18} /> {f.name}</span>}
      subtitle={typeIcon[f.type].label}
      footer={<>
        {f.type !== 'folder' && <button onClick={onOpen} className="rounded-full bg-gd-blue px-4 py-1.5 text-sm font-medium text-white hover:brightness-110">Open preview</button>}
        <button className="rounded-full border border-[#747775] px-4 py-1.5 text-sm font-medium text-gd-blue">Share</button>
      </>}
    >
      <div className="space-y-5 px-5 py-4 text-sm" style={{ fontFamily: "'Google Sans', Roboto, Inter, sans-serif" }}>
        <div className="flex h-40 items-center justify-center rounded-xl bg-[#f0f4f9]"><FileIcon type={f.type} size={56} /></div>
        <section>
          <h3 className="mb-2 font-medium">File details</h3>
          <dl className="space-y-2.5 text-[13px]">
            {([
              ['Owner', f.owner],
              ['Modified', dateTime(f.modifiedAt)],
              ['Location', locationOf(state, f) || 'Shared drive'],
              ['Status', f.label ? <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', labelCls[f.label])}>{f.label}</span> : '—'],
              ['Transaction ID', inLot ? <span className="font-mono">{IDS.transaction}</span> : '—'],
              ...(f.sizeKb ? [['Size', sizeLabel(f.sizeKb)]] : []),
            ] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-gd-muted">{k}</dt><dd className="break-words">{v}</dd></div>
            ))}
          </dl>
        </section>
        <section>
          <h3 className="mb-2 font-medium">Activity</h3>
          <ol className="space-y-2.5">
            {fileActivity(state, f).map((a, i) => (
              <li key={i} className="grid grid-cols-[48px_1fr] gap-2 text-[13px]">
                <span className="font-medium text-gd-muted tabular-nums">{time(a.at)}</span>
                <span>{a.text}<span className="block text-xs text-gd-muted">{a.who}</span></span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Drawer>
  )
}
