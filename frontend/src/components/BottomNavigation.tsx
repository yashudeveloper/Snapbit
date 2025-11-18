import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  MessageCircle, 
  Camera, 
  Users, 
  MapPin, 
  User,
  Trophy,
  Target,
  Eye
} from 'lucide-react'

const navItems = [
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/snap-feed', icon: Eye, label: 'Snaps' },
  { path: '/camera', icon: Camera, label: 'Camera', isCenter: true },
  { path: '/map', icon: MapPin, label: 'Map' },
  { path: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  // Don't show navigation on login screen
  if (location.pathname === '/login') {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="bg-black/90 backdrop-blur-lg border-t border-snapchat-gray-800">
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            
            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative p-3 rounded-full bg-snapchat-yellow active:scale-95 transition-transform duration-150"
                >
                  <Icon 
                    size={24} 
                    className="text-black" 
                    strokeWidth={2.5}
                  />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full"></div>
                  )}
                </button>
              )
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative p-3 rounded-full transition-all duration-200 ${
                  isActive 
                    ? 'text-snapchat-yellow' 
                    : 'text-snapchat-gray-400 active:text-white'
                }`}
              >
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-snapchat-yellow rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
