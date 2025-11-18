import express from 'express'
import { getLeaderboard, getUserLeaderboardPosition, getLeaderboardWithUserPosition } from '../services/leaderboard'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

/**
 * GET /api/leaderboard/:period
 * Get leaderboard for a specific period
 */
router.get('/:period', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.params.period as 'daily' | 'weekly' | 'monthly' | 'all_time'
  
  if (!['daily', 'weekly', 'monthly', 'all_time'].includes(period)) {
    throw createError(400, 'Invalid period. Must be one of: daily, weekly, monthly, all_time')
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const offset = parseInt(req.query.offset as string) || 0

  const leaderboard = await getLeaderboard(period, limit, offset)
  
  res.json({
    period,
    leaderboard,
    pagination: {
      limit,
      offset,
      total: leaderboard.length
    }
  })
}))

/**
 * GET /api/leaderboard/:period/me
 * Get current user's position in leaderboard
 */
router.get('/:period/me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const period = req.params.period as 'daily' | 'weekly' | 'monthly' | 'all_time'
  
  if (!['daily', 'weekly', 'monthly', 'all_time'].includes(period)) {
    throw createError(400, 'Invalid period. Must be one of: daily, weekly, monthly, all_time')
  }

  const position = await getUserLeaderboardPosition(req.user.id, period)
  
  if (!position) {
    return res.json({
      period,
      position: null,
      message: 'User not found in leaderboard'
    })
  }

  res.json({
    period,
    position
  })
}))

/**
 * GET /api/leaderboard/:period/with-me
 * Get leaderboard with current user's position highlighted
 */
router.get('/:period/with-me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required')
  }

  const period = req.params.period as 'daily' | 'weekly' | 'monthly' | 'all_time'
  
  if (!['daily', 'weekly', 'monthly', 'all_time'].includes(period)) {
    throw createError(400, 'Invalid period. Must be one of: daily, weekly, monthly, all_time')
  }

  const topCount = Math.min(parseInt(req.query.topCount as string) || 10, 50)

  const result = await getLeaderboardWithUserPosition(req.user.id, period, topCount)
  
  res.json({
    period,
    ...result
  })
}))

export default router
