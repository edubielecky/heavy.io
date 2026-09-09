export type MuscleGroup = 
  | 'peito' 
  | 'costas' 
  | 'pernas' 
  | 'ombros' 
  | 'biceps' 
  | 'triceps' 
  | 'abdomen' 
  | 'gluteos' 
  | 'panturrilhas' 
  | 'composto';

export type Equipment = 
  | 'barra' 
  | 'halter' 
  | 'maquina' 
  | 'cabo' 
  | 'peso_corporal' 
  | 'outros';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment;
  description?: string;
  defaultRestSeconds: number;
}

export type SetType = 'warmup' | 'normal' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  weightKg: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (6 a 10)
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  exercises: WorkoutExercise[];
  totalTonnageKg: number;
  totalSets: number;
  isCompleted: boolean;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  estimated1RM: number; // Brzycki formula: weight / (1.0278 - (0.0278 * reps))
  achievedAt: string;
}

export interface RestTimerState {
  remainingSeconds: number;
  totalSeconds: number;
  exerciseName: string;
  isRunning: boolean;
}
