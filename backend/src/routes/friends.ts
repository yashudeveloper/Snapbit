import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

const addFriendSchema = z.object({
  username: z.string().min(3).max(30)
})

const searchFriendsSchema = z.object({
  query: z.string().min(1).max(50),
  limit: z.number().min(1).max(20).optional().default(10)
})

/**
 * GET /api/friends/search
 * Search for users to add as friends
 */
router.get('/search', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = searchFriendsSchema.safeParse({
    query: req.query.q,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10
  })

  if (!validationResult.success) {
    throw createError(400, 'Invalid search parameters')
  }

  const { query, limit } = validationResult.data
  const searchTerm = `%${query.toLowerCase()}%`

  console.log('🔍 Searching for users with query:', query, 'limit:', limit)

  // Search users by username or display_name, excluding current user
  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      snap_score,
      current_streak,
      ghost_mode
    `)
    .neq('id', req.user.id)
    .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
    .eq('ghost_mode', false) // Only show users who are not in ghost mode
    .order('snap_score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('❌ Search error:', error)
    throw createError(500, 'Failed to search users')
  }

  console.log('📦 Found users:', users?.length || 0)

  // Get existing friendships to show current status
  const userIds = users?.map(user => user.id) || []
  let friendshipStatuses: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`and(requester_id.eq.${req.user.id},addressee_id.in.(${userIds.join(',')})),and(requester_id.in.(${userIds.join(',')}),addressee_id.eq.${req.user.id})`)

    friendships?.forEach(friendship => {
      const friendId = friendship.requester_id === req.user!.id 
        ? friendship.addressee_id 
        : friendship.requester_id
      
      friendshipStatuses[friendId] = friendship.status
    })
  }

  // Format response with friendship status
  const searchResults = users?.map(user => ({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    snapScore: user.snap_score,
    currentStreak: user.current_streak,
    friendshipStatus: friendshipStatuses[user.id] || 'none' // none, pending, accepted, blocked
  })) || []

  console.log('✅ Search results prepared:', searchResults.length)

  res.json({ 
    results: searchResults,
    query,
    total: searchResults.length
  })
}))

/**
 * GET /api/friends
 * Get user's friends list
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  // Get friendships without foreign key joins
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError(500, 'Failed to fetch friendships')
  }

  // Get friend IDs
  const friendIds = (friendships || []).map(friendship => {
    return friendship.requester_id === req.user!.id 
      ? friendship.addressee_id 
      : friendship.requester_id
  })

  if (friendIds.length === 0) {
    return res.json({ friends: [] })
  }

  // Get friend profiles separately
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, snap_score, current_streak')
    .in('id', friendIds)

  if (profilesError) {
    throw createError(500, 'Failed to fetch friend profiles')
  }

  // Combine friendship data with profile data
  const friends = (friendships || []).map(friendship => {
    const friendId = friendship.requester_id === req.user!.id 
      ? friendship.addressee_id 
      : friendship.requester_id
    
    const profile = profiles?.find(p => p.id === friendId)
    
    return {
      friendshipId: friendship.id,
      id: profile?.id,
      username: profile?.username,
      display_name: profile?.display_name,
      avatar_url: profile?.avatar_url,
      snap_score: profile?.snap_score,
      current_streak: profile?.current_streak,
      friendsSince: friendship.created_at
    }
  }).filter(friend => friend.id) // Remove any friends where profile wasn't found

  res.json({ friends })
}))

/**
 * POST /api/friends/add
 * Send friend request
 */
router.post('/add', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = addFriendSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data')
  }

  const { username } = validationResult.data

  // Find user by username
  const { data: targetUser, error: userError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', username.toLowerCase())
    .single()

  if (userError || !targetUser) {
    throw createError(404, 'User not found')
  }

  if (targetUser.id === req.user.id) {
    throw createError(400, 'Cannot add yourself as a friend')
  }

  // Check if friendship already exists
  const { data: existingFriendship } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(requester_id.eq.${req.user.id},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${req.user.id})`)
    .single()

  if (existingFriendship) {
    if (existingFriendship.status === 'accepted') {
      throw createError(409, 'Already friends with this user')
    } else if (existingFriendship.status === 'pending') {
      throw createError(409, 'Friend request already sent')
    } else if (existingFriendship.status === 'blocked') {
      throw createError(403, 'Cannot send friend request to this user')
    }
  }

  // Create friend request
  const { data: friendship, error: friendshipError } = await supabase
    .from('friendships')
    .insert({
      requester_id: req.user.id,
      addressee_id: targetUser.id,
      status: 'pending'
    })
    .select()
    .single()

  if (friendshipError) {
    throw createError(500, 'Failed to send friend request')
  }

  res.status(201).json({
    message: 'Friend request sent successfully',
    friendship,
    targetUser: {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.display_name
    }
  })
}))

/**
 * GET /api/friends/requests
 * Get pending friend requests
 */
router.get('/requests', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const type = req.query.type as string // 'sent' or 'received'

  // Get friend requests without foreign key joins
  let query = supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('status', 'pending')

  if (type === 'sent') {
    query = query.eq('requester_id', req.user.id)
  } else if (type === 'received') {
    query = query.eq('addressee_id', req.user.id)
  } else {
    query = query.or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)
  }

  const { data: friendships, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw createError(500, 'Failed to fetch friend requests')
  }

  if (!friendships || friendships.length === 0) {
    return res.json({ requests: [] })
  }

  // Get all user IDs involved in these requests
  const userIds = new Set<string>()
  friendships.forEach(f => {
    userIds.add(f.requester_id)
    userIds.add(f.addressee_id)
  })

  // Get profiles for all users
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', Array.from(userIds))

  if (profilesError) {
    throw createError(500, 'Failed to fetch user profiles')
  }

  // Combine data
  const requests = friendships.map(friendship => {
    const requester = profiles?.find(p => p.id === friendship.requester_id)
    const addressee = profiles?.find(p => p.id === friendship.addressee_id)
    
    return {
      id: friendship.id,
      status: friendship.status,
      created_at: friendship.created_at,
      requester,
      addressee
    }
  }).filter(req => req.requester && req.addressee)

  res.json({ requests })
}))

/**
 * PUT /api/friends/requests/:id
 * Accept or reject friend request
 */
router.put('/requests/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { action } = req.body // 'accept' or 'reject'

  if (!['accept', 'reject'].includes(action)) {
    throw createError(400, 'Invalid action. Must be "accept" or "reject"')
  }

  // Get the friendship request
  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', req.params.id)
    .eq('addressee_id', req.user.id) // Only addressee can accept/reject
    .eq('status', 'pending')
    .single()

  if (fetchError || !friendship) {
    throw createError(404, 'Friend request not found')
  }

  const newStatus = action === 'accept' ? 'accepted' : 'blocked'

  const { data: updatedFriendship, error: updateError } = await supabase
    .from('friendships')
    .update({ status: newStatus })
    .eq('id', req.params.id)
    .select()
    .single()

  if (updateError) {
    throw createError(500, 'Failed to update friend request')
  }

  res.json({
    message: `Friend request ${action}ed successfully`,
    friendship: updatedFriendship
  })
}))

/**
 * DELETE /api/friends/:id
 * Remove friend
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', req.params.id)
    .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)

  if (error) {
    throw createError(500, 'Failed to remove friend')
  }

  res.status(204).send()
}))

export default router
