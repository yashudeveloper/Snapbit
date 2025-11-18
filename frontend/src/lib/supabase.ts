import { createClient } from '@supabase/supabase-js'

// HARDCODED SUPABASE CONFIGURATION (TEMPORARY FIX)
const supabaseUrl = 'https://idxahvulzazdjhikehvu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeGFodnVsemF6ZGpoaWtlaHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzMyNTMsImV4cCI6MjA3Nzg0OTI1M30.Oxu5_TEYJevW56ZkSFv7AbbFBQGF2d1f74ypDTpgj1I'

console.log('✅ Using hardcoded Supabase configuration')
console.log('URL:', supabaseUrl)
console.log('Key loaded:', !!supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    // DISABLE realtime to prevent WebSocket connection issues
    params: {
      eventsPerSecond: 0
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    fetch: (url, options = {}) => {
      console.log('🌐 Supabase fetch:', url)
      return fetch(url, options)
    }
  }
})

// Database types
export interface Profile {
  id: string
  username: string
  display_name: string
  email: string
  avatar_url?: string
  snap_score: number
  current_streak: number
  longest_streak: number
  ghost_mode: boolean
  location_enabled: boolean
  // Onboarding fields
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other'
  occupation?: string
  location?: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  user_id: string
  title: string
  description?: string
  category: 'fitness' | 'nutrition' | 'mindfulness' | 'productivity' | 'learning' | 'social' | 'creativity' | 'health' | 'custom'
  custom_category?: string
  target_frequency: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Snap {
  id: string
  user_id: string
  habit_id: string
  image_url: string
  image_hash: string
  caption?: string
  location_lat?: number
  location_lng?: number
  location_name?: string
  status: 'pending' | 'approved' | 'rejected' | 'low_confidence'
  ai_confidence?: number
  ai_labels?: any
  ai_reason?: string
  manual_review_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  expires_at: string
  created_at: string
}

export interface StreakRecord {
  id: string
  user_id: string
  habit_id: string
  date: string
  completed: boolean
  snap_count: number
  penalty_applied: number
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  updated_at: string
}

export interface ChatRoom {
  id: string
  type: 'direct' | 'group'
  name?: string
  created_by?: string
  created_at: string
  updated_at: string
  // For direct chats, store the other participant's info
  otherParticipant?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content?: string
  snap_id?: string
  message_type: string
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  user_id: string
  period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  rank: number
  score: number
  streak: number
  updated_at: string
}