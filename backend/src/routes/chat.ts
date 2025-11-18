import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  snapId: z.string().uuid().optional(),
  messageType: z.enum(['text', 'snap']).default('text')
}).refine(data => {
  return data.content || data.snapId
}, {
  message: "Either content or snapId must be provided"
})

const sendSnapToChatSchema = z.object({
  snapId: z.string().uuid(),
  caption: z.string().max(500).optional()
})

/**
 * GET /api/chat/rooms
 * Get user's chat rooms
 */
router.get('/rooms', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { data: rooms, error } = await supabase
    .from('chat_participants')
    .select(`
      room_id,
      joined_at,
      last_read_at,
      chat_rooms (
        id,
        type,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', req.user.id)
    .order('joined_at', { ascending: false })

  if (error) {
    throw createError(500, 'Failed to fetch chat rooms')
  }

  res.json({ 
    rooms: (rooms || []).map(r => ({
      ...r.chat_rooms,
      joinedAt: r.joined_at,
      lastReadAt: r.last_read_at
    }))
  })
}))

/**
 * POST /api/chat/rooms
 * Create a new chat room (direct or group)
 */
router.post('/rooms', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { type, name, participantIds } = req.body

  if (!['direct', 'group'].includes(type)) {
    throw createError(400, 'Invalid room type')
  }

  if (type === 'group' && !name) {
    throw createError(400, 'Group name is required')
  }

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw createError(400, 'Participant IDs are required')
  }

  // For direct chats, check if room already exists
  if (type === 'direct' && participantIds.length === 1) {
    const otherUserId = participantIds[0]
    
    // Find existing direct chat
    const { data: existingRoom } = await supabase
      .from('chat_participants')
      .select(`
        room_id,
        chat_rooms!inner (
          id,
          type
        )
      `)
      .eq('user_id', req.user.id)
      .eq('chat_rooms.type', 'direct')

    if (existingRoom) {
      for (const room of existingRoom) {
        const { data: otherParticipant } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', room.room_id)
          .eq('user_id', otherUserId)
          .single()

        if (otherParticipant) {
          return res.json({ 
            room: { id: room.room_id },
            message: 'Direct chat already exists'
          })
        }
      }
    }
  }

  // Create new room
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      type,
      name: type === 'group' ? name : null,
      created_by: req.user.id
    })
    .select()
    .single()

  if (roomError) {
    throw createError(500, 'Failed to create chat room')
  }

  // Add participants
  const participants = [
    { room_id: room.id, user_id: req.user.id },
    ...participantIds.map((id: string) => ({ room_id: room.id, user_id: id }))
  ]

  const { error: participantsError } = await supabase
    .from('chat_participants')
    .insert(participants)

  if (participantsError) {
    throw createError(500, 'Failed to add participants')
  }

  res.status(201).json({ room })
}))

/**
 * GET /api/chat/rooms/:roomId/messages
 * Get messages for a chat room
 */
router.get('/rooms/:roomId/messages', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  // Verify user is participant
  const { data: participant } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('room_id', req.params.roomId)
    .eq('user_id', req.user.id)
    .single()

  if (!participant) {
    throw createError(403, 'Not a participant in this chat room')
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const offset = (page - 1) * limit

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      ),
      snap:snaps (
        id,
        image_url,
        caption
      )
    `)
    .eq('room_id', req.params.roomId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError(500, 'Failed to fetch messages')
  }

  res.json({
    messages: (messages || []).reverse(), // Reverse to show oldest first
    pagination: {
      page,
      limit,
      hasMore: (messages || []).length === limit
    }
  })
}))

/**
 * POST /api/chat/rooms/:roomId/messages
 * Send a message to a chat room
 */
router.post('/rooms/:roomId/messages', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = sendMessageSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid message data')
  }

  const { content, snapId, messageType } = validationResult.data

  // Verify user is participant
  const { data: participant } = await supabase
    .from('chat_participants')
    .select('*')
    .eq('room_id', req.params.roomId)
    .eq('user_id', req.user.id)
    .single()

  if (!participant) {
    throw createError(403, 'Not a participant in this chat room')
  }

  // If snapId provided, verify it belongs to user
  if (snapId) {
    const { data: snap } = await supabase
      .from('snaps')
      .select('*')
      .eq('id', snapId)
      .eq('user_id', req.user.id)
      .single()

    if (!snap) {
      throw createError(404, 'Snap not found')
    }
  }

  // Create message
  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: req.params.roomId,
      sender_id: req.user.id,
      content: content || null,
      snap_id: snapId || null,
      message_type: messageType
    })
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      ),
      snap:snaps (
        id,
        image_url,
        caption
      )
    `)
    .single()

  if (error) {
    throw createError(500, 'Failed to send message')
  }

  // Update room's updated_at timestamp
  await supabase
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', req.params.roomId)

  res.status(201).json({ message })
}))

/**
 * PUT /api/chat/rooms/:roomId/read
 * Mark messages as read
 */
router.put('/rooms/:roomId/read', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { error } = await supabase
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', req.params.roomId)
    .eq('user_id', req.user.id)

  if (error) {
    throw createError(500, 'Failed to mark as read')
  }

  res.json({ message: 'Messages marked as read' })
}))

/**
 * POST /api/chat/rooms/:roomId/send-snap
 * Send a snap to a chat room
 */
router.post('/rooms/:roomId/send-snap', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = sendSnapToChatSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid snap data')
  }

  const { snapId, caption } = validationResult.data
  const roomId = req.params.roomId

  console.log('📸 Sending snap to chat room:', { roomId, snapId, caption: !!caption })

  try {
    // Verify user is participant in the room
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', req.user.id)
      .single()

    if (participantError || !participant) {
      throw createError(403, 'Not a participant in this chat room')
    }

    // Verify snap belongs to user and is accessible
    const { data: snap, error: snapError } = await supabase
      .from('snaps')
      .select('*')
      .eq('id', snapId)
      .eq('user_id', req.user.id)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (snapError || !snap) {
      console.error('❌ Snap verification failed:', snapError)
      throw createError(404, 'Snap not found or not accessible')
    }

    // Create the snap message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: req.user.id,
        content: caption || null,
        message_type: 'snap',
        snap_id: snapId
      })
      .select('*')
      .single()

    if (messageError) {
      console.error('❌ Failed to create snap message:', messageError)
      throw createError(500, 'Failed to send snap to chat')
    }

    // Get sender and snap details for response
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', req.user.id)
      .single()

    const enrichedMessage = {
      ...message,
      sender: senderProfile,
      snap: {
        id: snap.id,
        image_url: snap.image_url,
        caption: snap.caption,
        expires_at: snap.expires_at,
        status: snap.status
      }
    }

    // Update room's updated_at timestamp
    await supabase
      .from('chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId)

    console.log('✅ Snap sent to chat room successfully:', message.id)

    res.status(201).json({ 
      message: enrichedMessage,
      success: true
    })

  } catch (error) {
    console.error('💥 Error sending snap to chat:', error)
    throw error
  }
}))

/**
 * POST /api/chat/rooms/direct
 * Create or get existing direct chat room with a friend
 */
router.post('/rooms/direct', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { friendId } = req.body

  if (!friendId) {
    throw createError(400, 'Friend ID is required')
  }

  console.log('🔍 Finding or creating direct chat between:', req.user.id, 'and', friendId)

  try {
    // First, verify friendship exists
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${req.user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${req.user.id})`)
      .single()

    if (friendshipError || !friendship) {
      throw createError(403, 'You are not friends with this user')
    }

    // Use database function to find or create direct chat room
    console.log('🔍 Using database function to find/create direct chat room...')
    
    const { data: roomResult, error: functionError } = await supabase
      .rpc('create_or_get_direct_chat', {
        user1_id: req.user.id,
        user2_id: friendId
      })

    if (functionError) {
      console.error('❌ Error with database function:', functionError)
      throw createError(500, 'Failed to create/find chat room')
    }

    const roomId = roomResult
    console.log('✅ Got room ID from function:', roomId)

    // Check if this is a new room by seeing if it was just created
    const { data: roomDetails, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError) {
      throw createError(500, 'Failed to fetch room details')
    }

    // Consider it "new" if created within the last 5 seconds
    const isNew = new Date(roomDetails.created_at) > new Date(Date.now() - 5000)

    console.log('✅ Direct chat room ready:', roomId, isNew ? '(new)' : '(existing)')

    res.json({
      room: roomDetails,
      isNew: isNew,
      message: isNew ? 'New chat room created' : 'Using existing chat room'
    })

  } catch (error) {
    console.error('💥 Error in direct chat creation:', error)
    throw error
  }
}))

export default router
