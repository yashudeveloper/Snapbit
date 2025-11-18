import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

const viewSnapSchema = z.object({
  snapId: z.string().uuid()
})

const reactToSnapSchema = z.object({
  snapId: z.string().uuid(),
  reaction: z.enum(['like', 'love', 'laugh', 'wow', 'sad', 'angry']).optional(),
  comment: z.string().max(500).optional()
}).refine(data => data.reaction || data.comment, {
  message: "Either reaction or comment must be provided"
})

/**
 * GET /api/snap-feed
 * Get snaps from friends for the feed
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
  const offset = (page - 1) * limit

  console.log('📱 Fetching snap feed for user:', req.user.id, 'page:', page)

  try {
    // First, get user's friends
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)

    if (friendsError) {
      console.error('❌ Error fetching friendships:', friendsError)
      throw createError(500, 'Failed to fetch friends')
    }

    // Extract friend IDs
    const friendIds = friendships?.map(friendship => {
      return friendship.requester_id === req.user!.id 
        ? friendship.addressee_id 
        : friendship.requester_id
    }) || []

    console.log('👥 Found friends:', friendIds.length)

    if (friendIds.length === 0) {
      return res.json({
        snaps: [],
        pagination: { page, limit, hasMore: false, total: 0 }
      })
    }

    // Get snaps from friends (approved snaps only, not expired)
    const { data: snaps, error: snapsError } = await supabase
      .from('snaps')
      .select('*')
      .in('user_id', friendIds)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (snapsError) {
      console.error('❌ Error fetching snaps:', snapsError)
      throw createError(500, 'Failed to fetch snaps')
    }

    console.log('📸 Found snaps:', snaps?.length || 0)

    if (!snaps || snaps.length === 0) {
      return res.json({
        snaps: [],
        pagination: { page, limit, hasMore: false, total: 0 }
      })
    }

    // Get user profiles for snap creators
    const userIds = [...new Set(snaps.map(snap => snap.user_id))]
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
    }

    // Get habits for snaps that have habit_id
    const habitIds = snaps.map(snap => snap.habit_id).filter(Boolean)
    let habits = []
    if (habitIds.length > 0) {
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('id, name, category, icon')
        .in('id', habitIds)

      if (!habitsError) {
        habits = habitsData || []
      }
    }

    // Get view status for current user
    const snapIds = snaps.map(snap => snap.id)
    const { data: viewedSnaps, error: viewsError } = await supabase
      .from('snap_views')
      .select('snap_id, viewed_at')
      .eq('viewer_id', req.user.id)
      .in('snap_id', snapIds)

    if (viewsError) {
      console.error('❌ Error fetching view status:', viewsError)
    }

    // Get reaction counts and user's reactions
    const { data: reactions, error: reactionsError } = await supabase
      .from('snap_reactions')
      .select('snap_id, reaction, user_id')
      .in('snap_id', snapIds)

    if (reactionsError) {
      console.error('❌ Error fetching reactions:', reactionsError)
    }

    // Combine all data
    const enrichedSnaps = snaps.map(snap => {
      const creator = profiles?.find(p => p.id === snap.user_id)
      const habit = habits.find(h => h.id === snap.habit_id)
      const isViewed = viewedSnaps?.some(v => v.snap_id === snap.id)
      
      // Calculate reaction counts
      const snapReactions = reactions?.filter(r => r.snap_id === snap.id) || []
      const reactionCounts = snapReactions.reduce((acc, reaction) => {
        acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const userReaction = snapReactions.find(r => r.user_id === req.user!.id)?.reaction

      return {
        id: snap.id,
        imageUrl: snap.image_url,
        caption: snap.caption,
        createdAt: snap.created_at,
        expiresAt: snap.expires_at,
        isViewed,
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          displayName: creator.display_name,
          avatarUrl: creator.avatar_url
        } : null,
        habit: habit ? {
          id: habit.id,
          name: habit.name,
          category: habit.category,
          icon: habit.icon
        } : null,
        reactions: {
          counts: reactionCounts,
          userReaction: userReaction || null,
          total: snapReactions.length
        }
      }
    })

    res.json({
      snaps: enrichedSnaps,
      pagination: {
        page,
        limit,
        hasMore: snaps.length === limit,
        total: enrichedSnaps.length
      }
    })

  } catch (error) {
    console.error('💥 Error in snap feed:', error)
    throw createError(500, 'Failed to fetch snap feed')
  }
}))

/**
 * POST /api/snap-feed/:snapId/view
 * Mark a snap as viewed
 */
router.post('/:snapId/view', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { snapId } = req.params

  console.log('👁️ Marking snap as viewed:', snapId, 'by user:', req.user.id)

  try {
    // Verify snap exists and is accessible
    const { data: snap, error: snapError } = await supabase
      .from('snaps')
      .select('id, user_id, status, expires_at')
      .eq('id', snapId)
      .single()

    if (snapError || !snap) {
      throw createError(404, 'Snap not found')
    }

    // Check if snap is expired
    if (new Date(snap.expires_at) < new Date()) {
      throw createError(410, 'Snap has expired')
    }

    // Check if snap is approved
    if (snap.status !== 'approved') {
      throw createError(403, 'Snap is not available')
    }

    // Check if user is friends with snap creator (unless it's their own snap)
    if (snap.user_id !== req.user.id) {
      const { data: friendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${req.user.id},addressee_id.eq.${snap.user_id}),and(requester_id.eq.${snap.user_id},addressee_id.eq.${req.user.id})`)
        .single()

      if (friendshipError || !friendship) {
        throw createError(403, 'Not authorized to view this snap')
      }
    }

    // Record the view (upsert to handle multiple views)
    const { error: viewError } = await supabase
      .from('snap_views')
      .upsert({
        snap_id: snapId,
        viewer_id: req.user.id,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'snap_id,viewer_id'
      })

    if (viewError) {
      console.error('❌ Error recording snap view:', viewError)
      throw createError(500, 'Failed to record view')
    }

    console.log('✅ Snap view recorded successfully')

    res.json({ 
      message: 'Snap viewed successfully',
      viewedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error viewing snap:', error)
    throw error
  }
}))

/**
 * POST /api/snap-feed/:snapId/react
 * React to a snap (like, comment, etc.)
 */
router.post('/:snapId/react', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { snapId } = req.params
  const validationResult = reactToSnapSchema.safeParse(req.body)

  if (!validationResult.success) {
    throw createError(400, 'Invalid reaction data')
  }

  const { reaction, comment } = validationResult.data

  console.log('💝 Adding reaction to snap:', snapId, 'reaction:', reaction, 'comment:', !!comment)

  try {
    // Verify snap exists and is accessible (same checks as view)
    const { data: snap, error: snapError } = await supabase
      .from('snaps')
      .select('id, user_id, status, expires_at')
      .eq('id', snapId)
      .single()

    if (snapError || !snap) {
      throw createError(404, 'Snap not found')
    }

    if (new Date(snap.expires_at) < new Date()) {
      throw createError(410, 'Snap has expired')
    }

    if (snap.status !== 'approved') {
      throw createError(403, 'Snap is not available')
    }

    // Check friendship (unless own snap)
    if (snap.user_id !== req.user.id) {
      const { data: friendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${req.user.id},addressee_id.eq.${snap.user_id}),and(requester_id.eq.${snap.user_id},addressee_id.eq.${req.user.id})`)
        .single()

      if (friendshipError || !friendship) {
        throw createError(403, 'Not authorized to react to this snap')
      }
    }

    // Handle reaction
    if (reaction) {
      const { error: reactionError } = await supabase
        .from('snap_reactions')
        .upsert({
          snap_id: snapId,
          user_id: req.user.id,
          reaction: reaction
        }, {
          onConflict: 'snap_id,user_id'
        })

      if (reactionError) {
        console.error('❌ Error saving reaction:', reactionError)
        throw createError(500, 'Failed to save reaction')
      }
    }

    // Handle comment
    if (comment) {
      const { error: commentError } = await supabase
        .from('snap_comments')
        .insert({
          snap_id: snapId,
          user_id: req.user.id,
          comment: comment
        })

      if (commentError) {
        console.error('❌ Error saving comment:', commentError)
        throw createError(500, 'Failed to save comment')
      }
    }

    console.log('✅ Reaction saved successfully')

    res.json({ 
      message: 'Reaction saved successfully',
      reaction: reaction || null,
      comment: comment || null
    })

  } catch (error) {
    console.error('💥 Error reacting to snap:', error)
    throw error
  }
}))

/**
 * GET /api/snap-feed/:snapId/details
 * Get detailed information about a specific snap
 */
router.get('/:snapId/details', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { snapId } = req.params

  console.log('🔍 Fetching snap details:', snapId)

  try {
    // Get snap details
    const { data: snap, error: snapError } = await supabase
      .from('snaps')
      .select('*')
      .eq('id', snapId)
      .single()

    if (snapError || !snap) {
      throw createError(404, 'Snap not found')
    }

    // Check access permissions (same as view)
    if (snap.user_id !== req.user.id) {
      const { data: friendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${req.user.id},addressee_id.eq.${snap.user_id}),and(requester_id.eq.${snap.user_id},addressee_id.eq.${req.user.id})`)
        .single()

      if (friendshipError || !friendship) {
        throw createError(403, 'Not authorized to view this snap')
      }
    }

    // Get creator profile
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', snap.user_id)
      .single()

    // Get habit if exists
    let habit = null
    if (snap.habit_id) {
      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .select('id, name, category, icon')
        .eq('id', snap.habit_id)
        .single()

      if (!habitError) {
        habit = habitData
      }
    }

    // Get all reactions
    const { data: reactions, error: reactionsError } = await supabase
      .from('snap_reactions')
      .select(`
        reaction,
        user_id,
        created_at,
        profiles!snap_reactions_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('snap_id', snapId)
      .order('created_at', { ascending: false })

    // Get all comments
    const { data: comments, error: commentsError } = await supabase
      .from('snap_comments')
      .select(`
        id,
        comment,
        user_id,
        created_at,
        profiles!snap_comments_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('snap_id', snapId)
      .order('created_at', { ascending: true })

    // Get view count
    const { count: viewCount, error: viewCountError } = await supabase
      .from('snap_views')
      .select('*', { count: 'exact', head: true })
      .eq('snap_id', snapId)

    const snapDetails = {
      id: snap.id,
      imageUrl: snap.image_url,
      caption: snap.caption,
      createdAt: snap.created_at,
      expiresAt: snap.expires_at,
      status: snap.status,
      creator: creator || null,
      habit: habit,
      reactions: reactions || [],
      comments: comments || [],
      viewCount: viewCount || 0,
      isExpired: new Date(snap.expires_at) < new Date()
    }

    res.json(snapDetails)

  } catch (error) {
    console.error('💥 Error fetching snap details:', error)
    throw error
  }
}))

export default router
