import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-900 font-semibold text-lg">
          <Heart className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
          <span>AI Health Newsletter</span>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="hidden sm:inline-flex">Gratuita</Badge>
          <Button asChild size="sm">
            <a href="#inscricao">Assinar grátis</a>
          </Button>
        </div>
      </div>
    </header>
  )
}
