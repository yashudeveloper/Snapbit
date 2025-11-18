import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNavigation from './BottomNavigation'
import TopBar from './TopBar'

interface MobileLayoutProps {
  children: ReactNode
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  const location = useLocation()
  
  // Hide navigation on camera screen for full immersion
  const hideBars = location.pathname === '/camera'
  
  return (
    <div className="h-full flex flex-col bg-snap-black">
      {/* Top Bar */}
      {!hideBars && <TopBar />}
      
      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${hideBars ? 'h-full' : ''}`}>
        {children}
      </main>
      
      {/* Bottom Navigation */}
      {!hideBars && <BottomNavigation />}
    </div>
  )
}

export default MobileLayout
