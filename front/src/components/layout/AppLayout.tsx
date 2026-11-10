import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <Sidebar />
      <div className="lg:pl-64">
        <main className="w-full pt-14 min-h-screen bg-surface px-margin lg:px-margin-desktop py-space-xl max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </>
  )
}
