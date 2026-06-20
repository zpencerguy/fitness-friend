ALTER TABLE moves
  DROP CONSTRAINT IF EXISTS moves_name_key;

ALTER TABLE moves
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

CREATE INDEX IF NOT EXISTS moves_user_id_idx ON moves(user_id);
CREATE INDEX IF NOT EXISTS moves_visibility_idx ON moves(visibility);
CREATE UNIQUE INDEX IF NOT EXISTS moves_user_name_unique_idx
  ON moves(user_id, lower(name))
  WHERE user_id IS NOT NULL;

ALTER TABLE completed_workouts
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT NOT NULL DEFAULT 'build_muscle',
  level TEXT NOT NULL DEFAULT 'beginner',
  duration_weeks INTEGER NOT NULL DEFAULT 1,
  weekly_workouts INTEGER NOT NULL DEFAULT 3,
  equipment TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS programs_user_id_idx ON programs(user_id);
CREATE INDEX IF NOT EXISTS programs_visibility_idx ON programs(visibility);

CREATE TABLE IF NOT EXISTS program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  workout_name TEXT NOT NULL,
  focus TEXT NOT NULL DEFAULT 'Full body',
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, position)
);

CREATE INDEX IF NOT EXISTS program_days_program_id_idx ON program_days(program_id);
