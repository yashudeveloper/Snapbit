import { supabase } from '../config/supabase'

export interface ScoreUpdate {
  userId: string
  habitId: string
  snapApproved: boolean
  previousStreak: number
  newStreak: number
  scoreChange: number
  penaltyApplied: number
}

/**
 * Calculate and apply score changes when a snap is approved/rejected
 */
export async function updateUserScore(
  userId: string,
  habitId: string,
  snapApproved: boolean
): Promise<ScoreUpdate> {
  try {
    // Get current user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    const previousStreak = profile.current_streak
    let newStreak = previousStreak
    let scoreChange = 0
    let penaltyApplied = 0

    if (snapApproved) {
      // Snap approved - positive scoring
      scoreChange = 1 // Base score for approved snap
      
      // Update streak record for today
      const today = new Date().toISOString().split('T')[0]
      
      const { error: streakError } = await supabase
        .from('streak_records')
        .upsert({
          user_id: userId,
          habit_id: habitId,
          date: today,
          completed: true,
          snap_count: 1
        }, {
          onConflict: 'user_id,habit_id,date'
        })

      if (streakError) {
        console.error('Error updating streak record:', streakError)
      }

      // Calculate new streak
      newStreak = await calculateCurrentStreak(userId, habitId)
      
      // Bonus points for streaks
      if (newStreak >= 7) {
        scoreChange += Math.floor(newStreak / 7) // Bonus point every 7 days
      }
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        snap_score: Math.max(0, profile.snap_score + scoreChange - penaltyApplied),
        current_streak: newStreak,
        longest_streak: Math.max(profile.longest_streak, newStreak)
      })
      .eq('id', userId)

    if (updateError) {
      throw new Error('Failed to update user profile')
    }

    return {
      userId,
      habitId,
      snapApproved,
      previousStreak,
      newStreak,
      scoreChange,
      penaltyApplied
    }
  } catch (error) {
    console.error('Error updating user score:', error)
    throw error
  }
}

/**
 * Calculate current streak for a user and habit
 */
async function calculateCurrentStreak(userId: string, habitId: string): Promise<number> {
  try {
    // Get streak records for the last 30 days, ordered by date desc
    const { data: records, error } = await supabase
      .from('streak_records')
      .select('date, completed')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error || !records) {
      return 0
    }

    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    
    // Count consecutive completed days from today backwards
    for (const record of records) {
      if (record.completed) {
        streak++
      } else {
        break // Streak broken
      }
    }

    return streak
  } catch (error) {
    console.error('Error calculating streak:', error)
    return 0
  }
}

/**
 * Apply daily penalties for missed habits (called by cron job)
 */
export async function applyDailyPenalties(): Promise<void> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Get all active users and their habits
    const { data: activeHabits, error: habitsError } = await supabase
      .from('habits')
      .select(`
        id,
        user_id,
        title,
        profiles!inner (
          id,
          snap_score,
          current_streak
        )
      `)
      .eq('is_active', true)

    if (habitsError || !activeHabits) {
      console.error('Error fetching active habits:', habitsError)
      return
    }

    for (const habit of activeHabits) {
      await processMissedHabit(habit.user_id, habit.id, yesterday)
    }

    console.log(`Processed penalties for ${activeHabits.length} habits`)
  } catch (error) {
    console.error('Error applying daily penalties:', error)
    throw error
  }
}

/**
 * Process penalty for a missed habit
 */
async function processMissedHabit(userId: string, habitId: string, date: string): Promise<void> {
  try {
    // Check if user completed this habit yesterday
    const { data: existingRecord } = await supabase
      .from('streak_records')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('date', date)
      .single()

    // If record exists and is completed, no penalty needed
    if (existingRecord && existingRecord.completed) {
      return
    }

    // Calculate consecutive misses for progressive penalty
    const consecutiveMisses = await calculateConsecutiveMisses(userId, habitId, date)
    const penalty = Math.min(consecutiveMisses + 1, 3) // Progressive penalty, max 3 points

    // Create miss record
    const { error: recordError } = await supabase
      .from('streak_records')
      .upsert({
        user_id: userId,
        habit_id: habitId,
        date: date,
        completed: false,
        snap_count: 0,
        penalty_applied: penalty
      }, {
        onConflict: 'user_id,habit_id,date'
      })

    if (recordError) {
      console.error('Error creating miss record:', recordError)
      return
    }

    // Apply penalty to user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('snap_score, current_streak')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        snap_score: Math.max(0, profile.snap_score - penalty),
        current_streak: Math.max(0, profile.current_streak - 1)
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
    }

    console.log(`Applied penalty of ${penalty} points to user ${userId} for habit ${habitId}`)
  } catch (error) {
    console.error('Error processing missed habit:', error)
  }
}

/**
 * Calculate consecutive misses for progressive penalty
 */
async function calculateConsecutiveMisses(userId: string, habitId: string, fromDate: string): Promise<number> {
  try {
    const { data: records, error } = await supabase
      .from('streak_records')
      .select('date, completed')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .lte('date', fromDate)
      .order('date', { ascending: false })
      .limit(7) // Check last 7 days

    if (error || !records) {
      return 0
    }

    let consecutiveMisses = 0
    for (const record of records) {
      if (!record.completed) {
        consecutiveMisses++
      } else {
        break // Found a completed day, stop counting
      }
    }

    return consecutiveMisses
  } catch (error) {
    console.error('Error calculating consecutive misses:', error)
    return 0
  }
}

/**
 * Get scoring statistics for a user
 */
export async function getUserScoringStats(userId: string) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Get recent streak records
    const { data: streakRecords, error: streakError } = await supabase
      .from('streak_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (streakError) {
      console.error('Error fetching streak records:', streakError)
    }

    const records = streakRecords || []
    const completedDays = records.filter(r => r.completed).length
    const totalDays = records.length
    const successRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

    return {
      snapScore: profile.snap_score,
      currentStreak: profile.current_streak,
      longestStreak: profile.longest_streak,
      successRate: Math.round(successRate),
      completedDays,
      totalDays,
      recentActivity: records.slice(0, 7) // Last 7 days
    }
  } catch (error) {
    console.error('Error getting user scoring stats:', error)
    throw error
  }
}

/**
 * Get penalty configuration
 */
export function getPenaltyConfig() {
  return {
    basePenalty: 1,
    maxPenalty: 3,
    progressiveMultiplier: 1,
    streakDecrement: 1,
    description: {
      firstMiss: 'First consecutive miss: -1 point, -1 streak',
      secondMiss: 'Second consecutive miss: -2 points, -1 streak', 
      thirdMiss: 'Third+ consecutive miss: -3 points, streak stays at 0'
    }
  }
}
