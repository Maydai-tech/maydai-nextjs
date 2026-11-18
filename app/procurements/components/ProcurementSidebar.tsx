'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, LayoutDashboard, Menu, Settings, Users, X } from 'lucide-react'
import { FOCUS_RING } from './form-ui'

const sections = [{ id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard }, { id: 'suppliers', label: 'Fournisseurs', icon: Users }, { id: 'configuration', label: 'Configuration', icon: Settings }]
export default function ProcurementSidebar({ contentReady = true, supplierCount }: { contentReady?: boolean; supplierCount?: number }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('overview')
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!contentReady || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => { for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id) }, { rootMargin: '-10% 0px -65% 0px' })
    sections.forEach(({ id }) => { const section = document.getElementById(id); if (section) observer.observe(section) })
    return () => observer.disconnect()
  }, [contentReady])
  return <aside className="bg-white border-b border-gray-200 lg:border-b-0 lg:border-r lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-40" aria-label="Navigation de l’appel d’offres">
    <div className="flex items-center justify-between p-4 lg:p-6"><Link href="/dashboard/registries" className={`min-w-0 leading-tight rounded ${FOCUS_RING}`}><span className="block text-xl font-extrabold text-[#0080A3]">MaydAI</span><span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Procurements</span></Link><button type="button" ref={toggle} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="procurement-navigation" aria-label={open ? 'Fermer le menu de l’appel d’offres' : 'Ouvrir le menu de l’appel d’offres'} className={`flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden ${FOCUS_RING}`}>{open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button></div>
    <nav id="procurement-navigation" className={`${open ? 'block' : 'hidden'} lg:block px-4 pb-6`} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }}>
      <ul className="space-y-1">{sections.map(({ id, label, icon: Icon }) => <li key={id}><a href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); setOpen(false) }} className={`min-h-11 flex items-center gap-3 rounded-lg px-3 text-sm ${active === id ? 'bg-[#E6F2F6] text-[#006280] font-semibold' : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900'} ${FOCUS_RING}`}><Icon size={18} aria-hidden="true" />{label}{id === 'suppliers' && supplierCount !== undefined && <span className={`ml-auto rounded-full px-2 text-xs ${active === id ? 'bg-white' : 'bg-gray-100'}`}>{supplierCount}</span>}</a></li>)}</ul>
      <Link href="/dashboard/registries" className={`mt-6 pt-4 border-t border-gray-100 min-h-11 flex items-center gap-3 rounded-lg px-3 text-sm text-gray-500 hover:text-gray-900 ${FOCUS_RING}`}><ArrowLeft size={18} aria-hidden="true" />Retour à mon compte</Link>
    </nav>
  </aside>
}
