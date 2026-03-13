'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Users, BookOpen, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Leads', icon: Users, exact: true },
  { href: '/admin/editions', label: 'Edições', icon: BookOpen, exact: false },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-950 flex flex-col z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-[#0B1120]" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-sm">AI Health Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-emerald-400/15 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-emerald-400 rounded-full" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-6 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  )
}
