import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check your backend .env file for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types (matching frontend types)
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
