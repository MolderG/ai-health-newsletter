import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-zinc-200 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-700 font-medium">
            <Heart className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
            <span>AI Health Newsletter</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link href="/privacidade" className="hover:text-zinc-800 transition-colors">
              Política de privacidade
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="/cancelar" className="hover:text-zinc-800 transition-colors">
              Cancelar inscrição
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center sm:text-left text-xs text-zinc-400">
          © 2025 AI Health Newsletter. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
