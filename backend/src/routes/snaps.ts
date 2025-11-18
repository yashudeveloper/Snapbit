import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { verifySnapWithAI } from '../services/gemini'
import { updateUserScore } from '../services/scoring'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { uploadRateLimiter } from '../middleware/rateLimiter'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'snaps')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  console.log('📁 Created uploads directory:', UPLOADS_DIR)
}

// Helper function to save image locally
const saveImageLocally = async (buffer: Buffer, userId: string): Promise<string> => {
  const fileName = `${userId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.jpg`
  const userDir = path.join(UPLOADS_DIR, userId)
  
  // Create user directory if it doesn't exist
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }
  
  const filePath = path.join(userDir, fileName)
  
  // Write file
  await fs.promises.writeFile(filePath, buffer)
  
  // Return URL path (relative to server)
  return `/uploads/snaps/${userId}/${fileName}`
}

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',')
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'))
    }
  }
})

// Validation schemas
const createSnapSchema = z.object({
  habitId: z.string().uuid().optional(), // Made optional - will use default if not provided
  caption: z.string().max(500).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationName: z.string().max(255).optional()
})

const updateSnapSchema = z.object({
  status: z.enum(['approved', 'rejected']).optional(),
  manualReviewReason: z.string().max(500).optional()
})

/**
 * POST /api/snaps
 * Create a new snap with image upload and AI verification
 */
router.post('/', uploadRateLimiter, upload.single('image'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  if (!req.file) {
    throw createError(400, 'Image file is required')
  }

  // Validate request body
  const validationResult = createSnapSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data', 'VALIDATION_ERROR')
  }

  let { habitId, caption, locationLat, locationLng, locationName } = validationResult.data

  try {
    let habit = null

    // If habitId provided, verify it belongs to user
    if (habitId) {
      const { data: foundHabit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .single()

      if (habitError || !foundHabit) {
        console.warn('Provided habit not found or inactive, continuing without habit')
        habitId = null
      } else {
        habit = foundHabit
      }
    }

    // If no habitId, try to get default habit (but don't fail if not found)
    if (!habitId) {
      console.log('No habitId provided, trying to fetch default habit for user:', req.user.id)
      const { data: defaultHabit } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (defaultHabit) {
        habitId = defaultHabit.id
        habit = defaultHabit
        console.log('Using default habit:', habitId)
      } else {
        console.log('No habits found, creating snap without habit')
      }
    }

    // Process image
    const processedImage = await sharp(req.file.buffer)
      .resize(1080, 1920, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Generate image hash for anti-cheat
    const imageHash = crypto.createHash('sha256').update(processedImage).digest('hex')

    // Check for duplicate images
    const { data: existingSnap } = await supabase
      .from('snaps')
      .select('id')
      .eq('image_hash', imageHash)
      .eq('user_id', req.user.id)
      .single()

    if (existingSnap) {
      throw createError(409, 'This image has already been used for a snap')
    }

    // Save image locally
    console.log('💾 Saving image locally...')
    const imageUrl = await saveImageLocally(processedImage, req.user.id)
    console.log('✅ Image saved successfully:', imageUrl)
    
    // Construct full URL for the image
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`
    const publicUrl = `${baseUrl}${imageUrl}`

    // Verify with AI (only if habit exists)
    let aiResult
    let status: 'pending' | 'approved' | 'rejected' | 'low_confidence'
    
    if (habit) {
      aiResult = await verifySnapWithAI(processedImage, 'image/jpeg', {
        title: habit.title,
        description: habit.description,
        category: habit.category,
        customCategory: habit.custom_category
      })

      // Determine status based on AI confidence
      if (aiResult.confidence >= 0.70) {
        status = 'approved'
      } else if (aiResult.confidence >= 0.50) {
        status = 'low_confidence'
      } else {
        status = 'rejected'
      }
    } else {
      // No habit, skip AI verification and auto-approve
      console.log('No habit provided, auto-approving snap')
      status = 'approved'
      aiResult = {
        approved: true,
        confidence: 1.0,
        labels: [],
        reason: 'No habit verification required'
      }
    }

    // Create snap record
    const snapData = {
      user_id: req.user.id,
      habit_id: habitId || null, // Explicitly set to null if no habit
      image_url: publicUrl,
      image_hash: imageHash,
      caption: caption || null,
      location_lat: locationLat || null,
      location_lng: locationLng || null,
      location_name: locationName || null,
      status,
      ai_confidence: aiResult.confidence,
      ai_labels: aiResult.labels,
      ai_reason: aiResult.reason,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    console.log('📝 Creating snap with data:', { 
      user_id: snapData.user_id, 
      habit_id: snapData.habit_id, 
      status: snapData.status,
      ai_confidence: snapData.ai_confidence 
    })

    const { data: snap, error: snapError } = await supabase
      .from('snaps')
      .insert(snapData)
      .select()
      .single()

    if (snapError) {
      console.error('❌ Snap creation error details:', snapError)
      throw createError(500, `Failed to create snap record: ${snapError.message}`)
    }

    // Update user score if approved and has habit
    let scoreUpdate = null
    if (status === 'approved' && habitId) {
      try {
        scoreUpdate = await updateUserScore(req.user.id, habitId, true)
      } catch (error) {
        console.error('Error updating score:', error)
      }
    }

    res.status(201).json({
      snap,
      aiVerification: {
        approved: aiResult.approved,
        confidence: aiResult.confidence,
        labels: aiResult.labels,
        reason: aiResult.reason
      },
      scoreUpdate
    })
  } catch (error) {
    // Clean up uploaded file if snap creation failed
    if (req.file) {
      // Note: In a real implementation, you'd want to clean up the uploaded file
      console.error('Snap creation failed, should clean up uploaded file')
    }
    throw error
  }
}))

/**
 * GET /api/snaps
 * Get user's snaps with pagination and filtering
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
  const status = req.query.status as string
  const habitId = req.query.habitId as string
  const offset = (page - 1) * limit

  let query = supabase
    .from('snaps')
    .select(`
      *,
      habits (
        id,
        title,
        category,
        custom_category
      )
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && ['pending', 'approved', 'rejected', 'low_confidence'].includes(status)) {
    query = query.eq('status', status)
  }

  if (habitId) {
    query = query.eq('habit_id', habitId)
  }

  const { data: snaps, error, count } = await query

  if (error) {
    throw createError(500, 'Failed to fetch snaps')
  }

  res.json({
    snaps: snaps || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  })
}))

/**
 * GET /api/snaps/:id
 * Get a specific snap
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { data: snap, error } = await supabase
    .from('snaps')
    .select(`
      *,
      habits (
        id,
        title,
        category,
        custom_category
      )
    `)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (error || !snap) {
    throw createError(404, 'Snap not found')
  }

  res.json({ snap })
}))

/**
 * PATCH /api/snaps/:id
 * Update snap status (for manual review)
 */
router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = updateSnapSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data')
  }

  const { status, manualReviewReason } = validationResult.data

  // Get snap
  const { data: snap, error: snapError } = await supabase
    .from('snaps')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (snapError || !snap) {
    throw createError(404, 'Snap not found')
  }

  // Only allow updates for low_confidence snaps or admin users
  if (snap.status !== 'low_confidence') {
    throw createError(403, 'Snap status cannot be updated')
  }

  // Update snap
  const { data: updatedSnap, error: updateError } = await supabase
    .from('snaps')
    .update({
      status,
      manual_review_reason: manualReviewReason,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (updateError) {
    throw createError(500, 'Failed to update snap')
  }

  // Update score if status changed to approved
  let scoreUpdate = null
  if (status === 'approved' && snap.status !== 'approved') {
    try {
      scoreUpdate = await updateUserScore(req.user.id, snap.habit_id, true)
    } catch (error) {
      console.error('Error updating score:', error)
    }
  }

  res.json({
    snap: updatedSnap,
    scoreUpdate
  })
}))

/**
 * DELETE /api/snaps/:id
 * Delete a snap
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  // Get snap
  const { data: snap, error: snapError } = await supabase
    .from('snaps')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (snapError || !snap) {
    throw createError(404, 'Snap not found')
  }

  // Only allow deletion of pending or rejected snaps
  if (['approved', 'low_confidence'].includes(snap.status)) {
    throw createError(403, 'Cannot delete approved or under-review snaps')
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('snaps')
    .delete()
    .eq('id', req.params.id)

  if (deleteError) {
    throw createError(500, 'Failed to delete snap')
  }

  // Delete image from local storage
  try {
    // Extract file path from URL
    // URL format: http://localhost:3001/uploads/snaps/{userId}/{fileName}
    const urlPath = snap.image_url.replace(/^https?:\/\/[^\/]+/, '') // Remove domain
    const filePath = path.join(process.cwd(), urlPath)
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
      console.log('🗑️ Deleted local image:', filePath)
    }
  } catch (error) {
    console.error('Error deleting local image:', error)
  }

  res.status(204).send()
}))

/**
 * POST /api/snaps/:id/send
 * Send a snap to specific friends
 */
router.post('/:id/send', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const snapId = req.params.id
  const { friendIds } = req.body

  console.log('🚀 ===== SNAP SENDING STARTED =====')
  console.log('📸 Snap ID:', snapId)
  console.log('👤 User ID:', req.user.id)
  console.log('👥 Friend IDs:', friendIds)
  console.log('📊 Total friends to send:', friendIds?.length || 0)

  if (!Array.isArray(friendIds) || friendIds.length === 0) {
    console.error('❌ Invalid friendIds:', friendIds)
    throw createError(400, 'Friend IDs array is required')
  }

  // Verify snap belongs to user and is approved
  console.log('🔍 Verifying snap ownership and status...')
  const { data: snap, error: snapError } = await supabase
    .from('snaps')
    .select('*')
    .eq('id', snapId)
    .eq('user_id', req.user.id)
    .eq('status', 'approved')
    .single()

  if (snapError || !snap) {
    console.error('❌ Snap verification failed:', snapError)
    throw createError(404, 'Snap not found or not approved')
  }

  console.log('✅ Snap verified:', {
    id: snap.id,
    status: snap.status,
    user_id: snap.user_id
  })

  // Verify all recipients are friends
  console.log('🔍 Verifying friendships...')
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)

  if (friendError) {
    console.error('❌ Friendship verification failed:', friendError)
    throw createError(500, 'Failed to verify friendships')
  }

  const validFriendIds = friendships?.map(f => 
    f.requester_id === req.user!.id ? f.addressee_id : f.requester_id
  ) || []

  console.log('✅ Valid friend IDs:', validFriendIds)

  const invalidFriends = friendIds.filter(id => !validFriendIds.includes(id))
  if (invalidFriends.length > 0) {
    console.error('❌ Invalid friend IDs:', invalidFriends)
    throw createError(400, 'Some recipients are not your friends')
  }

  // Send snap to each friend via chat
  console.log('📤 Starting to send snap to each friend...')
  const results = []
  
  for (let i = 0; i < friendIds.length; i++) {
    const friendId = friendIds[i]
    console.log(`\n📨 [${i + 1}/${friendIds.length}] Processing friend: ${friendId}`)
    
    try {
      // Use the database function to find or create direct chat room with THIS specific friend
      console.log(`🔍 Calling create_or_get_direct_chat for user ${req.user.id} and friend ${friendId}`)
      
      const { data: roomResult, error: functionError } = await supabase
        .rpc('create_or_get_direct_chat', {
          user1_id: req.user.id,
          user2_id: friendId
        })

      if (functionError) {
        console.error(`❌ Database function error for friend ${friendId}:`, functionError)
        results.push({ 
          friendId, 
          success: false, 
          error: `Database function failed: ${functionError.message}` 
        })
        continue
      }

      if (!roomResult) {
        console.error(`❌ No room ID returned for friend ${friendId}`)
        results.push({ 
          friendId, 
          success: false, 
          error: 'No room ID returned from database function' 
        })
        continue
      }

      const roomId = roomResult
      console.log(`✅ Got room ID: ${roomId} for friend ${friendId}`)

      // Send snap message to this specific friend's chat room
      console.log(`💬 Inserting snap message into room ${roomId}`)
      
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: req.user.id,
          snap_id: snapId,
          message_type: 'snap',
          content: snap.caption || 'Sent a snap'
        })
        .select()
        .single()

      if (messageError) {
        console.error(`❌ Failed to insert message for friend ${friendId}:`, messageError)
        results.push({ 
          friendId, 
          success: false, 
          error: `Message insert failed: ${messageError.message}` 
        })
        continue
      }

      if (!message) {
        console.error(`❌ No message returned for friend ${friendId}`)
        results.push({ 
          friendId, 
          success: false, 
          error: 'No message returned from insert' 
        })
        continue
      }

      console.log(`✅ SUCCESS! Snap message ${message.id} sent to friend ${friendId} in room ${roomId}`)
      
      // 🔥 Update friend streak
      try {
        console.log(`🔥 Updating streak between ${req.user.id} and ${friendId}`)
        const { data: streakResult, error: streakError } = await supabase
          .rpc('update_friend_streak', {
            sender_id: req.user.id,
            receiver_id: friendId
          })
          .single()

        if (streakError) {
          console.error(`❌ Streak update error for friend ${friendId}:`, streakError)
        } else if (streakResult) {
          console.log(`✅ Streak updated:`, streakResult)
          results.push({ 
            friendId, 
            success: true, 
            messageId: message.id, 
            roomId,
            streak: {
              current: streakResult.current_streak,
              longest: streakResult.longest_streak,
              increased: streakResult.streak_increased
            }
          })
          continue
        }
      } catch (streakErr: any) {
        console.error(`💥 Streak exception for friend ${friendId}:`, streakErr)
      }
      
      results.push({ 
        friendId, 
        success: true, 
        messageId: message.id, 
        roomId 
      })
      
    } catch (err: any) {
      console.error(`💥 Exception processing friend ${friendId}:`, err)
      results.push({ 
        friendId, 
        success: false, 
        error: err.message || 'Unknown error' 
      })
    }
  }

  console.log('\n📊 ===== SNAP SENDING COMPLETED =====')
  console.log('✅ Successful:', results.filter(r => r.success).length)
  console.log('❌ Failed:', results.filter(r => !r.success).length)
  console.log('📋 Detailed results:', JSON.stringify(results, null, 2))

  // 🎯 UPDATE SNAP SCORE: +1 for each successfully sent snap
  const successfulSends = results.filter(r => r.success).length
  let newSnapScore = null
  
  if (successfulSends > 0) {
    console.log(`\n🏆 Updating snap score: +${successfulSends} points`)
    
    try {
      // First get current score
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('snap_score')
        .eq('id', req.user.id)
        .single()

      const newScore = (currentProfile?.snap_score || 0) + successfulSends

      // Update score
      const { data: updatedProfile, error: scoreError } = await supabase
        .from('profiles')
        .update({ snap_score: newScore })
        .eq('id', req.user.id)
        .select('snap_score')
        .single()

      if (scoreError) {
        console.error('❌ Failed to update snap score:', scoreError)
      } else {
        newSnapScore = updatedProfile.snap_score
        console.log(`✅ Snap score updated! New score: ${newSnapScore}`)
      }
    } catch (error) {
      console.error('💥 Exception updating snap score:', error)
    }
  }

  res.json({
    success: true,
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    scoreIncrease: successfulSends, // How many points were added
    newSnapScore: newSnapScore // User's new total score
  })
}))

/**
 * GET /api/snaps/friends/feed
 * Get approved snaps from friends for the feed
 */
router.get('/friends/feed', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
  const offset = (page - 1) * limit

  // Get friend IDs
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)

  if (friendError) {
    throw createError(500, 'Failed to fetch friends')
  }

  const friendIds = friendships?.map(f => 
    f.requester_id === req.user!.id ? f.addressee_id : f.requester_id
  ) || []

  if (friendIds.length === 0) {
    return res.json({
      snaps: [],
      pagination: { page, limit, total: 0, pages: 0 }
    })
  }

  // Get friends' approved snaps
  const { data: snaps, error, count } = await supabase
    .from('snaps')
    .select(`
      *,
      habits (
        id,
        title,
        category
      ),
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .in('user_id', friendIds)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError(500, 'Failed to fetch friends\' snaps')
  }

  res.json({
    snaps: snaps || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  })
}))

export default router
