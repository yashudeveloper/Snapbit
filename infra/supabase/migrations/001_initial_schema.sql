-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE habit_category AS ENUM (
      'fitness', 'nutrition', 'mindfulness', 'productivity', 
      'learning', 'social', 'creativity', 'health', 'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE snap_status AS ENUM ('pending', 'approved', 'rejected', 'low_confidence');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_confidence AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_type AS ENUM ('direct', 'group');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  snap_score INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  ghost_mode BOOLEAN DEFAULT FALSE,
  location_enabled BOOLEAN DEFAULT TRUE,
  -- Onboarding fields
  date_of_birth DATE,
  gender VARCHAR(10),
  occupation VARCHAR(100),
  location VARCHAR(200),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT display_name_length CHECK (LENGTH(display_name) >= 1),
  CONSTRAINT gender_check CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL)
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  category habit_category NOT NULL,
  custom_category VARCHAR(50),
  target_frequency INTEGER DEFAULT 1, -- times per day
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT custom_category_required CHECK (
    (category != 'custom') OR (custom_category IS NOT NULL AND LENGTH(custom_category) > 0)
  )
);

-- Snaps table
CREATE TABLE IF NOT EXISTS snaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  image_hash VARCHAR(64) NOT NULL, -- For anti-cheat
  caption TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name VARCHAR(255),
  status snap_status DEFAULT 'pending',
  ai_confidence DECIMAL(3, 2), -- 0.00 to 1.00
  ai_labels JSONB,
  ai_reason TEXT,
  manual_review_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT confidence_range CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  CONSTRAINT location_valid CHECK (
    (location_lat IS NULL AND location_lng IS NULL) OR
    (location_lat BETWEEN -90 AND 90 AND location_lng BETWEEN -180 AND 180)
  )
);

-- Streak tracking table
CREATE TABLE IF NOT EXISTS streak_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  snap_count INTEGER DEFAULT 0,
  penalty_applied INTEGER DEFAULT 0, -- negative points applied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, habit_id, date)
);

-- Friends/Following system
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status friend_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(requester_id, addressee_id),
  CONSTRAINT no_self_friend CHECK (requester_id != addressee_id)
);

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type chat_type DEFAULT 'direct',
  name VARCHAR(100), -- For group chats
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  snap_id UUID REFERENCES snaps(id) ON DELETE SET NULL, -- If message contains a snap
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'snap', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT content_or_snap CHECK (
    (content IS NOT NULL AND LENGTH(content) > 0) OR snap_id IS NOT NULL
  )
);

-- Leaderboard cache (for performance)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, all_time
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  streak INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, period)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_snap_score ON profiles(snap_score DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_snaps_user_created ON snaps(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snaps_status ON snaps(status);
CREATE INDEX IF NOT EXISTS idx_snaps_hash ON snaps(image_hash);
CREATE INDEX IF NOT EXISTS idx_streak_records_user_date ON streak_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_snap_id ON chat_messages(snap_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank ON leaderboard_cache(period, rank);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
CREATE POLICY "Users can view public profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (including during signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = id
  );

-- Allow service role to manage profiles (for backend signup)
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Habits policies
DROP POLICY IF EXISTS "Users can manage own habits" ON habits;
CREATE POLICY "Users can manage own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view friends' habits" ON habits;
CREATE POLICY "Users can view friends' habits" ON habits
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE ((requester_id = auth.uid() AND addressee_id = user_id) OR
             (requester_id = user_id AND addressee_id = auth.uid()))
      AND status = 'accepted'
    )
  );

-- Snaps policies
DROP POLICY IF EXISTS "Users can manage own snaps" ON snaps;
CREATE POLICY "Users can manage own snaps" ON snaps
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view friends' approved snaps" ON snaps;
CREATE POLICY "Users can view friends' approved snaps" ON snaps
  FOR SELECT USING (
    (auth.uid() = user_id) OR
    (status = 'approved' AND EXISTS (
      SELECT 1 FROM friendships 
      WHERE ((requester_id = auth.uid() AND addressee_id = user_id) OR
             (requester_id = user_id AND addressee_id = auth.uid()))
      AND status = 'accepted'
    ))
  );

-- Streak records policies
DROP POLICY IF EXISTS "Users can view own streak records" ON streak_records;
CREATE POLICY "Users can view own streak records" ON streak_records
  FOR ALL USING (auth.uid() = user_id);

-- Friendships policies
DROP POLICY IF EXISTS "Users can manage own friendships" ON friendships;
CREATE POLICY "Users can manage own friendships" ON friendships
  FOR ALL USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Chat policies
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chat_rooms;
CREATE POLICY "Users can view chats they participate in" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own chat participation" ON chat_participants;
CREATE POLICY "Users can view own chat participation" ON chat_participants
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view messages in their chats" ON chat_messages;
CREATE POLICY "Users can view messages in their chats" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their chats" ON chat_messages;
CREATE POLICY "Users can send messages to their chats" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- Leaderboard policies
DROP POLICY IF EXISTS "Users can view leaderboard" ON leaderboard_cache;
CREATE POLICY "Users can view leaderboard" ON leaderboard_cache
  FOR SELECT USING (true);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate streak and update score
CREATE OR REPLACE FUNCTION update_user_streak_and_score()
RETURNS TRIGGER AS $$
DECLARE
  user_streak INTEGER;
  consecutive_misses INTEGER;
  penalty INTEGER;
BEGIN
  -- Only process approved snaps
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update streak record for today
    INSERT INTO streak_records (user_id, habit_id, date, completed, snap_count)
    VALUES (NEW.user_id, NEW.habit_id, CURRENT_DATE, true, 1)
    ON CONFLICT (user_id, habit_id, date)
    DO UPDATE SET 
      completed = true,
      snap_count = streak_records.snap_count + 1;
    
    -- Calculate current streak
    SELECT COUNT(*) INTO user_streak
    FROM streak_records sr
    WHERE sr.user_id = NEW.user_id 
      AND sr.habit_id = NEW.habit_id
      AND sr.completed = true
      AND sr.date >= (
        SELECT COALESCE(MAX(date), CURRENT_DATE) 
        FROM streak_records 
        WHERE user_id = NEW.user_id 
          AND habit_id = NEW.habit_id 
          AND completed = false
      );
    
    -- Update user profile
    UPDATE profiles 
    SET 
      snap_score = snap_score + 1,
      current_streak = GREATEST(current_streak, user_streak),
      longest_streak = GREATEST(longest_streak, user_streak)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS snap_approval_trigger ON snaps;
CREATE TRIGGER snap_approval_trigger
  AFTER UPDATE ON snaps
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak_and_score();

-- Function to handle missed days and penalties
CREATE OR REPLACE FUNCTION apply_daily_penalties()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  habit_record RECORD;
  consecutive_misses INTEGER;
  penalty INTEGER;
BEGIN
  -- For each active user and habit combination
  FOR user_record IN SELECT id FROM profiles LOOP
    FOR habit_record IN SELECT id FROM habits WHERE user_id = user_record.id AND is_active = true LOOP
      
      -- Check if user missed yesterday
      IF NOT EXISTS (
        SELECT 1 FROM streak_records 
        WHERE user_id = user_record.id 
          AND habit_id = habit_record.id 
          AND date = CURRENT_DATE - INTERVAL '1 day'
          AND completed = true
      ) THEN
        
        -- Count consecutive misses
        SELECT COUNT(*) INTO consecutive_misses
        FROM streak_records
        WHERE user_id = user_record.id
          AND habit_id = habit_record.id
          AND completed = false
          AND date >= CURRENT_DATE - INTERVAL '7 days';
        
        -- Calculate penalty (progressive)
        penalty := LEAST(consecutive_misses + 1, 3);
        
        -- Insert miss record
        INSERT INTO streak_records (user_id, habit_id, date, completed, penalty_applied)
        VALUES (user_record.id, habit_record.id, CURRENT_DATE - INTERVAL '1 day', false, penalty)
        ON CONFLICT (user_id, habit_id, date) DO NOTHING;
        
        -- Apply penalty to user
        UPDATE profiles 
        SET 
          snap_score = GREATEST(0, snap_score - penalty),
          current_streak = GREATEST(0, current_streak - 1)
        WHERE id = user_record.id;
        
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure onboarding columns exist (in case table was created before these fields were added)
DO $$ 
BEGIN
  -- Add onboarding columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE profiles ADD COLUMN gender VARCHAR(10);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'occupation') THEN
    ALTER TABLE profiles ADD COLUMN occupation VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add gender constraint if it doesn't exist
  BEGIN
    ALTER TABLE profiles ADD CONSTRAINT gender_check_alt CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL);
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
