-- ============================================
-- FRIEND STREAKS SYSTEM
-- Track snap streaks between friends
-- ============================================

-- Create friend_streaks table
CREATE TABLE IF NOT EXISTS friend_streaks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_snap_user1_at TIMESTAMP WITH TIME ZONE,
  last_snap_user2_at TIMESTAMP WITH TIME ZONE,
  streak_started_at TIMESTAMP WITH TIME ZONE,
  streak_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user1_id < user2_id to avoid duplicates
  CONSTRAINT user_order CHECK (user1_id < user2_id),
  CONSTRAINT unique_friendship UNIQUE (user1_id, user2_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_friend_streaks_user1 ON friend_streaks(user1_id);
CREATE INDEX IF NOT EXISTS idx_friend_streaks_user2 ON friend_streaks(user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_streaks_expires ON friend_streaks(streak_expires_at);

-- Enable RLS
ALTER TABLE friend_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own streaks" ON friend_streaks;
CREATE POLICY "Users can view their own streaks" ON friend_streaks
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

DROP POLICY IF EXISTS "Service role can manage streaks" ON friend_streaks;
CREATE POLICY "Service role can manage streaks" ON friend_streaks
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function to get or create streak record
CREATE OR REPLACE FUNCTION get_or_create_streak(uid1 UUID, uid2 UUID)
RETURNS UUID AS $$
DECLARE
  streak_id UUID;
  ordered_user1 UUID;
  ordered_user2 UUID;
BEGIN
  -- Ensure user1 < user2 for consistency
  IF uid1 < uid2 THEN
    ordered_user1 := uid1;
    ordered_user2 := uid2;
  ELSE
    ordered_user1 := uid2;
    ordered_user2 := uid1;
  END IF;
  
  -- Try to find existing streak
  SELECT id INTO streak_id
  FROM friend_streaks
  WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
  
  -- Create if doesn't exist
  IF streak_id IS NULL THEN
    INSERT INTO friend_streaks (user1_id, user2_id, current_streak, longest_streak)
    VALUES (ordered_user1, ordered_user2, 0, 0)
    RETURNING id INTO streak_id;
  END IF;
  
  RETURN streak_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak when snap is sent
CREATE OR REPLACE FUNCTION update_friend_streak(sender_id UUID, receiver_id UUID)
RETURNS TABLE(
  streak_id UUID,
  current_streak INTEGER,
  longest_streak INTEGER,
  streak_increased BOOLEAN
) AS $$
DECLARE
  ordered_user1 UUID;
  ordered_user2 UUID;
  is_user1 BOOLEAN;
  existing_streak RECORD;
  new_current_streak INTEGER;
  new_longest_streak INTEGER;
  streak_increased BOOLEAN := FALSE;
  now_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Ensure user1 < user2 for consistency
  IF sender_id < receiver_id THEN
    ordered_user1 := sender_id;
    ordered_user2 := receiver_id;
    is_user1 := TRUE;
  ELSE
    ordered_user1 := receiver_id;
    ordered_user2 := sender_id;
    is_user1 := FALSE;
  END IF;
  
  -- Get or create streak record
  SELECT * INTO existing_streak
  FROM friend_streaks
  WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
  
  IF existing_streak IS NULL THEN
    -- Create new streak record
    INSERT INTO friend_streaks (
      user1_id, user2_id, current_streak, longest_streak,
      last_snap_user1_at, last_snap_user2_at,
      streak_expires_at
    )
    VALUES (
      ordered_user1, ordered_user2, 0, 0,
      CASE WHEN is_user1 THEN now_time ELSE NULL END,
      CASE WHEN is_user1 THEN NULL ELSE now_time END,
      now_time + INTERVAL '24 hours'
    )
    RETURNING id, current_streak, longest_streak INTO existing_streak;
    
    RETURN QUERY SELECT existing_streak.id, existing_streak.current_streak, existing_streak.longest_streak, FALSE;
    RETURN;
  END IF;
  
  -- Check if streak is expired (both users haven't snapped in 24 hours)
  IF existing_streak.streak_expires_at IS NOT NULL AND existing_streak.streak_expires_at < now_time THEN
    -- Streak expired, reset to 0
    new_current_streak := 0;
    new_longest_streak := existing_streak.longest_streak;
    
    UPDATE friend_streaks
    SET 
      current_streak = 0,
      last_snap_user1_at = CASE WHEN is_user1 THEN now_time ELSE NULL END,
      last_snap_user2_at = CASE WHEN is_user1 THEN NULL ELSE now_time END,
      streak_expires_at = now_time + INTERVAL '24 hours',
      updated_at = now_time
    WHERE id = existing_streak.id;
    
    RETURN QUERY SELECT existing_streak.id, new_current_streak, new_longest_streak, FALSE;
    RETURN;
  END IF;
  
  -- Update last snap time for sender
  IF is_user1 THEN
    -- Check if both users have snapped within 24 hours
    IF existing_streak.last_snap_user2_at IS NOT NULL AND 
       existing_streak.last_snap_user2_at > (now_time - INTERVAL '24 hours') THEN
      -- Both snapped! Increase streak
      new_current_streak := existing_streak.current_streak + 1;
      new_longest_streak := GREATEST(existing_streak.longest_streak, new_current_streak);
      streak_increased := TRUE;
      
      UPDATE friend_streaks
      SET 
        current_streak = new_current_streak,
        longest_streak = new_longest_streak,
        last_snap_user1_at = now_time,
        last_snap_user2_at = NULL, -- Reset for next cycle
        streak_started_at = COALESCE(streak_started_at, now_time),
        streak_expires_at = now_time + INTERVAL '24 hours',
        updated_at = now_time
      WHERE id = existing_streak.id;
    ELSE
      -- User1 snapped, waiting for user2
      new_current_streak := existing_streak.current_streak;
      new_longest_streak := existing_streak.longest_streak;
      
      UPDATE friend_streaks
      SET 
        last_snap_user1_at = now_time,
        streak_expires_at = now_time + INTERVAL '24 hours',
        updated_at = now_time
      WHERE id = existing_streak.id;
    END IF;
  ELSE
    -- is_user2
    IF existing_streak.last_snap_user1_at IS NOT NULL AND 
       existing_streak.last_snap_user1_at > (now_time - INTERVAL '24 hours') THEN
      -- Both snapped! Increase streak
      new_current_streak := existing_streak.current_streak + 1;
      new_longest_streak := GREATEST(existing_streak.longest_streak, new_current_streak);
      streak_increased := TRUE;
      
      UPDATE friend_streaks
      SET 
        current_streak = new_current_streak,
        longest_streak = new_longest_streak,
        last_snap_user1_at = NULL, -- Reset for next cycle
        last_snap_user2_at = now_time,
        streak_started_at = COALESCE(streak_started_at, now_time),
        streak_expires_at = now_time + INTERVAL '24 hours',
        updated_at = now_time
      WHERE id = existing_streak.id;
    ELSE
      -- User2 snapped, waiting for user1
      new_current_streak := existing_streak.current_streak;
      new_longest_streak := existing_streak.longest_streak;
      
      UPDATE friend_streaks
      SET 
        last_snap_user2_at = now_time,
        streak_expires_at = now_time + INTERVAL '24 hours',
        updated_at = now_time
      WHERE id = existing_streak.id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT existing_streak.id, new_current_streak, new_longest_streak, streak_increased;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_streak(UUID, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION update_friend_streak(UUID, UUID) TO authenticated, service_role, anon;

-- Function to check expired streaks (run daily via cron)
CREATE OR REPLACE FUNCTION check_expired_streaks()
RETURNS void AS $$
BEGIN
  UPDATE friend_streaks
  SET 
    current_streak = 0,
    last_snap_user1_at = NULL,
    last_snap_user2_at = NULL,
    updated_at = NOW()
  WHERE 
    streak_expires_at < NOW() 
    AND current_streak > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Friend streaks system created!' as status;

