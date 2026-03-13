import { createServerClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Mail, FileText } from 'lucide-react'

const PLACEHOLDERS = [
  {
    subject: 'IA na gestão hospitalar: tendências para 2025',
    preview_text:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.',
  },
  {
    subject: 'Transformação digital nas UTIs brasileiras',
    preview_text:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure.',
  },
  {
    subject: 'Modelos preditivos e redução de custos em saúde',
    preview_text:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.',
  },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

type NewsletterItem = {
  id?: string
  subject: string
  preview_text: string
  sent_at?: string | null
  isPlaceholder?: boolean
}

function NewsletterCard({ item }: { item: NewsletterItem }) {
  return (
    <Card className="flex flex-col overflow-hidden border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Visual header */}
      <div
        className={`h-36 flex items-center justify-center ${
          item.isPlaceholder
            ? 'bg-zinc-100'
            : 'bg-gradient-to-br from-blue-50 to-indigo-100'
        }`}
      >
        {item.isPlaceholder ? (
          <FileText className="h-10 w-10 text-zinc-300" />
        ) : (
          <Mail className="h-10 w-10 text-indigo-400" />
        )}
      </div>

      <CardContent className="flex flex-col gap-3 p-5 flex-1">
        <h3
          className={`font-semibold text-base leading-snug line-clamp-2 ${
            item.isPlaceholder ? 'text-zinc-400' : 'text-zinc-800'
          }`}
        >
          {item.subject}
        </h3>

        <p
          className={`text-sm line-clamp-3 flex-1 ${
            item.isPlaceholder ? 'text-zinc-300' : 'text-zinc-500'
          }`}
        >
          {item.preview_text}
        </p>

        {item.sent_at ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-auto pt-2 border-t border-zinc-100">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(item.sent_at)}</span>
          </div>
        ) : (
          <div className="mt-auto pt-2 border-t border-zinc-100">
            <span className="text-xs text-zinc-300 italic">Em breve</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function RecentNewsletters() {
  const supabase = createServerClient()

  const { data: emails } = await supabase
    .from('emails')
    .select('id, subject, preview_text, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(3)

  const sent: NewsletterItem[] = (emails ?? []).map((e) => ({
    id: e.id,
    subject: e.subject ?? 'Edição sem título',
    preview_text: e.preview_text ?? '',
    sent_at: e.sent_at,
    isPlaceholder: false,
  }))

  const missing = 3 - sent.length
  const placeholders: NewsletterItem[] = PLACEHOLDERS.slice(0, missing).map(
    (p) => ({ ...p, isPlaceholder: true })
  )

  const items: NewsletterItem[] = [...sent, ...placeholders]

  return (
    <section className="py-14 bg-zinc-50 border-y border-zinc-100">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-lg font-semibold text-zinc-700 text-center mb-8">
          Últimas edições publicadas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <NewsletterCard key={item.id ?? `placeholder-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
