import { Router } from 'express'
import { supabase } from '../config/supabase'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler, createError } from '../middleware/errorHandler'

const router = Router()

/**
 * GET /api/streaks
 * Get all friend streaks for the authenticated user
 */
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  console.log('📊 Fetching streaks for user:', req.user.id)

  try {
    // Get all streaks where user is either user1 or user2
    const { data: streaks, error } = await supabase
      .from('friend_streaks')
      .select(`
        *,
        user1:profiles!friend_streaks_user1_id_fkey(id, username, display_name, avatar_url),
        user2:profiles!friend_streaks_user2_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
      .order('current_streak', { ascending: false })

    if (error) {
      console.error('❌ Error fetching streaks:', error)
      throw createError(500, 'Failed to fetch streaks')
    }

    // Transform data to include friend info
    const transformedStreaks = streaks?.map(streak => {
      const iAmUser1 = streak.user1_id === req.user!.id
      const friend = iAmUser1 ? streak.user2 : streak.user1
      const myLastSnap = iAmUser1 ? streak.last_snap_user1_at : streak.last_snap_user2_at
      const friendLastSnap = iAmUser1 ? streak.last_snap_user2_at : streak.last_snap_user1_at

      return {
        id: streak.id,
        friend: {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url
        },
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        myLastSnapAt: myLastSnap,
        friendLastSnapAt: friendLastSnap,
        streakExpiresAt: streak.streak_expires_at,
        streakStartedAt: streak.streak_started_at,
        isActive: streak.current_streak > 0,
        needsMySnap: !myLastSnap && friendLastSnap,
        needsFriendSnap: myLastSnap && !friendLastSnap,
        bothSnapped: myLastSnap && friendLastSnap
      }
    }) || []

    console.log(`✅ Found ${transformedStreaks.length} streaks`)

    res.json({
      streaks: transformedStreaks,
      total: transformedStreaks.length,
      active: transformedStreaks.filter(s => s.isActive).length
    })
  } catch (error) {
    console.error('💥 Exception fetching streaks:', error)
    throw error
  }
}))

/**
 * GET /api/streaks/:friendId
 * Get streak with a specific friend
 */
router.get('/:friendId', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const friendId = req.params.friendId
  console.log(`📊 Fetching streak between ${req.user.id} and ${friendId}`)

  try {
    // Determine user order
    const user1Id = req.user.id < friendId ? req.user.id : friendId
    const user2Id = req.user.id < friendId ? friendId : req.user.id

    const { data: streak, error } = await supabase
      .from('friend_streaks')
      .select(`
        *,
        user1:profiles!friend_streaks_user1_id_fkey(id, username, display_name, avatar_url),
        user2:profiles!friend_streaks_user2_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('user1_id', user1Id)
      .eq('user2_id', user2Id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching streak:', error)
      throw createError(500, 'Failed to fetch streak')
    }

    if (!streak) {
      // No streak exists yet
      return res.json({
        streak: null,
        message: 'No streak exists yet. Send a snap to start one!'
      })
    }

    const iAmUser1 = streak.user1_id === req.user.id
    const friend = iAmUser1 ? streak.user2 : streak.user1
    const myLastSnap = iAmUser1 ? streak.last_snap_user1_at : streak.last_snap_user2_at
    const friendLastSnap = iAmUser1 ? streak.last_snap_user2_at : streak.last_snap_user1_at

    const transformedStreak = {
      id: streak.id,
      friend: {
        id: friend.id,
        username: friend.username,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url
      },
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      myLastSnapAt: myLastSnap,
      friendLastSnapAt: friendLastSnap,
      streakExpiresAt: streak.streak_expires_at,
      streakStartedAt: streak.streak_started_at,
      isActive: streak.current_streak > 0,
      needsMySnap: !myLastSnap && friendLastSnap,
      needsFriendSnap: myLastSnap && !friendLastSnap,
      bothSnapped: myLastSnap && friendLastSnap
    }

    res.json({ streak: transformedStreak })
  } catch (error) {
    console.error('💥 Exception fetching streak:', error)
    throw error
  }
}))

export default router

