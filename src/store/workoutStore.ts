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
  RestTimerState,
  Routine 
} from '../types/workout';
import { 
  saveWorkoutSession, 
  getWorkoutHistory, 
  getPersonalRecords, 
  savePersonalRecord,
  getWorkoutSession,
  getActiveWorkoutSession,
  deleteWorkoutSession,
  logSet,
  completeWorkout,
  getExerciseById,
  getLastExercisePerformance,
  saveActiveSessionDraft,
  getActiveSessionDraft,
  clearActiveSessionDraft
} from '../database/database';
import {
  scheduleRestTimerNotification,
  cancelRestTimerNotification,
  triggerRestFinishedHaptics,
} from '../services/notificationService';
import { processSyncQueue } from '../services/syncQueueService';
import { useUserStore } from './userStore';
import { syncWorkoutSessionToHealth } from '../services/healthSyncService';


// Fórmula de Epley para estimativa de 1RM: Peso * (1 + Reps / 30)
export const calculateEstimated1RM = (weightKg: number, reps: number): number => {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  const val = weightKg * (1 + reps / 30);
  return Math.round(val * 10) / 10;
};

interface WorkoutStoreState {
  currentWorkout: WorkoutSession | null;
  workoutHistory: WorkoutSession[];
  personalRecords: Record<string, PersonalRecord>;
  restTimer: RestTimerState;
  focusedExerciseId: string | null;
  isSessionActiveInForeground: boolean;

  // Carregamento inicial do SQLite
  loadFromDatabase: () => void;

  // Gerenciamento de Foco
  setFocusedExercise: (id: string | null) => void;

  // Ações de Treino
  startWorkout: (name?: string) => void;
  startWorkoutFromRoutine: (routine: Routine) => void;
  resumeActiveSession: () => void;
  discardActiveSession: () => void;
  cancelWorkout: () => void;
  finishWorkout: () => WorkoutSession | null;
  
  // Ações de Exercício
  addExerciseToCurrentWorkout: (exercise: Exercise) => void;
  removeExerciseFromCurrentWorkout: (workoutExerciseId: string) => void;
  
  // Ações de Séries (Sets)
  addSet: (workoutExerciseId: string, type?: SetType) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (workoutExerciseId: string, setId: string) => void;
  applyOverloadRecommendation: (workoutExerciseId: string, suggestedWeightKg: number) => void;

  // Cronômetro de Descanso
  startRestTimer: (seconds: number, exerciseName?: string, exerciseId?: string) => void;
  addRestTimerSeconds: (seconds: number) => void;
  tickRestTimer: () => void;
  syncRestTimer: () => void;
  stopRestTimer: () => void;
}

export const useWorkoutStore = create<WorkoutStoreState>()(
  persist(
    (set, get) => ({
      currentWorkout: null,
      workoutHistory: [],
      personalRecords: {},
      focusedExerciseId: null,
      isSessionActiveInForeground: false,
      restTimer: {
        targetEndTime: null,
        remainingSeconds: 0,
        totalSeconds: 0,
        exerciseName: '',
        isRunning: false,
      },

      setFocusedExercise: (id: string | null) => {
        set({ focusedExerciseId: id });
      },

      resumeActiveSession: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        set({ isSessionActiveInForeground: true });
      },

      discardActiveSession: () => {
        const { currentWorkout } = get();
        if (currentWorkout) {
          try {
            deleteWorkoutSession(currentWorkout.id);
          } catch (err) {
            console.error('Erro ao deletar sessão ativa do SQLite:', err);
          }
        }
        clearActiveSessionDraft();
        cancelRestTimerNotification();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        set({
          currentWorkout: null,
          focusedExerciseId: null,
          isSessionActiveInForeground: false,
          restTimer: { targetEndTime: null, remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false },
        });
      },

      loadFromDatabase: () => {
        try {
          const history = getWorkoutHistory();
          const prs = getPersonalRecords();
          const activeDraft = getActiveSessionDraft();
          const activeSession = activeDraft || getActiveWorkoutSession();

          set({
            workoutHistory: history,
            personalRecords: prs,
            // Restaura sessão ativa se existir e não houver treino em memória
            currentWorkout: get().currentWorkout || activeSession || null,
            focusedExerciseId: get().focusedExerciseId || (activeSession?.exercises[0]?.id ?? null),
            // Ao hidratar após crash ou restart, mantém recolhido para exibir banner de recuperação
            isSessionActiveInForeground: false,
          });
        } catch (e) {
          console.error('Failed to load data from SQLite:', e);
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

        // Salva rascunho ativo imediatamente no SQLite e na tabela de crash recovery
        try {
          saveWorkoutSession(newSession);
          saveActiveSessionDraft(newSession);
        } catch (err) {
          console.error('Erro ao salvar rascunho de sessão ativa no SQLite:', err);
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        set({ 
          currentWorkout: newSession,
          focusedExerciseId: null,
          isSessionActiveInForeground: true,
        });
      },

      startWorkoutFromRoutine: (routine: Routine) => {
        const newSessionId = `workout_${Date.now()}`;

        const exercises: WorkoutExercise[] = routine.exercises.map((re, exIdx) => {
          const workoutExerciseId = `we_${Date.now()}_${exIdx}_${Math.random().toString(36).substr(2, 5)}`;

          // 1. Busca dados da última vez que o exercício foi executado (cargas e repetições "fantasma")
          let lastPerf: any = null;
          try {
            lastPerf = getLastExercisePerformance(re.exerciseId);
          } catch (e) {
            console.error('Erro ao buscar histórico do exercício:', e);
          }

          const numSets = Math.max(1, re.targetSets || lastPerf?.sets?.length || 3);
          const sets: WorkoutSet[] = [];

          for (let sIdx = 1; sIdx <= numSets; sIdx++) {
            const ghostSet = lastPerf?.sets?.[sIdx - 1];
            const initialWeight = ghostSet ? ghostSet.weightKg : (lastPerf?.bestWeightKg || 0);
            const initialReps = ghostSet ? ghostSet.reps : (re.targetRepsMin || 10);

            sets.push({
              id: `set_${Date.now()}_${exIdx}_${sIdx}`,
              setNumber: sIdx,
              type: (ghostSet?.type as SetType) || 'normal',
              weightKg: initialWeight,
              reps: initialReps,
              rpe: ghostSet?.rpe,
              rir: ghostSet?.rir,
              completed: false,
            });
          }

          return {
            id: workoutExerciseId,
            exerciseId: re.exerciseId,
            exerciseName: re.exerciseName,
            targetMuscle: re.targetMuscle,
            targetRepsMin: re.targetRepsMin,
            targetRepsMax: re.targetRepsMax,
            sets,
          };
        });

        const newSession: WorkoutSession = {
          id: newSessionId,
          routineId: routine.id,
          name: routine.name,
          startTime: new Date().toISOString(),
          durationSeconds: 0,
          exercises,
          totalTonnageKg: 0,
          totalSets: 0,
          isCompleted: false,
        };

        try {
          saveWorkoutSession(newSession);
          saveActiveSessionDraft(newSession);
        } catch (err) {
          console.error('Erro ao salvar sessão ativa da rotina no SQLite:', err);
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        set({
          currentWorkout: newSession,
          focusedExerciseId: exercises[0]?.id || null,
          isSessionActiveInForeground: true,
        });
      },

      cancelWorkout: () => {
        const { currentWorkout } = get();
        if (currentWorkout) {
          try {
            deleteWorkoutSession(currentWorkout.id);
          } catch (err) {
            console.error('Erro ao deletar sessão ativa do SQLite:', err);
          }
        }

        clearActiveSessionDraft();
        cancelRestTimerNotification();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        set({ 
          currentWorkout: null,
          focusedExerciseId: null,
          isSessionActiveInForeground: false,
          restTimer: { targetEndTime: null, remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false }
        });
      },

      finishWorkout: (): WorkoutSession | null => {
        const { currentWorkout } = get();
        if (!currentWorkout) return null;

        try {
          // Fecha o treino diretamente no banco calculando tonelagem e tempo
          const completed = completeWorkout(currentWorkout.id);
          const history = getWorkoutHistory();
          const prs = getPersonalRecords();

          cancelRestTimerNotification();
          clearActiveSessionDraft();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

          // Dispara sincronização em nuvem se houver conexão ativa
          processSyncQueue().catch(() => {});

          // Exporta sessão para Apple Health (iOS) ou Google Health Connect (Android)
          if (completed) {
            syncWorkoutSessionToHealth(completed).catch(() => {});
          }

          set({
            currentWorkout: null,
            focusedExerciseId: null,
            isSessionActiveInForeground: false,
            workoutHistory: history,
            personalRecords: prs,
            restTimer: { targetEndTime: null, remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false },
          });

          return completed;
        } catch (err) {
          console.error('Erro ao finalizar treino no SQLite:', err);
          return null;
        }
      },

      addExerciseToCurrentWorkout: (exercise: Exercise) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        const newWorkoutExerciseId = `we_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const initialSetId = `set_${Date.now()}_1`;

        const newWorkoutExercise: WorkoutExercise = {
          id: newWorkoutExerciseId,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetMuscle: exercise.targetMuscle,
          sets: [
            {
              id: initialSetId,
              setNumber: 1,
              type: 'normal',
              weightKg: 0,
              reps: 10,
              completed: false,
            },
          ],
        };

        const updatedSession: WorkoutSession = {
          ...currentWorkout,
          exercises: [...currentWorkout.exercises, newWorkoutExercise],
        };

        // Salva atualização no SQLite para persistência total e crash recovery
        try {
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao salvar exercício no SQLite:', err);
        }

        Haptics.selectionAsync().catch(() => {});

        set({
          currentWorkout: updatedSession,
          focusedExerciseId: newWorkoutExerciseId,
        });
      },

      removeExerciseFromCurrentWorkout: (workoutExerciseId: string) => {
        const { currentWorkout, focusedExerciseId } = get();
        if (!currentWorkout) return;

        const updatedExercises = currentWorkout.exercises.filter(e => e.id !== workoutExerciseId);
        const updatedSession: WorkoutSession = {
          ...currentWorkout,
          exercises: updatedExercises,
        };

        try {
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao remover exercício no SQLite:', err);
        }

        const nextFocus = focusedExerciseId === workoutExerciseId 
          ? (updatedExercises[0]?.id || null) 
          : focusedExerciseId;

        set({
          currentWorkout: updatedSession,
          focusedExerciseId: nextFocus,
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

        const updatedSession = { ...currentWorkout, exercises: updatedExercises };
        try {
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao adicionar set no SQLite:', err);
        }

        Haptics.selectionAsync().catch(() => {});
        set({ 
          currentWorkout: updatedSession,
          focusedExerciseId: workoutExerciseId,
        });
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

        const updatedSession = { ...currentWorkout, exercises: updatedExercises };
        try {
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao remover set no SQLite:', err);
        }

        set({ currentWorkout: updatedSession });
      },

      updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        let targetSet: WorkoutSet | null = null;
        const updatedExercises = currentWorkout.exercises.map(we => {
          if (we.id !== workoutExerciseId) return we;
          const updatedSets = we.sets.map(s => {
            if (s.id === setId) {
              targetSet = { ...s, ...updates };
              return targetSet;
            }
            return s;
          });
          return { ...we, sets: updatedSets };
        });

        const updatedSession = { ...currentWorkout, exercises: updatedExercises };

        // Auto-save local em segundo plano
        try {
          if (targetSet) {
            logSet({
              id: (targetSet as WorkoutSet).id,
              sessionExerciseId: workoutExerciseId,
              setNumber: (targetSet as WorkoutSet).setNumber,
              type: (targetSet as WorkoutSet).type,
              weightKg: (targetSet as WorkoutSet).weightKg,
              reps: (targetSet as WorkoutSet).reps,
              rpe: (targetSet as WorkoutSet).rpe,
              rir: (targetSet as WorkoutSet).rir,
              completed: (targetSet as WorkoutSet).completed,
            });
          }
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao salvar atualização do set no SQLite:', err);
        }

        set({ currentWorkout: updatedSession });
      },

      /**
       * Auto-save local no SQLite antes de disparar o timer de descanso
       */
      toggleSetCompleted: (workoutExerciseId: string, setId: string) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        let justCompleted = false;
        let exerciseName = '';
        let targetExerciseId = '';
        let targetSet: WorkoutSet | null = null;

        const updatedExercises = currentWorkout.exercises.map(we => {
          if (we.id !== workoutExerciseId) return we;
          exerciseName = we.exerciseName;
          targetExerciseId = we.exerciseId;

          const updatedSets = we.sets.map(s => {
            if (s.id === setId) {
              const newState = !s.completed;
              if (newState) justCompleted = true;
              targetSet = { 
                ...s, 
                completed: newState,
                completedAt: newState ? new Date().toISOString() : undefined,
              };
              return targetSet;
            }
            return s;
          });
          return { ...we, sets: updatedSets };
        });

        // 1. AUTO-SAVE LOCAL IMEDIATO NO SQLITE (COMMIT DIRETO ANTES DO TIMER)
        if (targetSet) {
          try {
            logSet({
              id: (targetSet as WorkoutSet).id,
              sessionExerciseId: workoutExerciseId,
              setNumber: (targetSet as WorkoutSet).setNumber,
              type: (targetSet as WorkoutSet).type,
              weightKg: (targetSet as WorkoutSet).weightKg,
              reps: (targetSet as WorkoutSet).reps,
              rpe: (targetSet as WorkoutSet).rpe,
              rir: (targetSet as WorkoutSet).rir,
              completed: (targetSet as WorkoutSet).completed,
            });

            // Atualiza PRs se houve novo recorde
            const updatedPRs = getPersonalRecords();
            set({ personalRecords: updatedPRs });
          } catch (err) {
            console.error('Erro no commit atômico do set no SQLite:', err);
          }
        }

        // 2. ATUALIZAÇÃO DO ESTADO DA SESSÃO, PERSISTÊNCIA DE RASCUNHO E FOCO
        const updatedSession = { ...currentWorkout, exercises: updatedExercises };
        try {
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao atualizar sessão e rascunho de crash recovery:', err);
        }

        set({ 
          currentWorkout: updatedSession,
          focusedExerciseId: workoutExerciseId,
        });

        // 3. DISPARO DO TIMER DE DESCANSO SE CONCLUÍDO
        if (justCompleted) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          
          // Recupera o tempo de descanso padrão do exercício ou das preferências do atleta
          let restSeconds = useUserStore.getState().preferences?.defaultRestSeconds || 90;
          try {
            const exInfo = getExerciseById(targetExerciseId);
            if (exInfo?.defaultRestSeconds && exInfo.defaultRestSeconds > 0) {
              restSeconds = exInfo.defaultRestSeconds;
            }
          } catch {}

          get().startRestTimer(restSeconds, exerciseName, targetExerciseId);
        } else {
          Haptics.selectionAsync().catch(() => {});
        }
      },

      applyOverloadRecommendation: (workoutExerciseId: string, suggestedWeightKg: number) => {
        const { currentWorkout } = get();
        if (!currentWorkout) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        const updatedExercises = currentWorkout.exercises.map(ex => {
          if (ex.id !== workoutExerciseId) return ex;

          // Atualiza as séries não concluídas com a nova carga recomendada
          const updatedSets = ex.sets.map(s => {
            if (s.completed) return s;
            return {
              ...s,
              weightKg: suggestedWeightKg,
            };
          });

          return {
            ...ex,
            sets: updatedSets,
          };
        });

        const updatedSession = { ...currentWorkout, exercises: updatedExercises };
        try {
          saveWorkoutSession(updatedSession);
          saveActiveSessionDraft(updatedSession);
        } catch (err) {
          console.error('Erro ao salvar rascunho com recomendação de carga:', err);
        }

        set({ currentWorkout: updatedSession });
      },

      startRestTimer: (seconds: number, exerciseName: string = '', exerciseId?: string) => {
        const targetEndTime = Date.now() + seconds * 1000;
        // Agenda notificação em background para alertar o atleta mesmo com o app minimizado
        scheduleRestTimerNotification(seconds, exerciseName);

        set({
          restTimer: {
            targetEndTime,
            remainingSeconds: seconds,
            totalSeconds: seconds,
            exerciseId,
            exerciseName,
            isRunning: true,
          },
        });
      },

      addRestTimerSeconds: (seconds: number) => {
        const { restTimer } = get();
        if (restTimer.isRunning && restTimer.targetEndTime) {
          const newRemaining = restTimer.remainingSeconds + seconds;
          const newTargetEndTime = restTimer.targetEndTime + seconds * 1000;
          const newTotal = restTimer.totalSeconds + seconds;

          // Re-agenda alarme de término e atualiza Ongoing Notification / Live Activity
          scheduleRestTimerNotification(newRemaining, restTimer.exerciseName);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

          set({
            restTimer: {
              ...restTimer,
              remainingSeconds: newRemaining,
              targetEndTime: newTargetEndTime,
              totalSeconds: newTotal,
            },
          });
        } else {
          get().startRestTimer(seconds);
        }
      },

      tickRestTimer: () => {
        const { restTimer } = get();
        if (!restTimer.isRunning || !restTimer.targetEndTime) return;

        const remaining = Math.max(0, Math.ceil((restTimer.targetEndTime - Date.now()) / 1000));

        if (remaining <= 0) {
          triggerRestFinishedHaptics();
          cancelRestTimerNotification();
          set({
            restTimer: { 
              ...restTimer, 
              remainingSeconds: 0, 
              targetEndTime: null, 
              isRunning: false 
            },
          });
        } else if (remaining !== restTimer.remainingSeconds) {
          set({
            restTimer: { ...restTimer, remainingSeconds: remaining },
          });
        }
      },

      syncRestTimer: () => {
        const { restTimer } = get();
        if (!restTimer.isRunning || !restTimer.targetEndTime) return;

        const remaining = Math.max(0, Math.ceil((restTimer.targetEndTime - Date.now()) / 1000));
        if (remaining <= 0) {
          // O tempo expirou enquanto o app estava minimizado
          triggerRestFinishedHaptics();
          cancelRestTimerNotification();
          set({
            restTimer: { 
              ...restTimer, 
              remainingSeconds: 0, 
              targetEndTime: null, 
              isRunning: false 
            },
          });
        } else {
          set({
            restTimer: { ...restTimer, remainingSeconds: remaining },
          });
        }
      },

      stopRestTimer: () => {
        cancelRestTimerNotification();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        set({
          restTimer: { targetEndTime: null, remainingSeconds: 0, totalSeconds: 0, exerciseName: '', isRunning: false },
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
        focusedExerciseId: state.focusedExerciseId,
        restTimer: state.restTimer,
      }),
    }
  )
);

