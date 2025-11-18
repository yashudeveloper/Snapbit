import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, username: string, displayName: string, additionalData?: {
    dateOfBirth?: string
    gender?: string
    occupation?: string
    location?: string
    selectedHabit?: string
  }) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // FUCK SUPABASE CLIENT - RAW FETCH API ONLY!
  const fetchProfile = async (userId: string) => {
    console.log('🚀 FUCK IT - DIRECT API CALL FOR:', userId)
    
    // HARDCODED TOKEN FROM STORAGE
    let token = null
    try {
      const sessionData = localStorage.getItem('sb-idxahvulzazdjhikehvu-auth-token')
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        token = parsed?.access_token
        console.log('🔑 Token from localStorage:', token ? 'FOUND' : 'NOT FOUND')
      }
    } catch (e) {
      console.log('❌ Failed to get token from localStorage')
    }

    // If no token from localStorage, try session
    if (!token) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
        console.log('🔑 Token from session:', token ? 'FOUND' : 'NOT FOUND')
      } catch (e) {
        console.log('❌ Failed to get session')
      }
    }

    // FUCK IT - TRY WITHOUT TOKEN FIRST
    console.log('📡 ATTEMPTING API CALL WITHOUT AUTH...')
    try {
      const url = `https://idxahvulzazdjhikehvu.supabase.co/rest/v1/profiles?id=eq.${userId}&select=*`
      console.log('🌐 URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeGFodnVsemF6ZGpoaWtlaHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzMyNTMsImV4cCI6MjA3Nzg0OTI1M30.Oxu5_TEYJevW56ZkSFv7AbbFBQGF2d1f74ypDTpgj1I',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      console.log('📡 Response status (no auth):', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 SUCCESS WITHOUT AUTH:', data)
        
        if (data && data.length > 0) {
          console.log('✅ PROFILE LOADED (NO AUTH)!')
          setProfile(data[0])
          setLoading(false)
          return
        }
      }
    } catch (e) {
      console.log('❌ No auth attempt failed:', e)
    }

    // NOW TRY WITH TOKEN
    if (token) {
      console.log('📡 ATTEMPTING API CALL WITH AUTH TOKEN...')
      try {
        const url = `https://idxahvulzazdjhikehvu.supabase.co/rest/v1/profiles?id=eq.${userId}&select=*`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeGFodnVsemF6ZGpoaWtlaHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzMyNTMsImV4cCI6MjA3Nzg0OTI1M30.Oxu5_TEYJevW56ZkSFv7AbbFBQGF2d1f74ypDTpgj1I',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        
        console.log('📡 Response status (with auth):', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📦 SUCCESS WITH AUTH:', data)
          
          if (data && data.length > 0) {
            console.log('✅ PROFILE LOADED (WITH AUTH)!')
            setProfile(data[0])
            setLoading(false)
            return
          }
        } else {
          const errorText = await response.text()
          console.error('❌ AUTH ERROR:', response.status, errorText)
        }
      } catch (e) {
        console.error('💥 AUTH ATTEMPT FAILED:', e)
      }
    }

    console.error('💀 ALL ATTEMPTS FAILED - NO PROFILE LOADED')
    setLoading(false)
  }

  useEffect(() => {
    console.log('🚀 AuthProvider INIT')
    let isActive = true

    const initialize = async () => {
      try {
        // Get session
        console.log('1️⃣ Getting session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('2️⃣ Session:', session ? '✅ EXISTS' : '❌ NONE')
        
        if (!isActive) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
          console.log('3️⃣ Calling fetchProfile...')
          await fetchProfile(session.user.id)
      } else {
          console.log('3️⃣ No user, setting loading false')
        setLoading(false)
      }
      } catch (err) {
        console.error('💥 Init error:', err)
        if (isActive) setLoading(false)
      }
    }

    initialize()

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event)
        
        if (!isActive) return

      setSession(session)
      setUser(session?.user ?? null)
      
        if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setLoading(false)
      }
      }
    )

    return () => {
      console.log('🧹 Cleanup')
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    username: string, 
    displayName: string,
    additionalData?: {
      dateOfBirth?: string
      gender?: string
      occupation?: string
      location?: string
      selectedHabit?: string
    }
  ) => {
    try {
      setLoading(true)
      
      // First, sign up the user with ALL data in user_metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            display_name: displayName,
            date_of_birth: additionalData?.dateOfBirth || null,
            gender: additionalData?.gender || null,
            occupation: additionalData?.occupation || null,
            location: additionalData?.location || null,
            selected_habit: additionalData?.selectedHabit || null
          }
        }
      })

      if (authError) {
        return { error: authError }
      }

      if (authData.user && authData.session) {
        // Wait for trigger to create basic profile
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Update profile with onboarding data if provided
        if (additionalData) {
          const updateData: any = {
              username,
              display_name: displayName,
            onboarding_completed: true
          }

          if (additionalData.dateOfBirth) {
            updateData.date_of_birth = additionalData.dateOfBirth
          }
          if (additionalData.gender) {
            updateData.gender = additionalData.gender
          }
          if (additionalData.occupation) {
            updateData.occupation = additionalData.occupation
          }
          if (additionalData.location) {
            updateData.location = additionalData.location
          }

          console.log('Updating profile with onboarding data:', updateData)
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Profile update error:', updateError)
            // Don't return error - profile was created, just update failed
          } else {
            console.log('✅ Profile updated with onboarding data')
          }
        }
      }

      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (!error && profile) {
        setProfile({ ...profile, ...updates })
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
