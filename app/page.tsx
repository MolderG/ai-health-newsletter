import Header from '@/components/Header'
import HeroSection from '@/components/HeroSection'
import RecentNewsletters from '@/components/RecentNewsletters'
import ValueProps from '@/components/ValueProps'
import Footer from '@/components/Footer'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>
}) {
  const { confirmed } = await searchParams

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <HeroSection confirmed={confirmed} />
      <RecentNewsletters />
      <ValueProps />
      <Footer />
    </main>
  )
}
