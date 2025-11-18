import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HabitsProvider } from './contexts/HabitsContext'
import { ChatProvider } from './contexts/ChatContext'
import { SnapFeedProvider } from './contexts/SnapFeedContext'
import { ChatRoomProvider, useChatRoom } from './contexts/ChatRoomContext'

// Screens
import LoginScreen from './screens/LoginScreen'
import CameraScreen from './screens/CameraScreen'
import ChatScreen from './screens/ChatScreen'
import StoriesScreen from './screens/StoriesScreen'
import SnapFeedScreen from './screens/SnapFeedScreen'
import ProfileScreen from './screens/ProfileScreen'
import FriendsScreen from './screens/FriendsScreen'
import MapScreen from './screens/MapScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import HabitsScreen from './screens/HabitsScreen'

// Components
import BottomNavigation from './components/BottomNavigation'
import LoadingScreen from './components/LoadingScreen'
import FriendSearch from './components/FriendSearch'

// Types
import type { User } from '@supabase/supabase-js'

function AppContent() {
  const { user, loading } = useAuth()
  const { isChatRoomOpen } = useChatRoom()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize app after auth check
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (loading || !isInitialized) {
    return <LoadingScreen />
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <HabitsProvider>
      <ChatProvider>
        <SnapFeedProvider>
          <div className="w-full h-full bg-black">
            <Routes>
              <Route path="/" element={<Navigate to="/camera" replace />} />
              <Route path="/camera" element={<CameraScreen />} />
              <Route path="/chat" element={<ChatScreen />} />
              <Route path="/stories" element={<StoriesScreen />} />
              <Route path="/snap-feed" element={<SnapFeedScreen />} />
              <Route path="/map" element={<MapScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/friends" element={<FriendsScreen />} />
              <Route path="/friends/search" element={<FriendSearch />} />
              <Route path="/leaderboard" element={<LeaderboardScreen />} />
              <Route path="/habits" element={<HabitsScreen />} />
            </Routes>
            {!isChatRoomOpen && <BottomNavigation />}
          </div>
        </SnapFeedProvider>
      </ChatProvider>
    </HabitsProvider>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <ChatRoomProvider>
          <AppContent />
        </ChatRoomProvider>
      </AuthProvider>
    </Router>
  )
}

export default App