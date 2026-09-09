export type MuscleGroup = 
  | 'peito' 
  | 'costas' 
  | 'quadriceps' 
  | 'isquiotibiais' 
  | 'gluteos' 
  | 'ombros' 
  | 'biceps' 
  | 'triceps' 
  | 'antibraco' 
  | 'panturrilhas' 
  | 'abdomen' 
  | 'lombar' 
  | 'trapezio';

export type Equipment = 
  | 'barbell' 
  | 'dumbbell' 
  | 'cable' 
  | 'machine' 
  | 'bodyweight' 
  | 'smith' 
  | 'kettlebell' 
  | 'other';

export type MovementPattern = 
  | 'horizontal_push' 
  | 'vertical_push' 
  | 'horizontal_pull' 
  | 'vertical_pull' 
  | 'squat' 
  | 'hinge' 
  | 'lunge' 
  | 'isolation' 
  | 'carry' 
  | 'core_anti_extension' 
  | 'core_rotation' 
  | 'calf_raise';

export type PlaneOfMotion = 
  | 'sagittal' 
  | 'frontal' 
  | 'transverse' 
  | 'multiplanar';

export type ExerciseMechanic = 'compound' | 'isolation';

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  targetMuscle: MuscleGroup;
  synergistMuscles: string[];
  movementPattern: MovementPattern;
  mechanic: ExerciseMechanic;
  equipment: Equipment;
  planeOfMotion?: PlaneOfMotion;
  defaultRestSeconds: number;
  isCustom: boolean;
  instructions?: string;
  createdAt?: string;
}

export type SetType = 'warmup' | 'normal' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  weightKg: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (6 a 10)
  rir?: number; // Reps In Reserve (0 a 4)
  peakBpm?: number; // Pico de frequência cardíaca durante a série
  completed: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetMuscle: MuscleGroup;
  targetRepsMin?: number;
  targetRepsMax?: number;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  name: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  exercises: WorkoutExercise[];
  totalTonnageKg: number;
  totalSets: number;
  isCompleted: boolean;
  notes?: string;
  avgHeartRate?: number; // Frequência cardíaca média (BPM)
  peakHeartRate?: number; // Pico máximo de BPM na sessão
  activeCalories?: number; // Calorias ativas gastas (kcal)
}

export interface RoutineExerciseItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetMuscle: MuscleGroup;
  orderIndex: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes?: string;
}

export interface Routine {
  id: string;
  programId?: string;
  name: string;
  description?: string;
  isSystem: boolean;
  orderIndex?: number;
  exercises: RoutineExerciseItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  routines: Routine[];
  createdAt: string;
  updatedAt?: string;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  estimated1RM: number; // Fórmula de Epley: weight * (1 + reps / 30)
  achievedSessionId?: string;
  achievedAt: string;
}

export interface RestTimerState {
  targetEndTime: number | null; // Timestamp absoluto em ms (Date.now() + segundos * 1000)
  remainingSeconds: number;
  totalSeconds: number;
  exerciseId?: string;
  exerciseName: string;
  isRunning: boolean;
}

export interface LastExercisePerformance {
  sessionId: string;
  date: string;
  sets: {
    setNumber: number;
    type: SetType;
    weightKg: number;
    reps: number;
    rpe?: number;
    rir?: number;
  }[];
  bestWeightKg: number;
  bestEstimated1RM: number;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id: string;
  entityType: 'workout_session' | string;
  entityId: string;
  payload: string;
  attempts: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  status: SyncStatus;
  createdAt: string;
}

export interface ExerciseSessionHistoryItem {
  sessionId: string;
  sessionDate: string;
  totalVolumeKg: number;
  maxWeightKg: number;
  avgRir?: number;
  avgRpe?: number;
  validWorkingSets: number;
  sets: {
    setNumber: number;
    type: SetType;
    weightKg: number;
    reps: number;
    rpe?: number;
    rir?: number;
    completed: boolean;
  }[];
}

export type OverloadDecisionType = 'increase' | 'consolidate' | 'maintain' | 'insufficient_data';

export interface ProgressiveOverloadRecommendation {
  type: OverloadDecisionType;
  exerciseId: string;
  exerciseName: string;
  currentWeightKg: number;
  incrementKg: number;
  suggestedWeightKg: number;
  targetRepsCeiling: number;
  title: string;
  badgeLabel: string;
  rationale: string;
  actionLabel?: string;
  sessionsAnalyzed: number;
  recentAvgRir?: number;
  recentValidSetsCount: number;
  recentTotalVolumeKg: number;
}

