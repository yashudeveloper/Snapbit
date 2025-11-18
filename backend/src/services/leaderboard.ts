import { supabase } from '../config/supabase'

export interface LeaderboardEntry {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string
  rank: number
  score: number
  streak: number
  period: 'daily' | 'weekly' | 'monthly' | 'all_time'
}

/**
 * Update leaderboard cache for all periods
 */
export async function updateLeaderboardCache(): Promise<void> {
  try {
    await Promise.all([
      updatePeriodLeaderboard('daily'),
      updatePeriodLeaderboard('weekly'),
      updatePeriodLeaderboard('monthly'),
      updatePeriodLeaderboard('all_time')
    ])
    
    console.log('Leaderboard cache updated successfully')
  } catch (error) {
    console.error('Error updating leaderboard cache:', error)
    throw error
  }
}

/**
 * Update leaderboard for a specific period
 */
async function updatePeriodLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time'): Promise<void> {
  try {
    // Calculate date range for the period
    const dateRange = getDateRangeForPeriod(period)
    
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, snap_score, current_streak')
      .order('snap_score', { ascending: false })
      .limit(100) // Top 100 users

    // For time-based periods, we might want to calculate scores within that period
    // For now, we'll use the total snap_score for all periods
    const { data: users, error } = await query

    if (error) {
      throw error
    }

    if (!users || users.length === 0) {
      return
    }

    // Clear existing cache for this period
    await supabase
      .from('leaderboard_cache')
      .delete()
      .eq('period', period)

    // Insert new leaderboard entries
    const leaderboardEntries = users.map((user, index) => ({
      user_id: user.id,
      period,
      rank: index + 1,
      score: user.snap_score,
      streak: user.current_streak,
      updated_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('leaderboard_cache')
      .insert(leaderboardEntries)

    if (insertError) {
      throw insertError
    }

    console.log(`Updated ${period} leaderboard with ${users.length} entries`)
  } catch (error) {
    console.error(`Error updating ${period} leaderboard:`, error)
    throw error
  }
}

/**
 * Get leaderboard for a specific period
 */
export async function getLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select(`
        user_id,
        rank,
        score,
        streak,
        period,
        profiles!leaderboard_cache_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('period', period)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return (data || []).map(entry => ({
      userId: entry.user_id,
      username: entry.profiles?.username || 'unknown',
      displayName: entry.profiles?.display_name || 'Unknown User',
      avatarUrl: entry.profiles?.avatar_url,
      rank: entry.rank,
      score: entry.score,
      streak: entry.streak,
      period: entry.period as any
    }))
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    throw error
  }
}

/**
 * Get user's position in leaderboard
 */
export async function getUserLeaderboardPosition(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'all_time'
): Promise<LeaderboardEntry | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select(`
        user_id,
        rank,
        score,
        streak,
        period,
        profiles!leaderboard_cache_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('period', period)
      .single()

    if (error || !data) {
      return null
    }

    return {
      userId: data.user_id,
      username: data.profiles?.username || 'unknown',
      displayName: data.profiles?.display_name || 'Unknown User',
      avatarUrl: data.profiles?.avatar_url,
      rank: data.rank,
      score: data.score,
      streak: data.streak,
      period: data.period as any
    }
  } catch (error) {
    console.error('Error fetching user leaderboard position:', error)
    return null
  }
}

/**
 * Get leaderboard with user's position highlighted
 */
export async function getLeaderboardWithUserPosition(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  topCount: number = 10
): Promise<{
  topUsers: LeaderboardEntry[]
  userPosition: LeaderboardEntry | null
  totalUsers: number
}> {
  try {
    // Get top users
    const topUsers = await getLeaderboard(period, topCount)
    
    // Get user's position
    const userPosition = await getUserLeaderboardPosition(userId, period)
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('leaderboard_cache')
      .select('*', { count: 'exact', head: true })
      .eq('period', period)

    if (countError) {
      console.error('Error getting leaderboard count:', countError)
    }

    return {
      topUsers,
      userPosition,
      totalUsers: count || 0
    }
  } catch (error) {
    console.error('Error getting leaderboard with user position:', error)
    throw error
  }
}

/**
 * Get date range for leaderboard period
 */
function getDateRangeForPeriod(period: 'daily' | 'weekly' | 'monthly' | 'all_time'): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date()
  
  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0)
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      start.setDate(now.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
      break
    case 'monthly':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'all_time':
      start.setFullYear(2020, 0, 1) // Arbitrary start date
      break
  }
  
  return { start, end: now }
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats() {
  try {
    const { data: stats, error } = await supabase
      .from('leaderboard_cache')
      .select('period')
      .eq('period', 'all_time')

    if (error) {
      throw error
    }

    const totalUsers = stats?.length || 0
    
    // Get top scorer
    const { data: topScorer, error: topError } = await supabase
      .from('leaderboard_cache')
      .select(`
        score,
        profiles!leaderboard_cache_user_id_fkey (
          display_name
        )
      `)
      .eq('period', 'all_time')
      .eq('rank', 1)
      .single()

    if (topError) {
      console.error('Error getting top scorer:', topError)
    }

    return {
      totalUsers,
      topScore: topScorer?.score || 0,
      topScorer: topScorer?.profiles?.display_name || 'Unknown',
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error getting leaderboard stats:', error)
    throw error
  }
}
