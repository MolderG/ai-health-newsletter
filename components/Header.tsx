'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-sm'
          : 'bg-transparent border-b border-white/10'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-[#0B1120]" strokeWidth={2.5} />
          </div>
          <span
            className={`font-semibold text-lg transition-colors duration-300 ${
              scrolled ? 'text-zinc-900' : 'text-white'
            }`}
          >
            AI Health Newsletter
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full transition-colors duration-300 ${
              scrolled ? 'bg-zinc-100 text-zinc-600' : 'bg-white/10 text-white/80'
            }`}
          >
            Gratuita
          </span>
          <a
            href="#inscricao"
            className="bg-emerald-400 text-[#0B1120] hover:bg-emerald-300 animate-pulse-emerald font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Assinar grátis
          </a>
        </div>
      </div>
    </header>
  )
}
