CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject TEXT UNIQUE,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  display_name TEXT,
  goal TEXT NOT NULL DEFAULT 'build_muscle',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  preferred_session_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  detail TEXT,
  selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS equipment_user_id_idx ON equipment(user_id);

CREATE TABLE IF NOT EXISTS moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  pattern TEXT NOT NULL,
  equipment_category TEXT,
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  cue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'custom',
  cycles INTEGER NOT NULL DEFAULT 1,
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_templates_user_id_idx ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS workout_templates_visibility_idx ON workout_templates(visibility);

CREATE TABLE IF NOT EXISTS template_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  move_id UUID REFERENCES moves(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  move_name TEXT NOT NULL,
  target TEXT NOT NULL,
  pattern TEXT NOT NULL,
  cue TEXT,
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, position)
);

CREATE INDEX IF NOT EXISTS template_moves_template_id_idx ON template_moves(template_id);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS planned_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  weekly_plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  focus TEXT NOT NULL,
  planned_rounds INTEGER NOT NULL,
  planned_duration_seconds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  completed_workout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planned_workouts_user_date_idx ON planned_workouts(user_id, planned_date);

CREATE TABLE IF NOT EXISTS completed_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  planned_workout_id UUID REFERENCES planned_workouts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'EMOM',
  rounds INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  planned_duration_seconds INTEGER NOT NULL,
  work_seconds_per_round INTEGER NOT NULL DEFAULT 30,
  rest_seconds_per_round INTEGER NOT NULL DEFAULT 30,
  tags TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS completed_workouts_user_completed_at_idx ON completed_workouts(user_id, completed_at DESC);

ALTER TABLE planned_workouts
  ADD CONSTRAINT planned_workouts_completed_workout_fk
  FOREIGN KEY (completed_workout_id)
  REFERENCES completed_workouts(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS completed_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_workout_id UUID NOT NULL REFERENCES completed_workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  move_id UUID REFERENCES moves(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  move_name TEXT NOT NULL,
  pattern TEXT,
  target TEXT,
  weight_value NUMERIC,
  weight_unit TEXT DEFAULT 'lb',
  reps_completed INTEGER,
  difficulty INTEGER,
  notes TEXT,
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS completed_movements_workout_id_idx ON completed_movements(completed_workout_id);
CREATE INDEX IF NOT EXISTS completed_movements_user_id_idx ON completed_movements(user_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subscription_id TEXT,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS entitlements (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
