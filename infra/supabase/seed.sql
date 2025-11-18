-- Sample data for development and testing

-- Insert sample profiles (these would normally be created via Supabase Auth)
-- Note: In production, these would be created through the auth flow
INSERT INTO profiles (id, username, display_name, email, snap_score, current_streak, longest_streak) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'john_doe', 'John Doe', 'john@example.com', 150, 7, 15),
  ('550e8400-e29b-41d4-a716-446655440002', 'jane_smith', 'Jane Smith', 'jane@example.com', 89, 3, 12),
  ('550e8400-e29b-41d4-a716-446655440003', 'mike_wilson', 'Mike Wilson', 'mike@example.com', 234, 12, 20),
  ('550e8400-e29b-41d4-a716-446655440004', 'sarah_jones', 'Sarah Jones', 'sarah@example.com', 67, 1, 8),
  ('550e8400-e29b-41d4-a716-446655440005', 'alex_brown', 'Alex Brown', 'alex@example.com', 312, 25, 25);

-- Insert sample habits
INSERT INTO habits (id, user_id, title, description, category, target_frequency) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Morning Workout', 'Daily exercise routine', 'fitness', 1),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Healthy Breakfast', 'Nutritious morning meal', 'nutrition', 1),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Meditation', '10 minutes daily meditation', 'mindfulness', 1),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Reading', 'Read for 30 minutes', 'learning', 1),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'Water Intake', 'Drink 8 glasses of water', 'health', 1),
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'Code Practice', 'Daily coding practice', 'productivity', 1),
  ('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', 'Yoga', 'Morning yoga session', 'fitness', 1),
  ('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005', 'Journaling', 'Daily reflection writing', 'mindfulness', 1);

-- Insert sample snaps
INSERT INTO snaps (id, user_id, habit_id, image_url, image_hash, caption, status, ai_confidence, ai_labels, ai_reason) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 
   'https://example.com/snap1.jpg', 'hash1234567890abcdef', 'Morning run complete! 🏃‍♂️', 'approved', 0.92, 
   '["person", "running", "outdoors", "exercise"]', 'High confidence detection of running activity'),
  
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', 
   'https://example.com/snap2.jpg', 'hash2345678901bcdefg', 'Peaceful meditation session 🧘‍♀️', 'approved', 0.88, 
   '["person", "meditation", "sitting", "peaceful"]', 'Clear meditation posture detected'),
   
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440005', 
   'https://example.com/snap3.jpg', 'hash3456789012cdefgh', 'Staying hydrated! 💧', 'approved', 0.85, 
   '["water", "glass", "drink", "hydration"]', 'Water consumption clearly visible'),
   
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440007', 
   'https://example.com/snap4.jpg', 'hash4567890123defghi', 'Morning yoga flow ✨', 'low_confidence', 0.65, 
   '["person", "stretching", "mat"]', 'Possible yoga activity but unclear positioning'),
   
  ('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440008', 
   'https://example.com/snap5.jpg', 'hash5678901234efghij', 'Daily reflection time 📝', 'approved', 0.91, 
   '["notebook", "writing", "pen", "journal"]', 'Clear journaling activity detected');

-- Insert sample streak records
INSERT INTO streak_records (user_id, habit_id, date, completed, snap_count) VALUES
  -- John's workout streak (7 days)
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '6 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '5 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '4 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '3 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '2 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '1 day', true, 1),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, true, 1),
  
  -- Jane's meditation streak (3 days)
  ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE - INTERVAL '2 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE - INTERVAL '1 day', true, 1),
  ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE, true, 1),
  
  -- Mike's coding streak (12 days) - showing last 7 days
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '6 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '5 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '4 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '3 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '2 days', true, 1),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '1 day', true, 1),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', CURRENT_DATE, true, 1);

-- Insert sample friendships
INSERT INTO friendships (requester_id, addressee_id, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'accepted'),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'accepted'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'accepted'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'pending'),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'accepted'),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'accepted');

-- Insert sample chat rooms
INSERT INTO chat_rooms (id, type, created_by) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', 'direct', '550e8400-e29b-41d4-a716-446655440001'),
  ('880e8400-e29b-41d4-a716-446655440002', 'direct', '550e8400-e29b-41d4-a716-446655440002'),
  ('880e8400-e29b-41d4-a716-446655440003', 'group', '550e8400-e29b-41d4-a716-446655440003');

-- Insert chat participants
INSERT INTO chat_participants (room_id, user_id) VALUES
  -- Direct chat between John and Jane
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001'),
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'),
  
  -- Direct chat between Jane and Mike
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002'),
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'),
  
  -- Group chat
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003'),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005');

-- Insert sample chat messages
INSERT INTO chat_messages (room_id, sender_id, content, message_type) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Hey Jane! How''s your meditation streak going?', 'text'),
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Going great! Just hit day 3. Your workout routine is inspiring! 💪', 'text'),
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Thanks! Let''s keep each other motivated 🔥', 'text'),
  
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Mike, your coding streak is incredible!', 'text'),
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Thanks Jane! Consistency is key 👨‍💻', 'text'),
  
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Welcome to the fitness group everyone!', 'text'),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'Excited to be here! 🏃‍♀️', 'text'),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'Let''s crush our goals together! 💯', 'text');

-- Insert sample leaderboard cache
INSERT INTO leaderboard_cache (user_id, period, rank, score, streak) VALUES
  -- Daily leaderboard
  ('550e8400-e29b-41d4-a716-446655440005', 'daily', 1, 312, 25),
  ('550e8400-e29b-41d4-a716-446655440003', 'daily', 2, 234, 12),
  ('550e8400-e29b-41d4-a716-446655440001', 'daily', 3, 150, 7),
  ('550e8400-e29b-41d4-a716-446655440002', 'daily', 4, 89, 3),
  ('550e8400-e29b-41d4-a716-446655440004', 'daily', 5, 67, 1),
  
  -- Weekly leaderboard
  ('550e8400-e29b-41d4-a716-446655440005', 'weekly', 1, 312, 25),
  ('550e8400-e29b-41d4-a716-446655440003', 'weekly', 2, 234, 12),
  ('550e8400-e29b-41d4-a716-446655440001', 'weekly', 3, 150, 7),
  ('550e8400-e29b-41d4-a716-446655440002', 'weekly', 4, 89, 3),
  ('550e8400-e29b-41d4-a716-446655440004', 'weekly', 5, 67, 1),
  
  -- All time leaderboard
  ('550e8400-e29b-41d4-a716-446655440005', 'all_time', 1, 312, 25),
  ('550e8400-e29b-41d4-a716-446655440003', 'all_time', 2, 234, 20),
  ('550e8400-e29b-41d4-a716-446655440001', 'all_time', 3, 150, 15),
  ('550e8400-e29b-41d4-a716-446655440002', 'all_time', 4, 89, 12),
  ('550e8400-e29b-41d4-a716-446655440004', 'all_time', 5, 67, 8);
