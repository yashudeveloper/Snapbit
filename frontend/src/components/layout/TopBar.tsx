import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, UserPlus, Search } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const TopBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/feed':
        return 'Stories'
      case '/chat':
        return 'Chat'
      case '/friends':
        return 'Friends'
      case '/map':
        return 'Snap Map'
      case '/leaderboard':
        return 'Leaderboard'
      case '/profile':
        return user?.user_metadata?.display_name || 'Profile'
      default:
        return 'SnapHabit'
    }
  }
  
  const showBackButton = () => {
    return location.pathname.startsWith('/chat/') && location.pathname !== '/chat'
  }
  
  const getRightAction = () => {
    switch (location.pathname) {
      case '/friends':
        return (
          <button 
            onClick={() => {/* TODO: Add friend */}}
            className="tap-target p-2 rounded-full hover:bg-snap-gray-800 transition-colors"
          >
            <UserPlus size={20} className="text-snap-white" />
          </button>
        )
      case '/chat':
        return (
          <button 
            onClick={() => {/* TODO: Search chats */}}
            className="tap-target p-2 rounded-full hover:bg-snap-gray-800 transition-colors"
          >
            <Search size={20} className="text-snap-white" />
          </button>
        )
      case '/profile':
        return (
          <button 
            onClick={() => {/* TODO: Settings */}}
            className="tap-target p-2 rounded-full hover:bg-snap-gray-800 transition-colors"
          >
            <Settings size={20} className="text-snap-white" />
          </button>
        )
      default:
        return null
    }
  }
  
  return (
    <header className="safe-top bg-snap-black border-b border-snap-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Action */}
        <div className="w-10">
          {showBackButton() ? (
            <button 
              onClick={() => navigate(-1)}
              className="tap-target p-2 rounded-full hover:bg-snap-gray-800 transition-colors"
            >
              <ArrowLeft size={20} className="text-snap-white" />
            </button>
          ) : null}
        </div>
        
        {/* Title */}
        <h1 className="text-lg font-bold text-snap-white text-center flex-1">
          {getTitle()}
        </h1>
        
        {/* Right Action */}
        <div className="w-10 flex justify-end">
          {getRightAction()}
        </div>
      </div>
    </header>
  )
}

export default TopBar
