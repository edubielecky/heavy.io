import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { 
  Exercise, 
  WorkoutSession, 
  WorkoutExercise, 
  WorkoutSet, 
  PersonalRecord, 
  SetType, 
  RestTimerState 
} from '../types/workout';

// Fórmula de Brzycki para estimativa de 1RM: Peso * (36 / (37 - Repetições)) ou Peso / (1.0278 - (0.0278 * Reps))
export const calculateEstimated1RM = (weightKg: number, reps: number): number => {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  const val = weightKg * (1 + reps / 30); // Fórmula de Epley simplificada e robusta
  return Math.round(val * 10) / 10;
};

import { 
  saveWorkoutSession, 
  getWorkoutHistory, 
  getPersonalRecords, 
  savePersonalRecord 
} from '../database/database';

interface WorkoutStoreState {
  currentWorkout: WorkoutSession | null;
  workoutHistory: WorkoutSession[];
  personalRecords: Record<string, PersonalRecord>;
  restTimer: RestTimerState;

  // Carregamento inicial do SQLite
  loadFromDatabase: () => void;

  // Ações de Treino
  startWorkout: (name?: string) => void;
  cancelWorkout: () => void;
  finishWorkout: () => void;
  
  // Ações de Exercício
  addExerciseToCurrentWorkout: (exercise: Exercise) => void;
  removeExerciseFromCurrentWorkout: (workoutExerciseId: string) => void;
  
  // Ações de Séries (Sets)
  addSet: (workoutExerciseId: string, type?: SetType) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (workoutExerciseId: string, setId: string) => void;

  // Cronômetro de Descanso
  startRestTimer: (seconds: number, exerciseName?: string) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;
}

export const useWorkoutStore = create<WorkoutStoreState>()(
  persist(
    (set, get) => ({
      currentWorkout: null,
      workoutHistory: [],
      personalRecords: {},
      restTimer: {
        remainingSeconds: 0,
        totalSeconds: 0,
        exerciseName: '',
        isRunning: false,
      },

      loadFromDatabase: () => {
        try {
          const history = getWorkoutHistory();
          const prs = getPersonalRecords();
          if (history.length > 0 || Object.keys(prs).length > 0) {
            set({
              workoutHistory: history,
              personalRecords: prs,
            });
          }
        } catch (e) {
          console.error('Failed to load initial data from SQLite:', e);
        }
      },

      startWorkout: (name?: string) => {
        const newSession: WorkoutSession = {
          id: `workout_${Date.now()}`,
          name: name || `Treino de Força #${get().workoutHistory.length + 1}`,
          startTime: new Date().toISOString(),
          durationSeconds: 0,
          exercises: [],
          totalTonnageKg: 0,
          totalSets: 0,
          isCompleted: false,
        };

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        set({ currentWorkout: newSession });
      },

      cancelWorkout: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        set({ 
          currentWorkout: null,
          restTimer: { remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false }
        });
      },

      finishWorkout: () => {
        const { currentWorkout, workoutHistory, personalRecords } = get();
        if (!currentWorkout) return;

        const endTime = new Date().toISOString();
        const durationSeconds = Math.max(
          1,
          Math.floor((new Date(endTime).getTime() - new Date(currentWorkout.startTime).getTime()) / 1000)
        );

        let totalTonnage = 0;
        let totalCompletedSets = 0;
        const updatedPRs = { ...personalRecords };

        currentWorkout.exercises.forEach(we => {
          we.sets.forEach(s => {
            if (s.completed && s.weightKg > 0 && s.reps > 0) {
              totalTonnage += s.weightKg * s.reps;
              totalCompletedSets += 1;

              const est1RM = calculateEstimated1RM(s.weightKg, s.reps);
              const currentPR = updatedPRs[we.exerciseId];

              if (!currentPR || est1RM > currentPR.estimated1RM || s.weightKg > currentPR.maxWeightKg) {
                updatedPRs[we.exerciseId] = {
                  exerciseId: we.exerciseId,
                  exerciseName: we.exerciseName,
                  maxWeightKg: Math.max(s.weightKg, currentPR?.maxWeightKg || 0),
                  repsAtMaxWeight: s.reps,
                  estimated1RM: Math.max(est1RM, currentPR?.estimated1RM || 0),
                  achievedAt: endTime,
                };
              }
            }
          });
        });

        const completedSession: WorkoutSession = {
          ...currentWorkout,
          endTime,
          durationSeconds,
          totalTonnageKg: Math.round(totalTonnage),
          totalSets: totalCompletedSets,
          isCompleted: true,
        };

        // Persistência instantânea no banco local SQLite
        try {
          saveWorkoutSession(completedSession);
          Object.values(updatedPRs).forEach(pr => savePersonalRecord(pr));
        } catch (err) {
          console.error('Erro ao persistir sessão no SQLite:', err);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        set({
          currentWorkout: null,
          workoutHistory: [completedSession, ...workoutHistory],
          personalRecords: updatedPRs,
          restTimer: { remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false },
        });
      },

      addExerciseToCurrentWorkout: (exercise: Exercise) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        const newWorkoutExercise: WorkoutExercise = {
          id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetMuscle: exercise.targetMuscle,
          sets: [
            {
              id: `set_${Date.now()}_1`,
              setNumber: 1,
              type: 'normal',
              weightKg: 0,
              reps: 10,
              completed: false,
            },
          ],
        };

        Haptics.selectionAsync().catch(() => {});

        set({
          currentWorkout: {
            ...currentWorkout,
            exercises: [...currentWorkout.exercises, newWorkoutExercise],
          },
        });
      },

      removeExerciseFromCurrentWorkout: (workoutExerciseId: string) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        set({
          currentWorkout: {
            ...currentWorkout,
            exercises: currentWorkout.exercises.filter(e => e.id !== workoutExerciseId),
          },
        });
      },

      addSet: (workoutExerciseId: string, type: SetType = 'normal') => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        const updatedExercises = currentWorkout.exercises.map(we => {
          if (we.id !== workoutExerciseId) return we;
          const lastSet = we.sets[we.sets.length - 1];
          const newSet: WorkoutSet = {
            id: `set_${Date.now()}_${we.sets.length + 1}`,
            setNumber: we.sets.length + 1,
            type,
            weightKg: lastSet ? lastSet.weightKg : 0,
            reps: lastSet ? lastSet.reps : 10,
            completed: false,
          };
          return { ...we, sets: [...we.sets, newSet] };
        });

        Haptics.selectionAsync().catch(() => {});
        set({ currentWorkout: { ...currentWorkout, exercises: updatedExercises } });
      },

      removeSet: (workoutExerciseId: string, setId: string) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        const updatedExercises = currentWorkout.exercises.map(we => {
          if (we.id !== workoutExerciseId) return we;
          const filtered = we.sets.filter(s => s.id !== setId);
          const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return { ...we, sets: renumbered };
        });

        set({ currentWorkout: { ...currentWorkout, exercises: updatedExercises } });
      },

      updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        const updatedExercises = currentWorkout.exercises.map(we => {
          if (we.id !== workoutExerciseId) return we;
          const updatedSets = we.sets.map(s => (s.id === setId ? { ...s, ...updates } : s));
          return { ...we, sets: updatedSets };
        });

        set({ currentWorkout: { ...currentWorkout, exercises: updatedExercises } });
      },

      toggleSetCompleted: (workoutExerciseId: string, setId: string) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        let justCompleted = false;
        let exerciseName = '';

        const updatedExercises = currentWorkout.exercises.map(we => {
          if (we.id !== workoutExerciseId) return we;
          exerciseName = we.exerciseName;
          const updatedSets = we.sets.map(s => {
            if (s.id === setId) {
              const newState = !s.completed;
              if (newState) justCompleted = true;
              return { ...s, completed: newState };
            }
            return s;
          });
          return { ...we, sets: updatedSets };
        });

        if (justCompleted) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          // Auto-iniciar descanso padrão de 90s
          get().startRestTimer(90, exerciseName);
        } else {
          Haptics.selectionAsync().catch(() => {});
        }

        set({ currentWorkout: { ...currentWorkout, exercises: updatedExercises } });
      },

      startRestTimer: (seconds: number, exerciseName: string = '') => {
        set({
          restTimer: {
            remainingSeconds: seconds,
            totalSeconds: seconds,
            exerciseName,
            isRunning: true,
          },
        });
      },

      tickRestTimer: () => {
        const { restTimer } = get();
        if (!restTimer.isRunning) return;

        if (restTimer.remainingSeconds <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          set({
            restTimer: { ...restTimer, remainingSeconds: 0, isRunning: false },
          });
        } else {
          set({
            restTimer: { ...restTimer, remainingSeconds: restTimer.remainingSeconds - 1 },
          });
        }
      },

      stopRestTimer: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        set({
          restTimer: { remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false },
        });
      },
    }),
    {
      name: '@heavy_io_workout_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        workoutHistory: state.workoutHistory,
        personalRecords: state.personalRecords,
        currentWorkout: state.currentWorkout,
      }),
    }
  )
);
