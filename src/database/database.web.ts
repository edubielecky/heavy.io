import { SEED_EXERCISES } from './seedData';
import { 
  Exercise, 
  MuscleGroup, 
  Equipment, 
  MovementPattern, 
  ExerciseMechanic,
  PlaneOfMotion,
  Routine, 
  WorkoutProgram,
  WorkoutSession, 
  PersonalRecord,
  WorkoutExercise,
  WorkoutSet,
  SetType,
  LastExercisePerformance,
  ExerciseSessionHistoryItem,
  SyncQueueItem,
  SyncStatus
} from '../types/workout';

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

// Chaves do LocalStorage para persistência na Web
const STORAGE_KEYS = {
  CUSTOM_EXERCISES: 'heavy_web_custom_exercises',
  PROGRAMS: 'heavy_web_programs',
  ROUTINES: 'heavy_web_routines',
  SESSIONS: 'heavy_web_sessions',
  PRS: 'heavy_web_prs',
  DRAFT: 'heavy_web_draft',
  SYNC_QUEUE: 'heavy_web_sync_queue',
};

// Helpers seguros para localStorage (caso SSR ou restrições de sandbox)
function storageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    }
  } catch {}
  return fallback;
}

function storageSet<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

// Estado em memória espelhado com LocalStorage
let customExercises: Exercise[] = [];
let programs: WorkoutProgram[] = [];
let routines: Routine[] = [];
let workoutSessions: WorkoutSession[] = [];
let personalRecords: Record<string, PersonalRecord> = {};
let activeSessionDraft: WorkoutSession | null = null;
let syncQueue: SyncQueueItem[] = [];
let isInitialized = false;

// Mock database object compatível para chamadas legadas de getDatabase()
const mockDb = {
  execSync: () => {},
  runSync: () => ({ changes: 1, lastInsertRowId: 1 }),
  getFirstSync: () => null,
  getAllSync: () => [],
  prepareSync: () => ({
    executeSync: () => {},
    finalizeSync: () => {},
  }),
  withTransactionSync: (fn: () => any) => fn(),
};

export const getDatabase = (): any => {
  return mockDb;
};

/**
 * Inicialização e Carga Padrão para Ambiente Web
 */
export const initDatabase = (): void => {
  if (isInitialized) return;

  // 1. Carrega dados persistidos
  customExercises = storageGet<Exercise[]>(STORAGE_KEYS.CUSTOM_EXERCISES, []);
  programs = storageGet<WorkoutProgram[]>(STORAGE_KEYS.PROGRAMS, []);
  routines = storageGet<Routine[]>(STORAGE_KEYS.ROUTINES, []);
  workoutSessions = storageGet<WorkoutSession[]>(STORAGE_KEYS.SESSIONS, []);
  personalRecords = storageGet<Record<string, PersonalRecord>>(STORAGE_KEYS.PRS, {});
  activeSessionDraft = storageGet<WorkoutSession | null>(STORAGE_KEYS.DRAFT, null);
  syncQueue = storageGet<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);

  const defaultProgId = 'prog_main_default';
  const now = new Date().toISOString();

  // 2. Garante programa padrão caso vazio
  if (programs.length === 0) {
    const defaultProgram: WorkoutProgram = {
      id: defaultProgId,
      name: 'Ficha PPL Clássica',
      description: 'Periodização de força e hipertrofia Push / Pull / Legs',
      isActive: true,
      routines: [],
      createdAt: now,
      updatedAt: now,
    };
    programs.push(defaultProgram);
    storageSet(STORAGE_KEYS.PROGRAMS, programs);
  }

  const getExerciseDetails = (exerciseId: string): { exerciseName: string; targetMuscle: MuscleGroup } => {
    const seed = SEED_EXERCISES.find(e => e.id === exerciseId);
    if (seed) {
      return { exerciseName: seed.name, targetMuscle: seed.targetMuscle };
    }
    const custom = customExercises.find(e => e.id === exerciseId);
    if (custom) {
      return { exerciseName: custom.name, targetMuscle: custom.targetMuscle };
    }
    return { exerciseName: exerciseId, targetMuscle: 'peito' };
  };

  // 3. Garante rotinas padrão caso vazio
  if (routines.length === 0) {
    const defaultRoutinesData: Routine[] = [
      {
        id: 'routine_push_a',
        programId: defaultProgId,
        name: 'Push A (Peito, Ombros & Tríceps)',
        description: 'Foco em força no supino reto, desenvolvimento e trabalho acessório de tríceps.',
        orderIndex: 0,
        isSystem: true,
        exercises: [
          { id: 'routine_push_a_ex_0', ...getExerciseDetails('barbell_bench_press'), exerciseId: 'barbell_bench_press', orderIndex: 0, targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120 },
          { id: 'routine_push_a_ex_1', ...getExerciseDetails('incline_dumbbell_bench_press'), exerciseId: 'incline_dumbbell_bench_press', orderIndex: 1, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90 },
          { id: 'routine_push_a_ex_2', ...getExerciseDetails('overhead_press_barbell_standing'), exerciseId: 'overhead_press_barbell_standing', orderIndex: 2, targetSets: 3, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120 },
          { id: 'routine_push_a_ex_3', ...getExerciseDetails('dumbbell_lateral_raise_standing'), exerciseId: 'dumbbell_lateral_raise_standing', orderIndex: 3, targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
          { id: 'routine_push_a_ex_4', ...getExerciseDetails('close_grip_bench_press'), exerciseId: 'close_grip_bench_press', orderIndex: 4, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90 },
          { id: 'routine_push_a_ex_5', ...getExerciseDetails('cable_triceps_pushdown_rope'), exerciseId: 'cable_triceps_pushdown_rope', orderIndex: 5, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'routine_pull_a',
        programId: defaultProgId,
        name: 'Pull A (Costas, Dorsal & Bíceps)',
        description: 'Foco em força no levantamento terra, puxada vertical e remadas densas.',
        orderIndex: 1,
        isSystem: true,
        exercises: [
          { id: 'routine_pull_a_ex_0', ...getExerciseDetails('deadlift_conventional'), exerciseId: 'deadlift_conventional', orderIndex: 0, targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180 },
          { id: 'routine_pull_a_ex_1', ...getExerciseDetails('pull_up_pronated'), exerciseId: 'pull_up_pronated', orderIndex: 1, targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
          { id: 'routine_pull_a_ex_2', ...getExerciseDetails('barbell_bent_over_row'), exerciseId: 'barbell_bent_over_row', orderIndex: 2, targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
          { id: 'routine_pull_a_ex_3', ...getExerciseDetails('cable_face_pull'), exerciseId: 'cable_face_pull', orderIndex: 3, targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
          { id: 'routine_pull_a_ex_4', ...getExerciseDetails('ez_bar_curl'), exerciseId: 'ez_bar_curl', orderIndex: 4, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90 },
          { id: 'routine_pull_a_ex_5', ...getExerciseDetails('hammer_curl_dumbbells'), exerciseId: 'hammer_curl_dumbbells', orderIndex: 5, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'routine_legs_a',
        programId: defaultProgId,
        name: 'Legs A (Agachamento & Cadeia Posterior)',
        description: 'Construção de base de força em agachamento, RDL e extensão/flexão de joelhos.',
        orderIndex: 2,
        isSystem: true,
        exercises: [
          { id: 'routine_legs_a_ex_0', ...getExerciseDetails('barbell_back_squat_high_bar'), exerciseId: 'barbell_back_squat_high_bar', orderIndex: 0, targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 180 },
          { id: 'routine_legs_a_ex_1', ...getExerciseDetails('romanian_deadlift_barbell'), exerciseId: 'romanian_deadlift_barbell', orderIndex: 1, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
          { id: 'routine_legs_a_ex_2', ...getExerciseDetails('leg_press_45_degree'), exerciseId: 'leg_press_45_degree', orderIndex: 2, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 120 },
          { id: 'routine_legs_a_ex_3', ...getExerciseDetails('seated_leg_curl_machine'), exerciseId: 'seated_leg_curl_machine', orderIndex: 3, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
          { id: 'routine_legs_a_ex_4', ...getExerciseDetails('standing_calf_raise_machine'), exerciseId: 'standing_calf_raise_machine', orderIndex: 4, targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];
    routines = defaultRoutinesData;
    storageSet(STORAGE_KEYS.ROUTINES, routines);
  }

  isInitialized = true;
};

/**
 * CONSULTAS DE EXERCÍCIOS
 */
export const getExercises = (options?: {
  targetMuscle?: MuscleGroup | 'todos';
  equipment?: Equipment | 'todos';
  movementPattern?: MovementPattern;
  search?: string;
  limit?: number;
}): Exercise[] => {
  if (!isInitialized) initDatabase();

  let all: Exercise[] = [
    ...customExercises,
    ...SEED_EXERCISES.map(ex => ({
      ...ex,
      isCustom: false,
      createdAt: ex.createdAt || '2025-01-01T00:00:00.000Z',
    })),
  ];

  // Garante IDs únicos
  const seenIds = new Set<string>();
  all = all.filter(e => {
    if (!e.id || seenIds.has(e.id)) return false;
    seenIds.add(e.id);
    return true;
  });

  if (options?.targetMuscle && options.targetMuscle !== 'todos') {
    all = all.filter(e => e.targetMuscle === options.targetMuscle);
  }

  if (options?.equipment && options.equipment !== 'todos') {
    all = all.filter(e => e.equipment === options.equipment);
  }

  if (options?.movementPattern) {
    all = all.filter(e => e.movementPattern === options.movementPattern);
  }

  if (options?.search && options.search.trim().length > 0) {
    const q = options.search.trim().toLowerCase();
    all = all.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        (e.nameEn && e.nameEn.toLowerCase().includes(q))
    );
  }

  all.sort((a, b) => {
    if (a.isCustom && !b.isCustom) return -1;
    if (!a.isCustom && b.isCustom) return 1;
    return a.name.localeCompare(b.name);
  });

  if (options?.limit && options.limit > 0) {
    all = all.slice(0, options.limit);
  }

  return all;
};

export const getExerciseById = (id: string): Exercise | null => {
  if (!isInitialized) initDatabase();
  const custom = customExercises.find(e => e.id === id);
  if (custom) return custom;

  const seed = SEED_EXERCISES.find(e => e.id === id);
  if (seed) {
    return {
      ...seed,
      isCustom: false,
      createdAt: seed.createdAt || '2025-01-01T00:00:00.000Z',
    };
  }
  return null;
};

export const createCustomExercise = (
  exercise: Omit<Exercise, 'isCustom' | 'createdAt'>
): Exercise => {
  if (!isInitialized) initDatabase();
  const now = new Date().toISOString();
  const newEx: Exercise = {
    ...exercise,
    isCustom: true,
    createdAt: now,
  };
  customExercises.unshift(newEx);
  storageSet(STORAGE_KEYS.CUSTOM_EXERCISES, customExercises);
  return newEx;
};

export const updateCustomExercise = (
  exerciseId: string,
  updates: Partial<Omit<Exercise, 'id' | 'isCustom' | 'createdAt'>>
): Exercise | null => {
  if (!isInitialized) initDatabase();
  const idx = customExercises.findIndex(e => e.id === exerciseId);
  if (idx === -1) return null;

  customExercises[idx] = {
    ...customExercises[idx],
    ...updates,
    synergistMuscles: updates.synergistMuscles ?? customExercises[idx].synergistMuscles,
  };
  storageSet(STORAGE_KEYS.CUSTOM_EXERCISES, customExercises);
  return customExercises[idx];
};

export const deleteCustomExercise = (exerciseId: string): boolean => {
  if (!isInitialized) initDatabase();
  const before = customExercises.length;
  customExercises = customExercises.filter(e => e.id !== exerciseId);
  if (customExercises.length !== before) {
    storageSet(STORAGE_KEYS.CUSTOM_EXERCISES, customExercises);
    return true;
  }
  return false;
};

/**
 * CONSULTAS E OPERAÇÕES DE PROGRAMAS / FICHAS DE TREINO
 */
export const getPrograms = (): WorkoutProgram[] => {
  if (!isInitialized) initDatabase();
  return [...programs]
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
    .map(p => ({
      ...p,
      routines: routines.filter(r => r.programId === p.id).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    }));
};

export const getActiveProgram = (): WorkoutProgram | null => {
  if (!isInitialized) initDatabase();
  const active = programs.find(p => p.isActive) || programs[0] || null;
  if (!active) return null;
  return {
    ...active,
    routines: getRoutines().filter(r => r.programId === active.id),
  };
};

export const setActiveProgram = (programId: string): void => {
  if (!isInitialized) initDatabase();
  programs = programs.map(p => ({
    ...p,
    isActive: p.id === programId,
    updatedAt: new Date().toISOString(),
  }));
  storageSet(STORAGE_KEYS.PROGRAMS, programs);
};

export const createProgram = (
  name: string,
  description?: string,
  daysOrMakeActive?: Array<{ name: string; description?: string; exercises?: any[] }> | boolean
): WorkoutProgram => {
  if (!isInitialized) initDatabase();
  const now = new Date().toISOString();
  const id = `prog_${Date.now()}`;

  const makeActive = typeof daysOrMakeActive === 'boolean' ? daysOrMakeActive : programs.length === 0;

  if (makeActive) {
    programs = programs.map(p => ({ ...p, isActive: false }));
  }

  const newProg: WorkoutProgram = {
    id,
    name,
    description,
    isActive: makeActive,
    routines: [],
    createdAt: now,
    updatedAt: now,
  };

  programs.push(newProg);

  if (Array.isArray(daysOrMakeActive) && daysOrMakeActive.length > 0) {
    daysOrMakeActive.forEach((day, dIdx) => {
      const routineId = `routine_${id}_${dIdx}_${Date.now()}`;
      const newRoutine: Routine = {
        id: routineId,
        programId: id,
        name: day.name,
        description: day.description,
        orderIndex: dIdx,
        isSystem: false,
        exercises: (day.exercises || []).map((ex, eIdx) => {
          const det = getExerciseById(ex.exerciseId);
          return {
            id: `re_${routineId}_${eIdx}_${Date.now()}`,
            exerciseId: ex.exerciseId,
            exerciseName: det?.name || ex.exerciseName || ex.exerciseId,
            targetMuscle: det?.targetMuscle || ex.targetMuscle || 'peito',
            orderIndex: eIdx,
            targetSets: ex.targetSets || 3,
            targetRepsMin: ex.targetRepsMin || 8,
            targetRepsMax: ex.targetRepsMax || 12,
            restSeconds: ex.restSeconds || 90,
            notes: ex.notes,
          };
        }),
        createdAt: now,
        updatedAt: now,
      };
      routines.push(newRoutine);
      newProg.routines.push(newRoutine);
    });
    storageSet(STORAGE_KEYS.ROUTINES, routines);
  }

  storageSet(STORAGE_KEYS.PROGRAMS, programs);
  return newProg;
};

export const updateProgram = (
  programId: string,
  updates: { name?: string; description?: string }
): WorkoutProgram => {
  if (!isInitialized) initDatabase();
  const idx = programs.findIndex(p => p.id === programId);
  if (idx === -1) throw new Error('Program not found');

  programs[idx] = {
    ...programs[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  storageSet(STORAGE_KEYS.PROGRAMS, programs);
  return programs[idx];
};

export const deleteProgram = (programId: string): boolean => {
  if (!isInitialized) initDatabase();
  const wasActive = programs.find(p => p.id === programId)?.isActive;
  programs = programs.filter(p => p.id !== programId);
  routines = routines.filter(r => r.programId !== programId);
  
  if (wasActive && programs.length > 0) {
    programs[0].isActive = true;
  }
  
  storageSet(STORAGE_KEYS.PROGRAMS, programs);
  storageSet(STORAGE_KEYS.ROUTINES, routines);
  return true;
};

export const addDayToProgram = (
  programId: string,
  dayName: string,
  description?: string
): Routine => {
  if (!isInitialized) initDatabase();
  const count = routines.filter(r => r.programId === programId).length;
  const now = new Date().toISOString();
  const newRoutine: Routine = {
    id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    programId,
    name: dayName,
    description,
    orderIndex: count,
    isSystem: false,
    exercises: [],
    createdAt: now,
    updatedAt: now,
  };
  routines.push(newRoutine);
  storageSet(STORAGE_KEYS.ROUTINES, routines);
  return newRoutine;
};

export const deleteDayFromProgram = (routineId: string): void => {
  deleteRoutine(routineId);
};

/**
 * CONSULTAS E OPERAÇÕES DE ROTINAS
 */
export const getRoutines = (): Routine[] => {
  if (!isInitialized) initDatabase();
  const activeProg = programs.find(p => p.isActive);
  if (activeProg) {
    const progRoutines = routines.filter(r => r.programId === activeProg.id);
    if (progRoutines.length > 0) {
      return [...progRoutines].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }
  }
  return [...routines].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
};

export const saveRoutine = (
  routine: Omit<Routine, 'createdAt' | 'updatedAt'> & { 
    createdAt?: string; 
    updatedAt?: string;
    programId?: string;
    orderIndex?: number;
  }
): Routine => {
  if (!isInitialized) initDatabase();
  const now = new Date().toISOString();
  const createdAt = routine.createdAt || now;
  const updatedAt = now;
  let programId = routine.programId || (getActiveProgram()?.id || 'prog_main_default');

  const formattedRoutine: Routine = {
    ...routine,
    programId,
    orderIndex: routine.orderIndex ?? routines.length,
    isSystem: routine.isSystem ?? false,
    exercises: (routine.exercises || []).map((ex, idx) => ({
      ...ex,
      id: ex.id || `${routine.id}_ex_${idx}_${Date.now()}`,
      routineId: routine.id,
      orderIndex: ex.orderIndex ?? idx,
      targetSets: ex.targetSets || 3,
      targetRepsMin: ex.targetRepsMin || 8,
      targetRepsMax: ex.targetRepsMax || 12,
      restSeconds: ex.restSeconds || 90,
    })),
    createdAt,
    updatedAt,
  };

  const idx = routines.findIndex(r => r.id === routine.id);
  if (idx >= 0) {
    routines[idx] = formattedRoutine;
  } else {
    routines.push(formattedRoutine);
  }

  storageSet(STORAGE_KEYS.ROUTINES, routines);
  return formattedRoutine;
};

export const deleteRoutine = (routineId: string): void => {
  if (!isInitialized) initDatabase();
  routines = routines.filter(r => r.id !== routineId);
  storageSet(STORAGE_KEYS.ROUTINES, routines);
};

/**
 * HISTÓRICO E SESSÕES DE TREINO
 */
export const saveWorkoutSession = (session: WorkoutSession): void => {
  if (!isInitialized) initDatabase();
  const idx = workoutSessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    workoutSessions[idx] = session;
  } else {
    workoutSessions.unshift(session);
  }
  storageSet(STORAGE_KEYS.SESSIONS, workoutSessions);
};

export const getWorkoutHistory = (): WorkoutSession[] => {
  if (!isInitialized) initDatabase();
  return workoutSessions
    .filter(s => s.isCompleted)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

export const getWorkoutSession = (id: string): WorkoutSession | null => {
  if (!isInitialized) initDatabase();
  return workoutSessions.find(s => s.id === id) || null;
};

export const getPersonalRecords = (): Record<string, PersonalRecord> => {
  if (!isInitialized) initDatabase();
  return { ...personalRecords };
};

export const getSessionPRs = (sessionId: string): PersonalRecord[] => {
  if (!isInitialized) initDatabase();
  return Object.values(personalRecords).filter(pr => pr.achievedSessionId === sessionId);
};

export const savePersonalRecord = (pr: PersonalRecord): void => {
  if (!isInitialized) initDatabase();
  personalRecords[pr.exerciseId] = pr;
  storageSet(STORAGE_KEYS.PRS, personalRecords);
};

export const getLastExercisePerformance = (
  exerciseId: string
): LastExercisePerformance | null => {
  if (!isInitialized) initDatabase();
  const completed = getWorkoutHistory();
  
  for (const session of completed) {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId);
    if (ex && ex.sets.length > 0) {
      const completedSets = ex.sets.filter(s => s.completed);
      if (completedSets.length === 0) continue;

      let bestWeight = 0;
      let best1RM = 0;

      completedSets.forEach(st => {
        if (st.weightKg > bestWeight) bestWeight = st.weightKg;
        const est = st.weightKg > 0 && st.reps > 0 ? st.weightKg * (1 + st.reps / 30) : 0;
        if (est > best1RM) best1RM = Math.round(est * 10) / 10;
      });

      return {
        sessionId: session.id,
        date: session.startTime,
        sets: completedSets.map(s => ({
          setNumber: s.setNumber,
          type: s.type,
          weightKg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe,
          rir: s.rir,
        })),
        bestWeightKg: bestWeight,
        bestEstimated1RM: best1RM,
      };
    }
  }

  return null;
};

export const getExerciseSessionHistory = (
  exerciseId: string,
  limit: number = 5
): ExerciseSessionHistoryItem[] => {
  if (!isInitialized) initDatabase();
  const history = getWorkoutHistory();
  const results: ExerciseSessionHistoryItem[] = [];

  for (const session of history) {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) continue;

    const validSets = ex.sets.filter(s => s.completed && s.weightKg > 0 && s.reps > 0);
    if (validSets.length === 0) continue;

    let maxWeight = 0;
    let totalVol = 0;
    let rirSum = 0;
    let rirCount = 0;

    validSets.forEach(s => {
      totalVol += s.weightKg * s.reps;
      if (s.weightKg > maxWeight) maxWeight = s.weightKg;
      if (s.rir !== undefined && s.rir !== null) {
        rirSum += s.rir;
        rirCount++;
      }
    });

    results.push({
      sessionId: session.id,
      sessionDate: session.startTime,
      totalVolumeKg: totalVol,
      maxWeightKg: maxWeight,
      avgRir: rirCount > 0 ? Math.round((rirSum / rirCount) * 10) / 10 : undefined,
      validWorkingSets: validSets.length,
      sets: validSets.map(s => ({
        setNumber: s.setNumber,
        type: s.type,
        weightKg: s.weightKg,
        reps: s.reps,
        rir: s.rir,
        rpe: s.rpe,
        completed: s.completed,
      })),
    });

    if (results.length >= limit) break;
  }

  return results;
};

export const getExerciseProgressHistory = (exerciseId: string): ExerciseProgressPoint[] => {
  if (!isInitialized) initDatabase();
  const history = [...getWorkoutHistory()].reverse();
  const points: ExerciseProgressPoint[] = [];

  for (const session of history) {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) continue;

    const validSets = ex.sets.filter(s => s.completed);
    if (validSets.length === 0) continue;

    let maxWeight = 0;
    let best1RM = 0;
    let bestReps = 0;
    let totalVol = 0;

    const setDetails = validSets.map(st => {
      const w = st.weightKg;
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
        setNumber: st.setNumber,
        weightKg: w,
        reps: r,
        completed: st.completed,
      };
    });

    points.push({
      sessionId: session.id,
      sessionName: session.name,
      date: session.startTime,
      maxWeightKg: maxWeight,
      estimated1RM: best1RM,
      bestSetReps: bestReps,
      totalSets: validSets.length,
      totalVolumeKg: totalVol,
      sets: setDetails,
    });
  }

  return points;
};

export const logSet = (params: {
  id?: string;
  sessionExerciseId: string;
  setNumber?: number;
  type?: SetType;
  weightKg: number;
  reps: number;
  rpe?: number;
  rir?: number;
  peakBpm?: number;
  completed?: boolean;
}): WorkoutSet => {
  if (!isInitialized) initDatabase();
  const id = params.id || `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const completed = params.completed ?? true;
  const completedAt = completed ? new Date().toISOString() : undefined;

  const setItem: WorkoutSet = {
    id,
    setNumber: params.setNumber || 1,
    type: params.type || 'normal',
    weightKg: params.weightKg,
    reps: params.reps,
    rpe: params.rpe,
    rir: params.rir,
    peakBpm: params.peakBpm,
    completed,
    completedAt,
  };

  return setItem;
};

export const completeWorkout = (sessionId: string): WorkoutSession | null => {
  if (!isInitialized) initDatabase();
  const session = getWorkoutSession(sessionId);
  if (!session) return null;

  const endTime = new Date().toISOString();
  const startMs = new Date(session.startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const durationSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));

  let totalVol = 0;
  let totalSets = 0;

  session.exercises.forEach(e => {
    e.sets.forEach(s => {
      if (s.completed) {
        totalSets++;
        totalVol += s.weightKg * s.reps;
      }
    });
  });

  session.endTime = endTime;
  session.durationSeconds = durationSeconds;
  session.totalTonnageKg = totalVol;
  session.totalSets = totalSets;
  session.isCompleted = true;

  saveWorkoutSession(session);
  clearActiveSessionDraft();

  enqueueForSync('workout_session', session.id, session);
  return session;
};

export const getActiveWorkoutSession = (): WorkoutSession | null => {
  if (!isInitialized) initDatabase();
  return workoutSessions.find(s => !s.isCompleted) || null;
};

export const deleteWorkoutSession = (sessionId: string): void => {
  if (!isInitialized) initDatabase();
  workoutSessions = workoutSessions.filter(s => s.id !== sessionId);
  storageSet(STORAGE_KEYS.SESSIONS, workoutSessions);

  let prsChanged = false;
  Object.keys(personalRecords).forEach(key => {
    if (personalRecords[key].achievedSessionId === sessionId) {
      delete personalRecords[key];
      prsChanged = true;
    }
  });
  if (prsChanged) {
    storageSet(STORAGE_KEYS.PRS, personalRecords);
  }
};

export const saveActiveSessionDraft = (session: WorkoutSession): void => {
  activeSessionDraft = session;
  storageSet(STORAGE_KEYS.DRAFT, activeSessionDraft);
};

export const getActiveSessionDraft = (): WorkoutSession | null => {
  if (!isInitialized) initDatabase();
  return activeSessionDraft;
};

export const clearActiveSessionDraft = (): void => {
  activeSessionDraft = null;
  storageSet(STORAGE_KEYS.DRAFT, null);
};

export const enqueueForSync = (
  entityType: 'workout_session' | string,
  entityId: string,
  payload: any
): void => {
  if (!isInitialized) initDatabase();
  const id = `sync_${entityType}_${entityId}`;
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const idx = syncQueue.findIndex(i => i.id === id);
  const newItem: SyncQueueItem = {
    id,
    entityType,
    entityId,
    payload: serialized,
    attempts: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    syncQueue[idx] = newItem;
  } else {
    syncQueue.push(newItem);
  }

  storageSet(STORAGE_KEYS.SYNC_QUEUE, syncQueue);
};

export const getPendingSyncItems = (limit: number = 20): SyncQueueItem[] => {
  if (!isInitialized) initDatabase();
  return syncQueue
    .filter(i => (i.status === 'pending' || i.status === 'failed') && i.attempts < 5)
    .slice(0, limit);
};

export const updateSyncItemStatus = (
  id: string,
  status: SyncStatus,
  errorMessage?: string
): void => {
  if (!isInitialized) initDatabase();
  const item = syncQueue.find(i => i.id === id);
  if (item) {
    item.status = status;
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();
    item.errorMessage = errorMessage;
    storageSet(STORAGE_KEYS.SYNC_QUEUE, syncQueue);
  }
};

export const removeSyncedItem = (id: string): void => {
  if (!isInitialized) initDatabase();
  syncQueue = syncQueue.filter(i => i.id !== id);
  storageSet(STORAGE_KEYS.SYNC_QUEUE, syncQueue);
};
