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
  completed: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetMuscle: MuscleGroup;
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
  name: string;
  description?: string;
  isSystem: boolean;
  exercises: RoutineExerciseItem[];
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
  remainingSeconds: number;
  totalSeconds: number;
  exerciseName: string;
  isRunning: boolean;
}
