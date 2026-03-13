import Link from 'next/link'
import { Activity } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#0B1120] border-t border-white/10 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="h-3.5 w-3.5 text-[#0B1120]" strokeWidth={2.5} />
            </div>
            <span className="text-white font-medium">AI Health Newsletter</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacidade"
              className="text-slate-400 hover:text-emerald-400 transition-colors duration-200"
            >
              Política de privacidade
            </Link>
            <Link
              href="/cancelar"
              className="text-slate-400 hover:text-emerald-400 transition-colors duration-200"
            >
              Cancelar inscrição
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center sm:text-left text-xs text-slate-600">
          © 2025 AI Health Newsletter. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
