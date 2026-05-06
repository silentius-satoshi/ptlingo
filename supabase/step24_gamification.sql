-- Step 24: Gamification Layer
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_gamification (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users ON DELETE CASCADE UNIQUE,

  -- Core economy
  xp               integer DEFAULT 0,
  level            integer DEFAULT 1,
  streak           integer DEFAULT 0,
  longest_streak   integer DEFAULT 0,
  last_activity_date date,

  -- Hearts (reset to 5 each day)
  hearts           integer DEFAULT 5,
  hearts_last_reset date,

  -- Subject mastery: { "Musculoskeletal": 76, "Neuromuscular": 52, ... }
  subject_mastery  jsonb DEFAULT '{}',

  -- Daily missions object (see app for structure)
  daily_missions   jsonb DEFAULT '{}',

  -- Achievement ids earned
  achievements     jsonb DEFAULT '[]',

  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gamification"
  ON user_gamification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
  ON user_gamification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON user_gamification FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_gamification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gamification_updated_at
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_gamification_timestamp();
