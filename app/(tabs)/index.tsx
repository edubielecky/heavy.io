import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { 
  Play, 
  Plus, 
  Flame, 
  Trophy, 
  CheckCircle2, 
  X, 
  Clock, 
  Sparkles, 
  Dumbbell,
  Calendar,
  Layers,
  ChevronRight,
  RotateCcw
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { WorkoutExerciseCard } from '../../src/components/WorkoutExerciseCard';
import { AddExerciseModal } from '../../src/components/AddExerciseModal';
import { RestTimerBar } from '../../src/components/RestTimerBar';
import { WorkoutSummaryModal } from '../../src/components/WorkoutSummaryModal';
import { RoutineManagementModal } from '../../src/components/RoutineManagementModal';
import { getExerciseById, getRoutines, getActiveProgram, getSessionPRs } from '../../src/database/database';
import { Routine, WorkoutSession, PersonalRecord, WorkoutProgram } from '../../src/types/workout';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Theme from '../../src/theme/theme';

export default function WorkoutScreen() {
  const { 
    currentWorkout, 
    isSessionActiveInForeground,
    startWorkout, 
    startWorkoutFromRoutine,
    resumeActiveSession,
    discardActiveSession,
    cancelWorkout, 
    finishWorkout, 
    addExerciseToCurrentWorkout,
    workoutHistory,
    personalRecords,
    loadFromDatabase 
  } = useWorkoutStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeProgram, setActiveProgramState] = useState<WorkoutProgram | null>(null);
  const [isRoutineManagerOpen, setIsRoutineManagerOpen] = useState(false);

  // Estado do Modal de Conclusão de Treino (Workout Summary Modal)
  const [summarySession, setSummarySession] = useState<WorkoutSession | null>(null);
  const [summaryPRs, setSummaryPRs] = useState<PersonalRecord[]>([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const loadRoutinesAndProgram = useCallback(() => {
    try {
      const loadedRoutines = getRoutines();
      setRoutines(loadedRoutines);
      const activeProg = getActiveProgram();
      setActiveProgramState(activeProg);
    } catch (err) {
      console.error('Erro ao carregar rotinas no dashboard:', err);
    }
  }, []);

  // Recarrega dados do SQLite sempre que a aba ganha foco
  useFocusEffect(
    useCallback(() => {
      loadFromDatabase();
      loadRoutinesAndProgram();
    }, [loadFromDatabase, loadRoutinesAndProgram])
  );

  // Timer de duração do treino ativo e controle de Wake Lock (Keep Awake)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (currentWorkout) {
      // Impede que a tela apague durante as séries e descansos
      activateKeepAwakeAsync().catch(() => {});

      const startMs = new Date(currentWorkout.startTime).getTime();
      const updateElapsed = () => {
        const nowMs = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      updateElapsed();
      timer = setInterval(updateElapsed, 1000);
    } else {
      deactivateKeepAwake().catch(() => {});
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
      deactivateKeepAwake().catch(() => {});
    };
  }, [currentWorkout]);

  const formatElapsed = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Descartar Treino?',
      'Todo o progresso deste treino ativo será perdido.',
      [
        { text: 'Continuar Treinando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: cancelWorkout },
      ]
    );
  };

  const handleDiscardRecoveryWorkout = () => {
    Alert.alert(
      'Descartar Treino em Andamento?',
      'Deseja realmente descartar este treino? Todos os dados não finalizados serão perdidos.',
      [
        { text: 'Continuar Treino', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: discardActiveSession },
      ]
    );
  };

  const handleFinishWorkout = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      Alert.alert('Treino Vazio', 'Adicione pelo menos um exercício antes de finalizar.');
      return;
    }

    const sessionToFinish = currentWorkout;
    const completed = finishWorkout();
    const finalSession = completed || sessionToFinish;

    // Busca recordes pessoais conquistados na sessão
    let prs: PersonalRecord[] = [];
    try {
      prs = getSessionPRs(finalSession.id);
    } catch (e) {
      console.error('Erro ao buscar PRs da sessão:', e);
    }

    setSummarySession(finalSession);
    setSummaryPRs(prs);
    setIsSummaryModalOpen(true);
  };

  const handleCloseSummary = () => {
    setIsSummaryModalOpen(false);
    setSummarySession(null);
    setSummaryPRs([]);
    loadFromDatabase();
  };

  // 1. DETECÇÃO DO TREINO DO DIA (Lógica cíclica baseada no histórico)
  const routineOfTheDay = useMemo(() => {
    if (routines.length === 0) return null;

    // Prioriza rotinas do usuário (isSystem === false)
    const userRoutines = routines.filter(r => !r.isSystem);
    const pool = userRoutines.length > 0 ? userRoutines : routines;

    if (workoutHistory.length > 0) {
      const lastWorkout = workoutHistory[0];
      const lastIndex = pool.findIndex(
        r => r.name.toLowerCase() === lastWorkout.name.toLowerCase() || r.id === lastWorkout.routineId
      );

      if (lastIndex !== -1) {
        // Próxima rotina no ciclo
        const nextIndex = (lastIndex + 1) % pool.length;
        return pool[nextIndex];
      }
    }

    // Se ainda não houve treinos ou não encontrou correspondência, pega a primeira
    return pool[0];
  }, [routines, workoutHistory]);

  // Outras rotinas disponíveis na grade
  const otherRoutines = useMemo(() => {
    if (!routineOfTheDay) return routines;
    return routines.filter(r => r.id !== routineOfTheDay.id);
  }, [routines, routineOfTheDay]);

  // =========================================================
  // VIEW: QUANDO NÃO HÁ TREINO ATIVO NO PRIMEIRO PLANO (DASHBOARD)
  // =========================================================
  if (!currentWorkout || !isSessionActiveInForeground) {
    const totalPRs = Object.keys(personalRecords).length;
    const lastWorkout = workoutHistory[0];

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Superior Minimalista */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brandTitle}>heavy<Text style={styles.brandAccent}>.io</Text></Text>
              <Text style={styles.brandSubtitle}>FORÇA & HIPERTROFIA</Text>
            </View>
            <View style={styles.badgeMode}>
              <Flame size={13} color={Theme.colors.primary} />
              <Text style={styles.badgeModeText}>MODO FORÇA</Text>
            </View>
          </View>

          {/* BANNER DE RESILIÊNCIA E RECUPERAÇÃO DE TREINO (CRASH RECOVERY) */}
          {currentWorkout && !isSessionActiveInForeground && (
            <View style={styles.recoveryCard}>
              <View style={styles.recoveryHeader}>
                <View style={styles.recoveryBadge}>
                  <RotateCcw size={12} color={Theme.colors.warning} />
                  <Text style={styles.recoveryBadgeText}>TREINO INTERROMPIDO</Text>
                </View>
                <Text style={styles.recoveryTimeText}>{formatElapsed(elapsedSeconds)} decorridos</Text>
              </View>

              <Text style={styles.recoveryTitle}>Retomar treino em andamento?</Text>
              <Text style={styles.recoverySubtitle}>
                {currentWorkout.name} • {currentWorkout.exercises.length} exercício(s) • {
                  currentWorkout.exercises.reduce((acc, we) => acc + we.sets.filter(s => s.completed).length, 0)
                } série(s) feita(s)
              </Text>

              <View style={styles.recoveryActions}>
                <TouchableOpacity 
                  style={styles.recoveryResumeBtn} 
                  onPress={resumeActiveSession}
                  activeOpacity={0.8}
                >
                  <Play size={14} color={Theme.colors.textInverse} fill={Theme.colors.textInverse} />
                  <Text style={styles.recoveryResumeText}>Continuar Treino</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.recoveryDiscardBtn} 
                  onPress={handleDiscardRecoveryWorkout}
                  activeOpacity={0.8}
                >
                  <X size={14} color={Theme.colors.textSecondary} />
                  <Text style={styles.recoveryDiscardText}>Descartar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Metrics */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{workoutHistory.length}</Text>
              <Text style={styles.statLabel}>Treinos Feitos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Theme.colors.primary }]}>{totalPRs}</Text>
              <Text style={styles.statLabel}>Recordes (PRs)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {lastWorkout ? `${lastWorkout.totalTonnageKg}kg` : '--'}
              </Text>
              <Text style={styles.statLabel}>Última Carga</Text>
            </View>
          </View>

          {/* ===================================================== */}
          {/* DETECÇÃO DE TREINO DO DIA (HERO CARD)                 */}
          {/* ===================================================== */}
          {routineOfTheDay && (
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadgeActive}>
                    <Calendar size={11} color={Theme.colors.textInverse} />
                    <Text style={styles.heroBadgeActiveText}>TREINO PROGRAMADO</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.programChipBtn}
                    onPress={() => setIsRoutineManagerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Layers size={10} color={Theme.colors.primary} />
                    <Text style={styles.programChipText} numberOfLines={1}>
                      {activeProgram?.name || 'Ficha Ativa'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.heroBadgeCount}>
                    {routineOfTheDay.exercises.length} EXERCÍCIOS
                  </Text>
                </View>

                <Text style={styles.heroTitle} numberOfLines={2}>
                  {routineOfTheDay.name}
                </Text>

                {routineOfTheDay.description && (
                  <Text style={styles.heroDesc} numberOfLines={2}>
                    {routineOfTheDay.description}
                  </Text>
                )}
              </View>

              {/* Prévia da Lista de Exercícios */}
              <View style={styles.heroExercisesPreview}>
                <Text style={styles.heroPreviewHeading}>EXERCÍCIOS ESCALADOS:</Text>
                <Text style={styles.heroPreviewText} numberOfLines={2}>
                  {routineOfTheDay.exercises.map(e => e.exerciseName).join(' • ')}
                </Text>
              </View>

              {/* Botão de Início da Sessão Programada */}
              <TouchableOpacity
                style={styles.heroStartBtn}
                onPress={() => startWorkoutFromRoutine(routineOfTheDay)}
                activeOpacity={0.85}
              >
                <View style={styles.heroPlayCircle}>
                  <Play size={20} color={Theme.colors.textInverse} fill={Theme.colors.textInverse} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroStartBtnTitle}>Iniciar Treino</Text>
                  <Text style={styles.heroStartBtnSub}>Carrega cargas anteriores automaticamente</Text>
                </View>
                <ChevronRight size={18} color={Theme.colors.textInverse} />
              </TouchableOpacity>
            </View>
          )}

          {/* ===================================================== */}
          {/* OUTRAS SESSÕES DA GRADE                              */}
          {/* ===================================================== */}
          {otherRoutines.length > 0 && (
            <View style={styles.otherSection}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Layers size={15} color={Theme.colors.textSecondary} />
                  <Text style={styles.sectionTitle}>Sessões da Grade</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.newRoutineHeaderBtn}
                    onPress={() => setIsRoutineManagerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Plus size={12} color={Theme.colors.textInverse} />
                    <Text style={styles.newRoutineHeaderBtnText}>Nova Ficha</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.manageRoutinesHeaderBtn}
                    onPress={() => setIsRoutineManagerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.manageRoutinesHeaderBtnText}>Fichas</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {otherRoutines.map(routine => (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.routineCard}
                  onPress={() => startWorkoutFromRoutine(routine)}
                  activeOpacity={0.75}
                >
                  <View style={styles.routineCardLeft}>
                    <View style={styles.routineCardHeader}>
                      <Text style={styles.routineCardName}>{routine.name}</Text>
                      <View style={styles.routineBadge}>
                        <Text style={styles.routineBadgeText}>
                          {routine.exercises.length} EX
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.routineCardExercises} numberOfLines={1}>
                      {routine.exercises.map(e => e.exerciseName).join(' • ')}
                    </Text>
                  </View>
                  <View style={styles.routineStartAction}>
                    <Play size={14} color={Theme.colors.text} fill={Theme.colors.text} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Iniciar Treino Vazio / Avulso */}
          <TouchableOpacity 
            style={styles.blankStartBtn} 
            onPress={() => startWorkout('Treino Livre de Força')}
            activeOpacity={0.8}
          >
            <Plus size={16} color={Theme.colors.textSecondary} />
            <Text style={styles.blankStartText}>Iniciar Treino Livre / Avulso</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Conclusão de Treino */}
        <WorkoutSummaryModal
          visible={isSummaryModalOpen}
          session={summarySession}
          prs={summaryPRs}
          onClose={handleCloseSummary}
        />

        {/* Modal de Gestão de Fichas e Rotinas */}
        <RoutineManagementModal
          visible={isRoutineManagerOpen}
          onClose={() => setIsRoutineManagerOpen(false)}
          onProgramsUpdated={loadRoutinesAndProgram}
        />
      </SafeAreaView>
    );
  }

  // =========================================================
  // VIEW: SESSÃO ATIVA EM ANDAMENTO (ACTIVE WORKOUT VIEW)
  // =========================================================
  const totalDoneSets = currentWorkout.exercises.reduce(
    (acc, we) => acc + we.sets.filter(s => s.completed).length,
    0
  );
  const totalPendingSets = currentWorkout.exercises.reduce(
    (acc, we) => acc + we.sets.filter(s => !s.completed).length,
    0
  );
  const liveTonnage = currentWorkout.exercises.reduce(
    (acc, we) =>
      acc +
      we.sets
        .filter(s => s.completed)
        .reduce((sAcc, s) => sAcc + s.weightKg * s.reps, 0),
    0
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.activeContainer}>
        {/* Active Header */}
        <View style={styles.activeHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.activeWorkoutTitle} numberOfLines={1}>
              {currentWorkout.name}
            </Text>
            <View style={styles.timerRow}>
              <Clock size={12} color={Theme.colors.primary} />
              <Text style={styles.elapsedText}>{formatElapsed(elapsedSeconds)}</Text>
              <Text style={styles.metricsDot}>•</Text>
              <Text style={styles.metricsText}>{totalDoneSets} feitas</Text>
              <Text style={styles.metricsDot}>•</Text>
              <Text style={styles.metricsText}>{totalPendingSets} pendentes</Text>
              <Text style={styles.metricsDot}>•</Text>
              <Text style={styles.metricsText}>{Math.round(liveTonnage)}kg</Text>
            </View>
          </View>

          <View style={styles.activeHeaderActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={handleCancelWorkout}
              activeOpacity={0.7}
            >
              <X size={18} color={Theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.finishBtn} 
              onPress={handleFinishWorkout}
              activeOpacity={0.8}
            >
              <CheckCircle2 size={16} color={Theme.colors.textInverse} />
              <Text style={styles.finishBtnText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Workout Exercises Scroll */}
        <ScrollView 
          style={styles.exercisesScroll} 
          contentContainerStyle={styles.exercisesScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentWorkout.exercises.map((workoutExercise) => (
            <WorkoutExerciseCard 
              key={workoutExercise.id} 
              workoutExercise={workoutExercise} 
            />
          ))}

          {/* Adicionar Exercício Button */}
          <TouchableOpacity 
            style={styles.addExerciseBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color={Theme.colors.primary} />
            <Text style={styles.addExerciseText}>Adicionar Exercício ao Treino</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Escolha de Exercício */}
        <AddExerciseModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelectExercise={(ex) => addExerciseToCurrentWorkout(ex)}
        />

        {/* Dock do Cronômetro de Descanso (Renderizado na base da tela) */}
        <RestTimerBar />

        {/* Modal de Conclusão de Treino */}
        <WorkoutSummaryModal
          visible={isSummaryModalOpen}
          session={summarySession}
          prs={summaryPRs}
          onClose={handleCloseSummary}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Theme.colors.primary,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  badgeMode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    gap: 5,
  },
  badgeModeText: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#121215',
    padding: 14,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },

  // =========================================================
  // HERO CARD: TREINO DO DIA
  // =========================================================
  heroCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 18,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  heroHeader: {
    marginBottom: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  programChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    maxWidth: 130,
  },
  programChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  manageRoutinesHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  manageRoutinesHeaderBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  heroBadgeActiveText: {
    color: Theme.colors.textInverse,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  heroBadgeCount: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroTitle: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroDesc: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  heroExercisesPreview: {
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroPreviewHeading: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroPreviewText: {
    color: Theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  heroPlayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(9, 9, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStartBtnTitle: {
    color: Theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  heroStartBtnSub: {
    color: 'rgba(9, 9, 11, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },

  // =========================================================
  // OUTRAS SESSÕES DA GRADE
  // =========================================================
  otherSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  newRoutineHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.sm,
  },
  newRoutineHeaderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
  routineCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineCardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  routineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  routineCardName: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  routineBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  routineBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  routineCardExercises: {
    color: Theme.colors.textMuted,
    fontSize: 11,
  },
  routineStartAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },

  blankStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    borderStyle: 'dashed',
    backgroundColor: '#121215',
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  blankStartText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // =========================================================
  // ESTILOS DA SESSÃO ATIVA (ACTIVE WORKOUT)
  // =========================================================
  activeContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: '#121215',
  },
  activeWorkoutTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  elapsedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  metricsDot: {
    fontSize: 10,
    color: Theme.colors.borderLight,
  },
  metricsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  activeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    padding: 8,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    gap: 6,
  },
  finishBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  exercisesScroll: {
    flex: 1,
  },
  exercisesScrollContent: {
    padding: 16,
    paddingBottom: 170, // Espaço extra para o Dock flutuante do RestTimerBar
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    borderStyle: 'dashed',
    backgroundColor: '#121215',
    gap: 8,
    marginTop: 10,
  },
  addExerciseText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  // Estilos do Banner de Crash Recovery
  recoveryCard: {
    backgroundColor: '#16161A',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#3F3F46',
    padding: 16,
    marginBottom: 20,
  },
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recoveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  recoveryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.warning,
    letterSpacing: 0.5,
  },
  recoveryTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  recoverySubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginBottom: 14,
  },
  recoveryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recoveryResumeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.sm,
  },
  recoveryResumeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textInverse,
  },
  recoveryDiscardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  recoveryDiscardText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
});
