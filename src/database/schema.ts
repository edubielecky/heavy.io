export const CREATE_TABLES_SQL = `
-- Tabela de Exercícios (Catálogo Seed + Customizados do Usuário)
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  target_muscle TEXT NOT NULL,
  synergist_muscles TEXT NOT NULL DEFAULT '[]',
  movement_pattern TEXT NOT NULL,
  mechanic TEXT NOT NULL,
  equipment TEXT NOT NULL,
  plane_of_motion TEXT,
  default_rest_seconds INTEGER NOT NULL DEFAULT 90,
  is_custom INTEGER NOT NULL DEFAULT 0,
  instructions TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercises_target_muscle ON exercises(target_muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

-- Tabela de Fichas/Programas de Treino (Ex: "Ciclo de Força 3x", "Treino de Férias", "PPL")
CREATE TABLE IF NOT EXISTS workout_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_programs_active ON workout_programs(is_active);

-- Tabela de Rotinas/Dias de Treino (Pré-definidas do Sistema ou Criadas pelo Usuário)
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  program_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (program_id) REFERENCES workout_programs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_routines_program ON routines(program_id);

-- Exercícios Mapeados em Cada Rotina
CREATE TABLE IF NOT EXISTS routine_exercises (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps_min INTEGER NOT NULL DEFAULT 8,
  target_reps_max INTEGER NOT NULL DEFAULT 12,
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  notes TEXT,
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routine_id);

-- Sessões de Treino Registradas (Histórico)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  routine_id TEXT,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_volume_kg REAL NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  avg_heart_rate INTEGER,
  peak_heart_rate INTEGER,
  active_calories INTEGER,
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_start_time ON workout_sessions(start_time DESC);

-- Exercícios Executados na Sessão de Treino
CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON workout_session_exercises(session_id);

-- Séries Individuais de Cada Exercício
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal',
  weight_kg REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe REAL,
  rir INTEGER,
  peak_bpm INTEGER,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session_exercise ON workout_sets(session_exercise_id);

-- Hall de Recordes Pessoais (PRs)
CREATE TABLE IF NOT EXISTS personal_records (
  exercise_id TEXT PRIMARY KEY,
  exercise_name TEXT NOT NULL,
  max_weight_kg REAL NOT NULL,
  reps_at_max_weight INTEGER NOT NULL,
  estimated_1rm REAL NOT NULL,
  achieved_session_id TEXT,
  achieved_at TEXT NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Fila de Sincronização Local (Offline Sync Queue)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'workout_session',
  entity_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at ASC);

-- Tabela de Resiliência de Sessão Ativa (Crash Recovery & Hydration)
CREATE TABLE IF NOT EXISTS active_session_draft (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
