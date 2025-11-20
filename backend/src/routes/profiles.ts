import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { getUserScoringStats } from '../services/scoring'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  ghostMode: z.boolean().optional(),
  locationEnabled: z.boolean().optional()
})

/**
 * GET /api/profiles/username-available/:username
 * Check if username is available (PUBLIC endpoint - no auth required)
 */
router.get('/username-available/:username', asyncHandler(async (req: express.Request, res) => {
  const { username } = req.params

  if (!username || username.length < 3) {
    return res.json({ available: false, message: 'Username must be at least 3 characters' })
  }

  const { data: existingProfile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (error) {
    throw createError(500, 'Failed to check username availability')
  }

  res.json({ 
    available: !existingProfile,
    message: existingProfile ? 'Username is already taken' : 'Username is available'
  })
}))

/**
 * GET /api/profiles/me
 * Get current user's profile
 */
router.get('/me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error || !profile) {
    throw createError(404, 'Profile not found')
  }

  res.json({ profile })
}))

/**
 * PUT /api/profiles/me
 * Update current user's profile
 */
router.put('/me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = updateProfileSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data', 'VALIDATION_ERROR')
  }

  const updates = validationResult.data
  const updateData: any = {}

  if (updates.displayName !== undefined) updateData.display_name = updates.displayName
  if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl
  if (updates.ghostMode !== undefined) updateData.ghost_mode = updates.ghostMode
  if (updates.locationEnabled !== undefined) updateData.location_enabled = updates.locationEnabled

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', req.user.id)
    .select()
    .single()

  if (error) {
    throw createError(500, 'Failed to update profile')
  }

  res.json({ profile })
}))

/**
 * GET /api/profiles/me/stats
 * Get current user's statistics
 */
router.get('/me/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const stats = await getUserScoringStats(req.user.id)
  res.json({ stats })
}))

/**
 * GET /api/profiles/me/default-habit
 * Get user's default habit (first active habit from signup)
 */
router.get('/me/default-habit', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { data: habit, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !habit) {
    throw createError(404, 'No active habit found')
  }

  res.json({ habit })
}))

/**
 * GET /api/profiles/:id
 * Get public profile by ID
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, snap_score, current_streak, longest_streak, created_at')
    .eq('id', req.params.id)
    .eq('ghost_mode', false) // Only show non-ghost profiles
    .single()

  if (error || !profile) {
    throw createError(404, 'Profile not found')
  }

  res.json({ profile })
}))

export default router
