import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'

interface SnapCreator {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
}

interface SnapHabit {
  id: string
  name: string
  category: string
  icon: string
}

interface SnapReactions {
  counts: Record<string, number>
  userReaction: string | null
  total: number
}

interface FeedSnap {
  id: string
  imageUrl: string
  caption?: string
  createdAt: string
  expiresAt: string
  isViewed: boolean
  creator: SnapCreator | null
  habit: SnapHabit | null
  reactions: SnapReactions
}

interface SnapDetails extends FeedSnap {
  status: string
  reactions: any[]
  comments: any[]
  viewCount: number
  isExpired: boolean
}

interface SnapFeedContextType {
  snaps: FeedSnap[]
  loading: boolean
  error: string | null
  selectedSnap: SnapDetails | null
  fetchSnapFeed: (page?: number) => Promise<void>
  viewSnap: (snapId: string) => Promise<{ error?: string }>
  reactToSnap: (snapId: string, reaction?: string, comment?: string) => Promise<{ error?: string }>
  getSnapDetails: (snapId: string) => Promise<{ error?: string }>
  clearSelectedSnap: () => void
  refreshFeed: () => Promise<void>
}

const SnapFeedContext = createContext<SnapFeedContextType | undefined>(undefined)

export function useSnapFeed() {
  const context = useContext(SnapFeedContext)
  if (context === undefined) {
    throw new Error('useSnapFeed must be used within a SnapFeedProvider')
  }
  return context
}

interface SnapFeedProviderProps {
  children: React.ReactNode
}

export function SnapFeedProvider({ children }: SnapFeedProviderProps) {
  const { user, session } = useAuth()
  const [snaps, setSnaps] = useState<FeedSnap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSnap, setSelectedSnap] = useState<SnapDetails | null>(null)

  const fetchSnapFeed = useCallback(async (page: number = 1) => {
    if (!session?.access_token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    try {
      console.log('📱 Fetching snap feed, page:', page)
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:3001/api/snap-feed?page=${page}&limit=20`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch snap feed')
      }

      const data = await response.json()
      console.log('✅ Snap feed fetched:', data.snaps.length, 'snaps')

      if (page === 1) {
        setSnaps(data.snaps)
      } else {
        setSnaps(prev => [...prev, ...data.snaps])
      }

    } catch (err: any) {
      console.error('❌ Error fetching snap feed:', err)
      setError(err.message || 'Failed to fetch snap feed')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  const viewSnap = useCallback(async (snapId: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    try {
      console.log('👁️ Viewing snap:', snapId)

      const response = await fetch(`http://localhost:3001/api/snap-feed/${snapId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to view snap')
      }

      console.log('✅ Snap viewed successfully')

      // Update local state to mark as viewed
      setSnaps(prev => prev.map(snap => 
        snap.id === snapId ? { ...snap, isViewed: true } : snap
      ))

      return { error: null }
    } catch (err: any) {
      console.error('❌ Error viewing snap:', err)
      return { error: err.message || 'Failed to view snap' }
    }
  }, [session?.access_token])

  const reactToSnap = useCallback(async (snapId: string, reaction?: string, comment?: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    try {
      console.log('💝 Reacting to snap:', snapId, { reaction, comment: !!comment })

      const response = await fetch(`http://localhost:3001/api/snap-feed/${snapId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapId,
          reaction,
          comment
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to react to snap')
      }

      console.log('✅ Reaction saved successfully')

      // Update local state with new reaction
      if (reaction) {
        setSnaps(prev => prev.map(snap => {
          if (snap.id === snapId) {
            const newCounts = { ...snap.reactions.counts }
            
            // Remove old reaction count if exists
            if (snap.reactions.userReaction) {
              newCounts[snap.reactions.userReaction] = Math.max(0, (newCounts[snap.reactions.userReaction] || 0) - 1)
            }
            
            // Add new reaction count
            newCounts[reaction] = (newCounts[reaction] || 0) + 1
            
            return {
              ...snap,
              reactions: {
                ...snap.reactions,
                counts: newCounts,
                userReaction: reaction,
                total: Object.values(newCounts).reduce((sum, count) => sum + count, 0)
              }
            }
          }
          return snap
        }))
      }

      return { error: null }
    } catch (err: any) {
      console.error('❌ Error reacting to snap:', err)
      return { error: err.message || 'Failed to react to snap' }
    }
  }, [session?.access_token])

  const getSnapDetails = useCallback(async (snapId: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    try {
      console.log('🔍 Fetching snap details:', snapId)

      const response = await fetch(`http://localhost:3001/api/snap-feed/${snapId}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch snap details')
      }

      const snapDetails = await response.json()
      console.log('✅ Snap details fetched:', snapDetails.id)

      setSelectedSnap(snapDetails)
      return { error: null }
    } catch (err: any) {
      console.error('❌ Error fetching snap details:', err)
      return { error: err.message || 'Failed to fetch snap details' }
    }
  }, [session?.access_token])

  const clearSelectedSnap = useCallback(() => {
    setSelectedSnap(null)
  }, [])

  const refreshFeed = useCallback(async () => {
    await fetchSnapFeed(1)
  }, [fetchSnapFeed])

  // Initialize snap feed when user logs in
  useEffect(() => {
    if (user && session?.access_token) {
      fetchSnapFeed(1)
    }
  }, [user, session?.access_token, fetchSnapFeed])

  const value = {
    snaps,
    loading,
    error,
    selectedSnap,
    fetchSnapFeed,
    viewSnap,
    reactToSnap,
    getSnapDetails,
    clearSelectedSnap,
    refreshFeed,
  }

  return <SnapFeedContext.Provider value={value}>{children}</SnapFeedContext.Provider>
}
