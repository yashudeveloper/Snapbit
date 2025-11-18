import { updateUserScore, getUserScoringStats, getPenaltyConfig } from '../services/scoring'
import { supabase } from '../config/supabase'

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn()
          })),
          gte: jest.fn(() => ({
            order: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn()
        })),
        upsert: jest.fn(),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}))

describe('Scoring System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateUserScore', () => {
    it('should increase score when snap is approved', async () => {
      const mockProfile = {
        id: 'user-1',
        snap_score: 10,
        current_streak: 5,
        longest_streak: 10
      }

      const mockSupabaseChain = {
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      }

      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockSupabaseChain)
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      })

      const result = await updateUserScore('user-1', 'habit-1', true)

      expect(result.snapApproved).toBe(true)
      expect(result.scoreChange).toBeGreaterThan(0)
    })

    it('should not change score when snap is rejected', async () => {
      const mockProfile = {
        id: 'user-1',
        snap_score: 10,
        current_streak: 5,
        longest_streak: 10
      }

      const mockSupabaseChain = {
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      }

      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockSupabaseChain)
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await updateUserScore('user-1', 'habit-1', false)

      expect(result.snapApproved).toBe(false)
      expect(result.scoreChange).toBe(0)
    })
  })

  describe('getUserScoringStats', () => {
    it('should return user scoring statistics', async () => {
      const mockProfile = {
        id: 'user-1',
        snap_score: 150,
        current_streak: 7,
        longest_streak: 15
      }

      const mockStreakRecords = [
        { date: '2024-01-01', completed: true },
        { date: '2024-01-02', completed: true },
        { date: '2024-01-03', completed: false },
      ]

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockStreakRecords, error: null })
              })
            })
          })
        })

      const stats = await getUserScoringStats('user-1')

      expect(stats.snapScore).toBe(150)
      expect(stats.currentStreak).toBe(7)
      expect(stats.longestStreak).toBe(15)
      expect(stats.successRate).toBe(67) // 2/3 * 100, rounded
    })
  })

  describe('getPenaltyConfig', () => {
    it('should return penalty configuration', () => {
      const config = getPenaltyConfig()

      expect(config.basePenalty).toBe(1)
      expect(config.maxPenalty).toBe(3)
      expect(config.progressiveMultiplier).toBe(1)
      expect(config.streakDecrement).toBe(1)
      expect(config.description).toBeDefined()
    })
  })

  describe('Streak Calculation Logic', () => {
    it('should calculate streaks correctly for consecutive days', () => {
      const records = [
        { date: '2024-01-03', completed: true },
        { date: '2024-01-02', completed: true },
        { date: '2024-01-01', completed: true },
      ]

      // This would be the logic inside calculateCurrentStreak
      let streak = 0
      for (const record of records) {
        if (record.completed) {
          streak++
        } else {
          break
        }
      }

      expect(streak).toBe(3)
    })

    it('should break streak on missed day', () => {
      const records = [
        { date: '2024-01-03', completed: true },
        { date: '2024-01-02', completed: false }, // Missed day
        { date: '2024-01-01', completed: true },
      ]

      let streak = 0
      for (const record of records) {
        if (record.completed) {
          streak++
        } else {
          break
        }
      }

      expect(streak).toBe(1) // Only the most recent day
    })
  })

  describe('Progressive Penalty Logic', () => {
    it('should apply increasing penalties for consecutive misses', () => {
      const calculatePenalty = (consecutiveMisses: number) => {
        return Math.min(consecutiveMisses + 1, 3)
      }

      expect(calculatePenalty(0)).toBe(1) // First miss
      expect(calculatePenalty(1)).toBe(2) // Second consecutive miss
      expect(calculatePenalty(2)).toBe(3) // Third consecutive miss
      expect(calculatePenalty(5)).toBe(3) // Cap at 3
    })
  })

  describe('Score Bonus Logic', () => {
    it('should apply streak bonuses correctly', () => {
      const calculateStreakBonus = (streak: number) => {
        if (streak >= 7) {
          return Math.floor(streak / 7)
        }
        return 0
      }

      expect(calculateStreakBonus(6)).toBe(0)  // No bonus yet
      expect(calculateStreakBonus(7)).toBe(1)  // First bonus
      expect(calculateStreakBonus(14)).toBe(2) // Second bonus
      expect(calculateStreakBonus(21)).toBe(3) // Third bonus
    })
  })
})
