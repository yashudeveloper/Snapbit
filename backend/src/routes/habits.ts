import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

// Validation schemas
const createHabitSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['fitness', 'nutrition', 'mindfulness', 'productivity', 'learning', 'social', 'creativity', 'health', 'custom']),
  customCategory: z.string().min(1).max(50).optional(),
  targetFrequency: z.number().int().min(1).max(10).default(1)
}).refine(data => {
  if (data.category === 'custom') {
    return data.customCategory && data.customCategory.length > 0
  }
  return true
}, {
  message: "Custom category is required when category is 'custom'",
  path: ["customCategory"]
})

const updateHabitSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['fitness', 'nutrition', 'mindfulness', 'productivity', 'learning', 'social', 'creativity', 'health', 'custom']).optional(),
  customCategory: z.string().min(1).max(50).optional(),
  targetFrequency: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional()
})

/**
 * GET /api/habits
 * Get user's habits
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const includeInactive = req.query.includeInactive === 'true'
  const category = req.query.category as string

  let query = supabase
    .from('habits')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data: habits, error } = await query

  if (error) {
    throw createError(500, 'Failed to fetch habits')
  }

  res.json({ habits: habits || [] })
}))

/**
 * POST /api/habits
 * Create a new habit
 */
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = createHabitSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data', 'VALIDATION_ERROR')
  }

  const { title, description, category, customCategory, targetFrequency } = validationResult.data

  // Check if user already has a habit with this title
  const { data: existingHabit } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('title', title)
    .eq('is_active', true)
    .single()

  if (existingHabit) {
    throw createError(409, 'A habit with this title already exists')
  }

  const { data: habit, error } = await supabase
    .from('habits')
    .insert({
      user_id: req.user.id,
      title,
      description: description || null,
      category,
      custom_category: category === 'custom' ? customCategory : null,
      target_frequency: targetFrequency,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    throw createError(500, 'Failed to create habit')
  }

  res.status(201).json({ habit })
}))

/**
 * GET /api/habits/:id
 * Get a specific habit
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { data: habit, error } = await supabase
    .from('habits')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (error || !habit) {
    throw createError(404, 'Habit not found')
  }

  res.json({ habit })
}))

/**
 * PUT /api/habits/:id
 * Update a habit
 */
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const validationResult = updateHabitSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data', 'VALIDATION_ERROR')
  }

  const updates = validationResult.data

  // Validate custom category if category is being updated to custom
  if (updates.category === 'custom' && !updates.customCategory) {
    throw createError(400, 'Custom category is required when category is custom')
  }

  // Get existing habit
  const { data: existingHabit, error: fetchError } = await supabase
    .from('habits')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (fetchError || !existingHabit) {
    throw createError(404, 'Habit not found')
  }

  // Check for title conflicts if title is being updated
  if (updates.title && updates.title !== existingHabit.title) {
    const { data: conflictingHabit } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('title', updates.title)
      .eq('is_active', true)
      .neq('id', req.params.id)
      .single()

    if (conflictingHabit) {
      throw createError(409, 'A habit with this title already exists')
    }
  }

  // Prepare update object
  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.category !== undefined) {
    updateData.category = updates.category
    updateData.custom_category = updates.category === 'custom' ? updates.customCategory : null
  }
  if (updates.targetFrequency !== undefined) updateData.target_frequency = updates.targetFrequency
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  const { data: habit, error } = await supabase
    .from('habits')
    .update(updateData)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) {
    throw createError(500, 'Failed to update habit')
  }

  res.json({ habit })
}))

/**
 * DELETE /api/habits/:id
 * Soft delete a habit (set is_active to false)
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const { data: habit, error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError(404, 'Habit not found')
    }
    throw createError(500, 'Failed to delete habit')
  }

  res.status(204).send()
}))

/**
 * GET /api/habits/:id/stats
 * Get habit statistics
 */
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  // Verify habit belongs to user
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (habitError || !habit) {
    throw createError(404, 'Habit not found')
  }

  // Get streak records for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const { data: streakRecords, error: streakError } = await supabase
    .from('streak_records')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('habit_id', req.params.id)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false })

  if (streakError) {
    throw createError(500, 'Failed to fetch streak records')
  }

  // Get approved snaps count
  const { count: approvedSnaps, error: snapsError } = await supabase
    .from('snaps')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .eq('habit_id', req.params.id)
    .eq('status', 'approved')

  if (snapsError) {
    throw createError(500, 'Failed to fetch snaps count')
  }

  // Calculate statistics
  const records = streakRecords || []
  const completedDays = records.filter(r => r.completed).length
  const totalDays = records.length
  const successRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0

  // Calculate current streak
  let currentStreak = 0
  for (const record of records) {
    if (record.completed) {
      currentStreak++
    } else {
      break
    }
  }

  // Calculate longest streak from all records
  const { data: allRecords, error: allRecordsError } = await supabase
    .from('streak_records')
    .select('date, completed')
    .eq('user_id', req.user.id)
    .eq('habit_id', req.params.id)
    .order('date', { ascending: true })

  let longestStreak = 0
  let tempStreak = 0

  if (!allRecordsError && allRecords) {
    for (const record of allRecords) {
      if (record.completed) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }
  }

  res.json({
    habit,
    stats: {
      currentStreak,
      longestStreak,
      successRate,
      completedDays,
      totalDays: Math.max(totalDays, 30), // Show 30 days even if no records
      approvedSnaps: approvedSnaps || 0,
      recentActivity: records.slice(0, 7) // Last 7 days
    }
  })
}))

/**
 * GET /api/habits/categories
 * Get available habit categories
 */
router.get('/meta/categories', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const categories = [
    { key: 'fitness', label: 'Fitness', icon: '💪', description: 'Exercise, workouts, and physical activities' },
    { key: 'nutrition', label: 'Nutrition', icon: '🥗', description: 'Healthy eating and meal planning' },
    { key: 'mindfulness', label: 'Mindfulness', icon: '🧘', description: 'Meditation, breathing, and mental wellness' },
    { key: 'productivity', label: 'Productivity', icon: '⚡', description: 'Work efficiency and task completion' },
    { key: 'learning', label: 'Learning', icon: '📚', description: 'Education, reading, and skill development' },
    { key: 'social', label: 'Social', icon: '👥', description: 'Relationships and social interactions' },
    { key: 'creativity', label: 'Creativity', icon: '🎨', description: 'Art, music, writing, and creative pursuits' },
    { key: 'health', label: 'Health', icon: '❤️', description: 'Medical care and health monitoring' },
    { key: 'custom', label: 'Custom', icon: '✨', description: 'Create your own category' }
  ]

  res.json({ categories })
}))

export default router
