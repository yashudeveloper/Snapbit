import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, MessageCircle, Users, Map, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

const BottomNavigation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const navItems = [
    {
      path: '/feed',
      icon: Users,
      label: 'Stories',
    },
    {
      path: '/chat',
      icon: MessageCircle,
      label: 'Chat',
    },
    {
      path: '/camera',
      icon: Camera,
      label: 'Camera',
      isCamera: true,
    },
    {
      path: '/map',
      icon: Map,
      label: 'Map',
    },
    {
      path: '/leaderboard',
      icon: Trophy,
      label: 'Leaderboard',
    },
  ]
  
  const handleNavigation = (path: string) => {
    navigate(path)
  }
  
  return (
    <nav className="safe-bottom bg-snap-black border-t border-snap-gray-800">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-lg
                transition-all duration-200 tap-target
                ${isActive ? 'text-snap-yellow' : 'text-snap-gray-400'}
                ${item.isCamera ? 'bg-snap-yellow text-snap-black p-3 rounded-full' : ''}
                hover:text-snap-white active:scale-95
              `}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: item.isCamera ? 1.05 : 1.0 }}
            >
              {/* Camera button gets special styling */}
              {item.isCamera ? (
                <div className="relative">
                  <Icon size={24} />
                  {isActive && (
                    <motion.div
                      className="absolute -inset-1 bg-snap-yellow rounded-full opacity-30"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.2 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </div>
              ) : (
                <>
                  <Icon size={20} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 w-1 h-1 bg-snap-yellow rounded-full"
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </>
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation
