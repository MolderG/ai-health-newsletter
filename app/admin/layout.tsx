import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-6">
        <span className="font-semibold text-gray-900">Admin</span>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">Leads</Link>
        <Link href="/admin/editions" className="text-sm text-gray-600 hover:text-gray-900">Edições</Link>
        <Link href="/admin/analytics" className="text-sm text-gray-600 hover:text-gray-900">Analytics</Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
