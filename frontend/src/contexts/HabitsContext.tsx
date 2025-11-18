import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, Habit, Snap, StreakRecord } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface HabitsContextType {
  habits: Habit[]
  snaps: Snap[]
  streaks: StreakRecord[]
  loading: boolean
  createHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error?: any }>
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<{ error?: any }>
  deleteHabit: (id: string) => Promise<{ error?: any }>
  createSnap: (snap: Omit<Snap, 'id' | 'user_id' | 'created_at' | 'status' | 'expires_at'>) => Promise<{ error?: any }>
  refreshHabits: () => Promise<void>
  refreshSnaps: () => Promise<void>
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined)

export function useHabits() {
  const context = useContext(HabitsContext)
  if (context === undefined) {
    throw new Error('useHabits must be used within a HabitsProvider')
  }
  return context
}

interface HabitsProviderProps {
  children: React.ReactNode
}

export function HabitsProvider({ children }: HabitsProviderProps) {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [snaps, setSnaps] = useState<Snap[]>([])
  const [streaks, setStreaks] = useState<StreakRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchHabits()
      fetchSnaps()
      fetchStreaks()
    }
  }, [user])

  const fetchHabits = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching habits:', error)
      } else {
        setHabits(data || [])
      }
    } catch (error) {
      console.error('Error fetching habits:', error)
    }
  }

  const fetchSnaps = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('snaps')
        .select(`
          *,
          habits (
            title,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching snaps:', error)
      } else {
        setSnaps(data || [])
      }
    } catch (error) {
      console.error('Error fetching snaps:', error)
    }
  }

  const fetchStreaks = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('streak_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching streaks:', error)
      } else {
        setStreaks(data || [])
      }
    } catch (error) {
      console.error('Error fetching streaks:', error)
    } finally {
      setLoading(false)
    }
  }

  const createHabit = async (habitData: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert([
          {
            ...habitData,
            user_id: user.id,
          },
        ])
        .select()
        .single()

      if (!error && data) {
        setHabits(prev => [data, ...prev])
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)

      if (!error) {
        setHabits(prev => prev.map(habit => 
          habit.id === id ? { ...habit, ...updates } : habit
        ))
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const deleteHabit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('id', id)

      if (!error) {
        setHabits(prev => prev.filter(habit => habit.id !== id))
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const createSnap = async (snapData: Omit<Snap, 'id' | 'user_id' | 'created_at' | 'status' | 'expires_at'>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      const { data, error } = await supabase
        .from('snaps')
        .insert([
          {
            ...snapData,
            user_id: user.id,
            status: 'pending' as const,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ])
        .select()
        .single()

      if (!error && data) {
        setSnaps(prev => [data, ...prev])
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const refreshHabits = async () => {
    await fetchHabits()
  }

  const refreshSnaps = async () => {
    await fetchSnaps()
  }

  const value = {
    habits,
    snaps,
    streaks,
    loading,
    createHabit,
    updateHabit,
    deleteHabit,
    createSnap,
    refreshHabits,
    refreshSnaps,
  }

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
}
