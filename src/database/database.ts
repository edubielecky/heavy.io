import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { SEED_EXERCISES } from './seedData';
import { 
  Exercise, 
  MuscleGroup, 
  Equipment, 
  MovementPattern, 
  ExerciseMechanic,
  PlaneOfMotion,
  Routine, 
  WorkoutSession, 
  PersonalRecord,
  WorkoutExercise,
  WorkoutSet,
  SetType,
  LastExercisePerformance
} from '../types/workout';

const DB_NAME = 'heavy_io.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    // Configurações de alta performance e integridade referencial
    dbInstance.execSync('PRAGMA journal_mode = WAL;');
    dbInstance.execSync('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
};

// Conversor de linha do banco SQLite para o tipo Exercise
const rowToExercise = (row: any): Exercise => ({
  id: row.id,
  name: row.name,
  nameEn: row.name_en || undefined,
  targetMuscle: row.target_muscle as MuscleGroup,
  synergistMuscles: JSON.parse(row.synergist_muscles || '[]'),
  movementPattern: row.movement_pattern as MovementPattern,
  mechanic: row.mechanic as ExerciseMechanic,
  equipment: row.equipment as Equipment,
  planeOfMotion: (row.plane_of_motion || undefined) as PlaneOfMotion | undefined,
  defaultRestSeconds: row.default_rest_seconds,
  isCustom: row.is_custom === 1,
  instructions: row.instructions || undefined,
  createdAt: row.created_at,
});

/**
 * Inicialização e Migração do Banco de Dados no Boot
 */
export const initDatabase = (): void => {
  const db = getDatabase();

  // 1. Cria todas as tabelas e índices
  db.execSync(CREATE_TABLES_SQL);

  // 2. Verifica se a seed de exercícios já foi executada
  const countRow = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises;'
  );

  if (!countRow || countRow.count === 0) {
    // Executa a carga inicial em bloco de transação única para inserção instantânea
    db.withTransactionSync(() => {
      const stmt = db.prepareSync(
        `INSERT OR REPLACE INTO exercises (
          id, name, name_en, target_muscle, synergist_muscles, 
          movement_pattern, mechanic, equipment, plane_of_motion, 
          default_rest_seconds, is_custom, instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );

      try {
        for (const ex of SEED_EXERCISES) {
          stmt.executeSync([
            ex.id,
            ex.name,
            ex.nameEn || null,
            ex.targetMuscle,
            JSON.stringify(ex.synergistMuscles),
            ex.movementPattern,
            ex.mechanic,
            ex.equipment,
            ex.planeOfMotion || null,
            ex.defaultRestSeconds,
            0, // is_custom = 0
            ex.instructions || null,
          ]);
        }
      } finally {
        stmt.finalizeSync();
      }
    });
  }

  // 3. Cria rotinas padrão caso não existam
  const routineCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM routines;'
  );

  if (!routineCount || routineCount.count === 0) {
    seedDefaultRoutines(db);
  }
};

const seedDefaultRoutines = (db: SQLite.SQLiteDatabase) => {
  const routinesData = [
    {
      id: 'routine_push_a',
      name: 'Push A (Peito, Ombros & Tríceps)',
      description: 'Foco em força no supino reto, desenvolvimento e trabalho acessório de tríceps.',
      exercises: [
        { exerciseId: 'barbell_bench_press', sets: 4, minReps: 6, maxReps: 8, rest: 120 },
        { exerciseId: 'incline_dumbbell_bench_press', sets: 3, minReps: 8, maxReps: 10, rest: 90 },
        { exerciseId: 'overhead_press_barbell_standing', sets: 3, minReps: 6, maxReps: 8, rest: 120 },
        { exerciseId: 'dumbbell_lateral_raise_standing', sets: 4, minReps: 12, maxReps: 15, rest: 60 },
        { exerciseId: 'close_grip_bench_press', sets: 3, minReps: 8, maxReps: 10, rest: 90 },
        { exerciseId: 'cable_triceps_pushdown_rope', sets: 3, minReps: 10, maxReps: 12, rest: 60 },
      ],
    },
    {
      id: 'routine_pull_a',
      name: 'Pull A (Costas, Dorsal & Bíceps)',
      description: 'Foco em força no levantamento terra, puxada vertical e remadas densas.',
      exercises: [
        { exerciseId: 'deadlift_conventional', sets: 3, minReps: 5, maxReps: 5, rest: 180 },
        { exerciseId: 'pull_up_pronated', sets: 4, minReps: 6, maxReps: 10, rest: 120 },
        { exerciseId: 'barbell_bent_over_row', sets: 4, minReps: 8, maxReps: 10, rest: 120 },
        { exerciseId: 'cable_face_pull', sets: 3, minReps: 12, maxReps: 15, rest: 60 },
        { exerciseId: 'ez_bar_curl', sets: 3, minReps: 8, maxReps: 10, rest: 90 },
        { exerciseId: 'hammer_curl_dumbbells', sets: 3, minReps: 10, maxReps: 12, rest: 60 },
      ],
    },
    {
      id: 'routine_legs_a',
      name: 'Legs A (Agachamento & Cadeia Posterior)',
      description: 'Construção de base de força em agachamento, RDL e extensão/flexão de joelhos.',
      exercises: [
        { exerciseId: 'barbell_back_squat_high_bar', sets: 4, minReps: 6, maxReps: 8, rest: 180 },
        { exerciseId: 'romanian_deadlift_barbell', sets: 3, minReps: 8, maxReps: 10, rest: 120 },
        { exerciseId: 'leg_press_45_degree', sets: 3, minReps: 10, maxReps: 12, rest: 120 },
        { exerciseId: 'seated_leg_curl_machine', sets: 3, minReps: 10, maxReps: 12, rest: 60 },
        { exerciseId: 'standing_calf_raise_machine', sets: 4, minReps: 12, maxReps: 15, rest: 60 },
      ],
    },
  ];

  db.withTransactionSync(() => {
    for (const r of routinesData) {
      db.runSync(
        'INSERT OR REPLACE INTO routines (id, name, description, is_system) VALUES (?, ?, ?, 1);',
        [r.id, r.name, r.description]
      );

      r.exercises.forEach((ex, idx) => {
        db.runSync(
          `INSERT OR REPLACE INTO routine_exercises (
            id, routine_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `${r.id}_ex_${idx}`,
            r.id,
            ex.exerciseId,
            idx,
            ex.sets,
            ex.minReps,
            ex.maxReps,
            ex.rest,
          ]
        );
      });
    }
  });
};

/**
 * CONSULTAS DE EXERCÍCIOS
 */
export const getExercises = (options?: {
  targetMuscle?: MuscleGroup | 'todos';
  equipment?: Equipment | 'todos';
  search?: string;
  limit?: number;
}): Exercise[] => {
  const db = getDatabase();
  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params: any[] = [];

  if (options?.targetMuscle && options.targetMuscle !== 'todos') {
    query += ' AND target_muscle = ?';
    params.push(options.targetMuscle);
  }

  if (options?.equipment && options.equipment !== 'todos') {
    query += ' AND equipment = ?';
    params.push(options.equipment);
  }

  if (options?.search && options.search.trim().length > 0) {
    query += ' AND (name LIKE ? OR name_en LIKE ?)';
    const term = `%${options.search.trim()}%`;
    params.push(term, term);
  }

  query += ' ORDER BY is_custom DESC, name ASC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const rows = db.getAllSync(query, params);
  return rows.map(rowToExercise);
};

export interface ExerciseProgressPoint {
  sessionId: string;
  sessionName: string;
  date: string;
  maxWeightKg: number;
  estimated1RM: number;
  bestSetReps: number;
  totalSets: number;
  totalVolumeKg: number;
  sets: {
    setNumber: number;
    weightKg: number;
    reps: number;
    completed: boolean;
  }[];
}

/**
 * Consulta a evolução cronológica de carga máxima e 1RM estimado de um exercício
 */
export const getExerciseProgressHistory = (exerciseId: string): ExerciseProgressPoint[] => {
  const db = getDatabase();

  const sessions = db.getAllSync<{
    session_id: string;
    session_name: string;
    start_time: string;
    session_exercise_id: string;
  }>(
    `SELECT ws.id as session_id, ws.name as session_name, ws.start_time, wse.id as session_exercise_id
     FROM workout_sessions ws
     JOIN workout_session_exercises wse ON ws.id = wse.session_id
     WHERE wse.exercise_id = ? AND ws.is_completed = 1
     ORDER BY ws.start_time ASC;`,
    [exerciseId]
  );

  return sessions.map(s => {
    const setRows = db.getAllSync<any>(
      `SELECT set_number, weight_kg, reps, completed 
       FROM workout_sets 
       WHERE session_exercise_id = ? AND completed = 1
       ORDER BY set_number ASC;`,
      [s.session_exercise_id]
    );

    let maxWeight = 0;
    let best1RM = 0;
    let bestReps = 0;
    let totalVol = 0;

    const sets = setRows.map(st => {
      const w = st.weight_kg;
      const r = st.reps;
      totalVol += w * r;
      if (w > maxWeight) {
        maxWeight = w;
        bestReps = r;
      }
      const est1RM = w > 0 && r > 0 ? w * (1 + r / 30) : 0;
      if (est1RM > best1RM) {
        best1RM = Math.round(est1RM * 10) / 10;
      }
      return {
        setNumber: st.set_number,
        weightKg: w,
        reps: r,
        completed: st.completed === 1,
      };
    });

    return {
      sessionId: s.session_id,
      sessionName: s.session_name,
      date: s.start_time,
      maxWeightKg: maxWeight,
      estimated1RM: best1RM,
      bestSetReps: bestReps,
      totalSets: setRows.length,
      totalVolumeKg: totalVol,
      sets,
    };
  });
};

export const getExerciseById = (id: string): Exercise | null => {
  const db = getDatabase();
  const row = db.getFirstSync('SELECT * FROM exercises WHERE id = ?;', [id]);
  return row ? rowToExercise(row) : null;
};

export const createCustomExercise = (
  exercise: Omit<Exercise, 'isCustom' | 'createdAt'>
): Exercise => {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.runSync(
    `INSERT INTO exercises (
      id, name, name_en, target_muscle, synergist_muscles, 
      movement_pattern, mechanic, equipment, plane_of_motion, 
      default_rest_seconds, is_custom, instructions, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
    [
      exercise.id,
      exercise.name,
      exercise.nameEn || null,
      exercise.targetMuscle,
      JSON.stringify(exercise.synergistMuscles),
      exercise.movementPattern,
      exercise.mechanic,
      exercise.equipment,
      exercise.planeOfMotion || null,
      exercise.defaultRestSeconds,
      exercise.instructions || null,
      now,
    ]
  );

  return {
    ...exercise,
    isCustom: true,
    createdAt: now,
  };
};

/**
 * CONSULTAS DE ROTINAS
 */
export const getRoutines = (): Routine[] => {
  const db = getDatabase();
  const routinesRows = db.getAllSync<any>(
    'SELECT * FROM routines ORDER BY is_system DESC, name ASC;'
  );

  return routinesRows.map(r => {
    const exRows = db.getAllSync<any>(
      `SELECT re.*, e.name as exercise_name, e.target_muscle 
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = ?
       ORDER BY re.order_index ASC;`,
      [r.id]
    );

    return {
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      isSystem: r.is_system === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      exercises: exRows.map(e => ({
        id: e.id,
        exerciseId: e.exercise_id,
        exerciseName: e.exercise_name,
        targetMuscle: e.target_muscle as MuscleGroup,
        orderIndex: e.order_index,
        targetSets: e.target_sets,
        targetRepsMin: e.target_reps_min,
        targetRepsMax: e.target_reps_max,
        restSeconds: e.rest_seconds,
        notes: e.notes || undefined,
      })),
    };
  });
};

export const saveRoutine = (
  routine: Omit<Routine, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
): Routine => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const createdAt = routine.createdAt || now;
  const updatedAt = now;

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT OR REPLACE INTO routines (id, name, description, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        routine.id,
        routine.name,
        routine.description || null,
        routine.isSystem ? 1 : 0,
        createdAt,
        updatedAt,
      ]
    );

    // Remove exercícios existentes da rotina para sincronizar a lista
    db.runSync('DELETE FROM routine_exercises WHERE routine_id = ?;', [routine.id]);

    routine.exercises.forEach((ex, idx) => {
      const exId = ex.id || `${routine.id}_ex_${idx}_${Date.now()}`;
      db.runSync(
        `INSERT INTO routine_exercises (
          id, routine_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          exId,
          routine.id,
          ex.exerciseId,
          idx,
          ex.targetSets || 3,
          ex.targetRepsMin || 8,
          ex.targetRepsMax || 12,
          ex.restSeconds || 90,
          ex.notes || null,
        ]
      );
    });
  });

  return {
    ...routine,
    isSystem: routine.isSystem ?? false,
    createdAt,
    updatedAt,
  };
};

export const deleteRoutine = (routineId: string): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM routine_exercises WHERE routine_id = ?;', [routineId]);
    db.runSync('DELETE FROM routines WHERE id = ?;', [routineId]);
  });
};

/**
 * CONSULTAS E GRAVAÇÃO DE SESSÕES DE TREINO & SÉRIES
 */
export const saveWorkoutSession = (session: WorkoutSession): void => {
  const db = getDatabase();

  db.withTransactionSync(() => {
    // 1. Grava ou atualiza a sessão
    db.runSync(
      `INSERT OR REPLACE INTO workout_sessions (
        id, routine_id, name, start_time, end_time, 
        duration_seconds, total_volume_kg, total_sets, is_completed, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        session.id,
        session.routineId || null,
        session.name,
        session.startTime,
        session.endTime || null,
        session.durationSeconds,
        session.totalTonnageKg,
        session.totalSets,
        session.isCompleted ? 1 : 0,
        session.notes || null,
      ]
    );

    // 2. Grava exercícios e séries
    session.exercises.forEach((we, exIdx) => {
      db.runSync(
        `INSERT OR REPLACE INTO workout_session_exercises (
          id, session_id, exercise_id, order_index, notes
        ) VALUES (?, ?, ?, ?, ?);`,
        [we.id, session.id, we.exerciseId, exIdx, we.notes || null]
      );

      we.sets.forEach(s => {
        db.runSync(
          `INSERT OR REPLACE INTO workout_sets (
            id, session_exercise_id, set_number, type, weight_kg, reps, rpe, rir, completed, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            s.id,
            we.id,
            s.setNumber,
            s.type,
            s.weightKg,
            s.reps,
            s.rpe || null,
            s.rir || null,
            s.completed ? 1 : 0,
            s.completedAt || null,
          ]
        );
      });
    });
  });
};

export const getWorkoutHistory = (): WorkoutSession[] => {
  const db = getDatabase();
  const sessionRows = db.getAllSync<any>(
    'SELECT * FROM workout_sessions WHERE is_completed = 1 ORDER BY start_time DESC;'
  );

  return sessionRows.map(s => {
    const exRows = db.getAllSync<any>(
      `SELECT wse.*, e.name as exercise_name, e.target_muscle 
       FROM workout_session_exercises wse
       JOIN exercises e ON wse.exercise_id = e.id
       WHERE wse.session_id = ?
       ORDER BY wse.order_index ASC;`,
      [s.id]
    );

    const exercises: WorkoutExercise[] = exRows.map(e => {
      const setRows = db.getAllSync<any>(
        'SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_number ASC;',
        [e.id]
      );

      const sets: WorkoutSet[] = setRows.map(st => ({
        id: st.id,
        setNumber: st.set_number,
        type: st.type,
        weightKg: st.weight_kg,
        reps: st.reps,
        rpe: st.rpe || undefined,
        rir: st.rir || undefined,
        completed: st.completed === 1,
        completedAt: st.completed_at || undefined,
      }));

      return {
        id: e.id,
        exerciseId: e.exercise_id,
        exerciseName: e.exercise_name,
        targetMuscle: e.target_muscle,
        sets,
        notes: e.notes || undefined,
      };
    });

    return {
      id: s.id,
      routineId: s.routine_id || undefined,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time || undefined,
      durationSeconds: s.duration_seconds,
      totalTonnageKg: s.total_volume_kg,
      totalSets: s.total_sets,
      isCompleted: s.is_completed === 1,
      notes: s.notes || undefined,
      exercises,
    };
  });
};

/**
 * CONSULTAS E GRAVAÇÃO DE RECORDES PESSOAIS (PRs)
 */
export const getPersonalRecords = (): Record<string, PersonalRecord> => {
  const db = getDatabase();
  const rows = db.getAllSync<any>('SELECT * FROM personal_records;');
  const result: Record<string, PersonalRecord> = {};

  for (const r of rows) {
    result[r.exercise_id] = {
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      maxWeightKg: r.max_weight_kg,
      repsAtMaxWeight: r.reps_at_max_weight,
      estimated1RM: r.estimated_1rm,
      achievedSessionId: r.achieved_session_id || undefined,
      achievedAt: r.achieved_at,
    };
  }

  return result;
};

export const getSessionPRs = (sessionId: string): PersonalRecord[] => {
  const db = getDatabase();
  const rows = db.getAllSync<any>(
    'SELECT * FROM personal_records WHERE achieved_session_id = ?;',
    [sessionId]
  );
  return rows.map(r => ({
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    maxWeightKg: r.max_weight_kg,
    repsAtMaxWeight: r.reps_at_max_weight,
    estimated1RM: r.estimated_1rm,
    achievedSessionId: r.achieved_session_id || undefined,
    achievedAt: r.achieved_at,
  }));
};

export const savePersonalRecord = (pr: PersonalRecord): void => {
  const db = getDatabase();
  db.runSync(
    `INSERT OR REPLACE INTO personal_records (
      exercise_id, exercise_name, max_weight_kg, reps_at_max_weight, estimated_1rm, achieved_session_id, achieved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      pr.exerciseId,
      pr.exerciseName,
      pr.maxWeightKg,
      pr.repsAtMaxWeight,
      pr.estimated1RM,
      pr.achievedSessionId || null,
      pr.achievedAt,
    ]
  );
};

/**
 * 1. getWorkoutSession(id): Busca a sessão ativa com exercícios e séries já ordenados.
 */
export const getWorkoutSession = (id: string): WorkoutSession | null => {
  const db = getDatabase();
  const sessionRow = db.getFirstSync<any>(
    'SELECT * FROM workout_sessions WHERE id = ?;',
    [id]
  );

  if (!sessionRow) return null;

  const exRows = db.getAllSync<any>(
    `SELECT wse.*, e.name as exercise_name, e.target_muscle 
     FROM workout_session_exercises wse
     JOIN exercises e ON wse.exercise_id = e.id
     WHERE wse.session_id = ?
     ORDER BY wse.order_index ASC;`,
    [id]
  );

  const exercises: WorkoutExercise[] = exRows.map(e => {
    const setRows = db.getAllSync<any>(
      'SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_number ASC;',
      [e.id]
    );

    const sets: WorkoutSet[] = setRows.map(st => ({
      id: st.id,
      setNumber: st.set_number,
      type: st.type as SetType,
      weightKg: st.weight_kg,
      reps: st.reps,
      rpe: st.rpe ?? undefined,
      rir: st.rir ?? undefined,
      completed: st.completed === 1,
      completedAt: st.completed_at ?? undefined,
    }));

    return {
      id: e.id,
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      targetMuscle: e.target_muscle as MuscleGroup,
      sets,
      notes: e.notes ?? undefined,
    };
  });

  return {
    id: sessionRow.id,
    routineId: sessionRow.routine_id ?? undefined,
    name: sessionRow.name,
    startTime: sessionRow.start_time,
    endTime: sessionRow.end_time ?? undefined,
    durationSeconds: sessionRow.duration_seconds,
    totalTonnageKg: sessionRow.total_volume_kg,
    totalSets: sessionRow.total_sets,
    isCompleted: sessionRow.is_completed === 1,
    notes: sessionRow.notes ?? undefined,
    exercises,
  };
};

/**
 * 2. getLastExercisePerformance(exerciseId): Traz as cargas e repetições da última vez que o exercício foi executado (o "fantasma" que guia a sobrecarga progressiva).
 */
export const getLastExercisePerformance = (
  exerciseId: string
): LastExercisePerformance | null => {
  const db = getDatabase();

  // Busca a última sessão concluída que teve este exercício
  const lastSession = db.getFirstSync<{
    session_id: string;
    start_time: string;
    session_exercise_id: string;
  }>(
    `SELECT ws.id as session_id, ws.start_time, wse.id as session_exercise_id
     FROM workout_sessions ws
     JOIN workout_session_exercises wse ON ws.id = wse.session_id
     WHERE wse.exercise_id = ? AND ws.is_completed = 1
     ORDER BY ws.start_time DESC
     LIMIT 1;`,
    [exerciseId]
  );

  if (!lastSession) return null;

  const setRows = db.getAllSync<any>(
    `SELECT set_number, type, weight_kg, reps, rpe, rir 
     FROM workout_sets 
     WHERE session_exercise_id = ? AND completed = 1
     ORDER BY set_number ASC;`,
    [lastSession.session_exercise_id]
  );

  if (!setRows || setRows.length === 0) return null;

  let bestWeight = 0;
  let best1RM = 0;

  const sets = setRows.map(st => {
    const weight = st.weight_kg;
    const reps = st.reps;
    if (weight > bestWeight) bestWeight = weight;
    const est1RM = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
    if (est1RM > best1RM) best1RM = Math.round(est1RM * 10) / 10;

    return {
      setNumber: st.set_number,
      type: st.type as SetType,
      weightKg: weight,
      reps: reps,
      rpe: st.rpe ?? undefined,
      rir: st.rir ?? undefined,
    };
  });

  return {
    sessionId: lastSession.session_id,
    date: lastSession.start_time,
    sets,
    bestWeightKg: bestWeight,
    bestEstimated1RM: best1RM,
  };
};

/**
 * 3. logSet(params): Insere ou atualiza o set instantaneamente no banco SQLite.
 */
export const logSet = (params: {
  id?: string;
  sessionExerciseId: string;
  setNumber?: number;
  type?: SetType;
  weightKg: number;
  reps: number;
  rpe?: number;
  rir?: number;
  completed?: boolean;
}): WorkoutSet => {
  const db = getDatabase();

  const id = params.id || `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const type = params.type || 'normal';
  const completed = params.completed ?? true;
  const completedAt = completed ? new Date().toISOString() : null;

  // Se setNumber não foi informado, obtém o próximo incremental
  let setNumber = params.setNumber;
  if (setNumber === undefined) {
    const existing = db.getFirstSync<{ max_set: number | null }>(
      'SELECT MAX(set_number) as max_set FROM workout_sets WHERE session_exercise_id = ?;',
      [params.sessionExerciseId]
    );
    setNumber = (existing?.max_set || 0) + 1;
  }

  db.runSync(
    `INSERT OR REPLACE INTO workout_sets (
      id, session_exercise_id, set_number, type, weight_kg, reps, rpe, rir, completed, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      params.sessionExerciseId,
      setNumber,
      type,
      params.weightKg,
      params.reps,
      params.rpe ?? null,
      params.rir ?? null,
      completed ? 1 : 0,
      completedAt,
    ]
  );

  // Se concluído com valores válidos, checa e atualiza Recorde Pessoal (PR)
  if (completed && params.weightKg > 0 && params.reps > 0) {
    const exInfo = db.getFirstSync<{ exercise_id: string; exercise_name: string; session_id: string }>(
      `SELECT wse.exercise_id, e.name as exercise_name, wse.session_id
       FROM workout_session_exercises wse
       JOIN exercises e ON wse.exercise_id = e.id
       WHERE wse.id = ?;`,
      [params.sessionExerciseId]
    );

    if (exInfo) {
      const est1RM = Math.round(params.weightKg * (1 + params.reps / 30) * 10) / 10;
      const currentPR = db.getFirstSync<any>(
        'SELECT * FROM personal_records WHERE exercise_id = ?;',
        [exInfo.exercise_id]
      );

      if (!currentPR || params.weightKg > currentPR.max_weight_kg || est1RM > currentPR.estimated_1rm) {
        savePersonalRecord({
          exerciseId: exInfo.exercise_id,
          exerciseName: exInfo.exercise_name,
          maxWeightKg: Math.max(params.weightKg, currentPR?.max_weight_kg || 0),
          repsAtMaxWeight: params.reps,
          estimated1RM: Math.max(est1RM, currentPR?.estimated_1rm || 0),
          achievedSessionId: exInfo.session_id,
          achievedAt: completedAt || new Date().toISOString(),
        });
      }
    }
  }

  return {
    id,
    setNumber,
    type,
    weightKg: params.weightKg,
    reps: params.reps,
    rpe: params.rpe,
    rir: params.rir,
    completed,
    completedAt: completedAt || undefined,
  };
};

/**
 * 4. completeWorkout(sessionId): Calcula e fecha o volume total e tempo da sessão no banco.
 */
export const completeWorkout = (sessionId: string): WorkoutSession | null => {
  const db = getDatabase();

  const session = getWorkoutSession(sessionId);
  if (!session) return null;

  const endTime = new Date().toISOString();
  const startMs = new Date(session.startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const durationSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));

  // Calcula volume total e total de séries concluídas
  const stats = db.getFirstSync<{ total_volume: number | null; completed_sets: number | null }>(
    `SELECT 
       SUM(ws.weight_kg * ws.reps) as total_volume,
       COUNT(ws.id) as completed_sets
     FROM workout_sets ws
     JOIN workout_session_exercises wse ON ws.session_exercise_id = wse.id
     WHERE wse.session_id = ? AND ws.completed = 1 AND ws.weight_kg > 0 AND ws.reps > 0;`,
    [sessionId]
  );

  const totalVolumeKg = Math.round(stats?.total_volume || 0);
  const totalSets = stats?.completed_sets || 0;

  db.runSync(
    `UPDATE workout_sessions 
     SET end_time = ?, duration_seconds = ?, total_volume_kg = ?, total_sets = ?, is_completed = 1
     WHERE id = ?;`,
    [endTime, durationSeconds, totalVolumeKg, totalSets, sessionId]
  );

  return getWorkoutSession(sessionId);
};

/**
 * 5. getActiveWorkoutSession(): Recupera a sessão ativa não finalizada do SQLite (is_completed = 0).
 */
export const getActiveWorkoutSession = (): WorkoutSession | null => {
  const db = getDatabase();
  const activeSessionRow = db.getFirstSync<{ id: string }>(
    'SELECT id FROM workout_sessions WHERE is_completed = 0 ORDER BY start_time DESC LIMIT 1;'
  );

  if (!activeSessionRow) return null;
  return getWorkoutSession(activeSessionRow.id);
};

/**
 * 6. deleteWorkoutSession(sessionId): Remove a sessão e todos os seus registros atrelados.
 */
export const deleteWorkoutSession = (sessionId: string): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(
      `DELETE FROM workout_sets WHERE session_exercise_id IN (
         SELECT id FROM workout_session_exercises WHERE session_id = ?
       );`,
      [sessionId]
    );
    db.runSync('DELETE FROM workout_session_exercises WHERE session_id = ?;', [sessionId]);
    db.runSync('DELETE FROM workout_sessions WHERE id = ?;', [sessionId]);
  });
};
