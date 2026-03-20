import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Sidebar } from '@/components/layout/sidebar'

export default async function SistemaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session.profileId) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar session={session} />
      <main className="flex-1 ml-60 p-6 bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  )
}
