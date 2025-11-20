import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<{ error?: any }>
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

  // Fetch user profile from Supabase
  const fetchProfile = async (userId: string) => {
    console.log('🔍 Fetching profile for user:', userId)
    
    try {
      // Use Supabase client directly - it handles auth automatically
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Profile fetch error:', error)
        throw error
      }

      if (data) {
        console.log('✅ Profile loaded successfully:', data.username)
        setProfile(data)
      } else {
        console.error('❌ No profile found for user')
      }
    } catch (error) {
      console.error('💥 Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 AuthProvider initializing...')
    let isActive = true

    const initialize = async () => {
      try {
        // Get session
        console.log('1️⃣ Getting session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('2️⃣ Session:', session ? `✅ User: ${session.user?.email}` : '❌ No session')
        
        if (!isActive) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('3️⃣ Fetching profile for user:', session.user.id)
          await fetchProfile(session.user.id)
        } else {
          console.log('3️⃣ No user session, ready for login/signup')
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
        console.log('🔔 Auth event:', event, session?.user?.email || 'no user')
        
        if (!isActive) return

        setSession(session)
        setUser(session?.user ?? null)
      
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in, fetching profile...')
          await fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('🧹 AuthProvider cleanup')
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      setLoading(true)
      console.log('🔐 SignIn attempt:', emailOrUsername)
      
      let email = emailOrUsername
      
      // If input doesn't contain @, treat it as username and look up email
      if (!emailOrUsername.includes('@')) {
        console.log('🔍 Looking up email for username:', emailOrUsername)
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername.toLowerCase())
          .single()
        
        if (error || !data) {
          console.log('❌ Username not found')
          setLoading(false)
          return { 
            error: { 
              message: 'Username not found. Please check your username or try signing in with email.',
              status: 401
            } 
          }
        }
        
        email = data.email
        console.log('✅ Found email for username')
      }
      
      console.log('🔐 Attempting sign in with email:', email)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.log('❌ Sign in failed:', error.message)
        setLoading(false)
        return { 
          error: { 
            message: 'Invalid password. Please check your password and try again.',
            status: 401
          } 
        }
      }
      
      console.log('✅ Sign in successful!')
      return { error: null }
    } catch (error: any) {
      console.error('💥 Sign in exception:', error)
      setLoading(false)
      return { 
        error: { 
          message: error?.message || 'Network error. Please check your connection and try again.',
          status: 500
        } 
      }
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
