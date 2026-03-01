import { Building2 } from 'lucide-react'

const institutions = [
  'Albert Einstein',
  'Sírio-Libanês',
  'Mater Dei',
  'Santa Casa',
  'Prevent Senior',
]

export default function SocialProof() {
  return (
    <section className="py-10 bg-white border-y border-zinc-100">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
          <Building2 className="h-4 w-4" />
          Lido por gestores de hospitais em todo o Brasil
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {institutions.map((name) => (
            <span key={name} className="text-zinc-400 font-medium text-sm">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
