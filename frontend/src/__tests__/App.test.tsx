import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'

// Mock the contexts
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn()
  })
}))

jest.mock('../contexts/HabitsContext', () => ({
  HabitsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useHabits: () => ({
    habits: [],
    snaps: [],
    streaks: [],
    loading: false,
    createHabit: jest.fn(),
    updateHabit: jest.fn(),
    deleteHabit: jest.fn(),
    createSnap: jest.fn(),
    refreshHabits: jest.fn(),
    refreshSnaps: jest.fn()
  })
}))

jest.mock('../contexts/ChatContext', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useChat: () => ({
    rooms: [],
    messages: {},
    friends: [],
    loading: false,
    sendMessage: jest.fn(),
    createDirectChat: jest.fn(),
    fetchMessages: jest.fn(),
    markAsRead: jest.fn()
  })
}))

// Mock all screen components
jest.mock('../screens/LoginScreen', () => {
  return function MockLoginScreen() {
    return <div data-testid="login-screen">Login Screen</div>
  }
})

jest.mock('../screens/CameraScreen', () => {
  return function MockCameraScreen() {
    return <div data-testid="camera-screen">Camera Screen</div>
  }
})

jest.mock('../screens/ChatScreen', () => {
  return function MockChatScreen() {
    return <div data-testid="chat-screen">Chat Screen</div>
  }
})

jest.mock('../screens/StoriesScreen', () => {
  return function MockStoriesScreen() {
    return <div data-testid="stories-screen">Stories Screen</div>
  }
})

jest.mock('../screens/ProfileScreen', () => {
  return function MockProfileScreen() {
    return <div data-testid="profile-screen">Profile Screen</div>
  }
})

jest.mock('../screens/FriendsScreen', () => {
  return function MockFriendsScreen() {
    return <div data-testid="friends-screen">Friends Screen</div>
  }
})

jest.mock('../screens/MapScreen', () => {
  return function MockMapScreen() {
    return <div data-testid="map-screen">Map Screen</div>
  }
})

jest.mock('../screens/LeaderboardScreen', () => {
  return function MockLeaderboardScreen() {
    return <div data-testid="leaderboard-screen">Leaderboard Screen</div>
  }
})

jest.mock('../screens/HabitsScreen', () => {
  return function MockHabitsScreen() {
    return <div data-testid="habits-screen">Habits Screen</div>
  }
})

jest.mock('../components/BottomNavigation', () => {
  return function MockBottomNavigation() {
    return <div data-testid="bottom-navigation">Bottom Navigation</div>
  }
})

jest.mock('../components/LoadingScreen', () => {
  return function MockLoadingScreen() {
    return <div data-testid="loading-screen">Loading Screen</div>
  }
})

describe('App Component', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
  }

  it('renders without crashing', () => {
    renderApp()
    expect(screen.getByTestId('login-screen')).toBeInTheDocument()
  })

  it('shows login screen when user is not authenticated', () => {
    renderApp()
    expect(screen.getByTestId('login-screen')).toBeInTheDocument()
  })
})

// Test the AuthContext
describe('AuthContext Integration', () => {
  it('should provide authentication state', () => {
    const { useAuth } = require('../contexts/AuthContext')
    const authState = useAuth()
    
    expect(authState).toHaveProperty('user')
    expect(authState).toHaveProperty('profile')
    expect(authState).toHaveProperty('loading')
    expect(authState).toHaveProperty('signIn')
    expect(authState).toHaveProperty('signUp')
    expect(authState).toHaveProperty('signOut')
  })
})

// Test the HabitsContext
describe('HabitsContext Integration', () => {
  it('should provide habits state and methods', () => {
    const { useHabits } = require('../contexts/HabitsContext')
    const habitsState = useHabits()
    
    expect(habitsState).toHaveProperty('habits')
    expect(habitsState).toHaveProperty('snaps')
    expect(habitsState).toHaveProperty('streaks')
    expect(habitsState).toHaveProperty('createHabit')
    expect(habitsState).toHaveProperty('updateHabit')
    expect(habitsState).toHaveProperty('deleteHabit')
  })
})

// Test the ChatContext
describe('ChatContext Integration', () => {
  it('should provide chat state and methods', () => {
    const { useChat } = require('../contexts/ChatContext')
    const chatState = useChat()
    
    expect(chatState).toHaveProperty('rooms')
    expect(chatState).toHaveProperty('messages')
    expect(chatState).toHaveProperty('friends')
    expect(chatState).toHaveProperty('sendMessage')
    expect(chatState).toHaveProperty('createDirectChat')
  })
})
