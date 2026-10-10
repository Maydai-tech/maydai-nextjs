'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileText, LayoutDashboard, Menu, Settings, Users, X } from 'lucide-react'
import { FOCUS_RING } from './form-ui'

const sections = [{ id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard }, { id: 'suppliers', label: 'Fournisseurs', icon: Users }, { id: 'configuration', label: 'Configuration', icon: Settings }]
export default function ProcurementSidebar({ contentReady = true }: { contentReady?: boolean }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!contentReady || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => { for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id) }, { rootMargin: '-10% 0px -65% 0px' })
    sections.forEach(({ id }) => { const section = document.getElementById(id); if (section) observer.observe(section) })
    return () => observer.disconnect()
  }, [contentReady])
  return <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-[#0080A3] text-white lg:shadow-xl lg:z-40" aria-label="Navigation de l’appel d’offres">
    <div className="flex items-center justify-between p-4 lg:p-6"><Link href="/dashboard/registries" className={`min-w-0 font-bold text-xl leading-tight rounded ${FOCUS_RING}`}>Maydai Procurements</Link><button type="button" ref={toggle} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="procurement-navigation" aria-label={open ? 'Fermer le menu de l’appel d’offres' : 'Ouvrir le menu de l’appel d’offres'} className={`flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden ${FOCUS_RING}`}>{open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button></div>
    <nav id="procurement-navigation" className={`${open ? 'block' : 'hidden'} lg:block px-4 pb-6`} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }}>
      <div className="mb-6 flex items-center gap-2 px-3 text-sm text-white/80"><FileText size={18} aria-hidden="true" />Procurements</div>
      <ul className="space-y-2">{sections.map(({ id, label, icon: Icon }) => <li key={id}><a href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); setOpen(false) }} className={`min-h-11 flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${active === id ? 'bg-white text-[#0080A3] font-medium shadow-sm' : 'text-white/90 hover:bg-white/10'} ${FOCUS_RING}`}><Icon size={20} aria-hidden="true" />{label}</a></li>)}</ul>
      <Link href="/dashboard/registries" className={`mt-8 min-h-11 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-white/90 hover:bg-white/10 ${FOCUS_RING}`}><ArrowLeft size={20} aria-hidden="true" />Retour à mon compte</Link>
    </nav>
  </aside>
}
