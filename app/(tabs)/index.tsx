import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert 
} from 'react-native';
import { 
  Play, 
  Plus, 
  Flame, 
  Trophy, 
  CheckCircle2, 
  X, 
  Clock, 
  Sparkles,
  Dumbbell
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { WorkoutExerciseCard } from '../../src/components/WorkoutExerciseCard';
import { AddExerciseModal } from '../../src/components/AddExerciseModal';
import { RestTimerBar } from '../../src/components/RestTimerBar';
import { getExerciseById } from '../../src/database/database';
import Theme from '../../src/theme/theme';

export default function WorkoutScreen() {
  const { 
    currentWorkout, 
    startWorkout, 
    cancelWorkout, 
    finishWorkout, 
    addExerciseToCurrentWorkout,
    workoutHistory,
    personalRecords 
  } = useWorkoutStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer de duração do treino ativo
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (currentWorkout) {
      const startMs = new Date(currentWorkout.startTime).getTime();
      const updateElapsed = () => {
        const nowMs = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      updateElapsed();
      timer = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
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

  const handleFinishWorkout = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      Alert.alert('Treino Vazio', 'Adicione pelo menos um exercício antes de finalizar.');
      return;
    }
    finishWorkout();
    Alert.alert('Treino Concluído!', 'Excelente sessão de força registrada com sucesso!');
  };

  const startTemplate = (templateName: string, exerciseIds: string[]) => {
    startWorkout(templateName);
    // Adicionar exercícios do template
    setTimeout(() => {
      exerciseIds.forEach(id => {
        const ex = getExerciseById(id);
        if (ex) addExerciseToCurrentWorkout(ex);
      });
    }, 50);
  };

  // Se não há treino ativo: Dashboard inicial
  if (!currentWorkout) {
    const totalPRs = Object.keys(personalRecords).length;
    const lastWorkout = workoutHistory[0];

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brandTitle}>heavy<Text style={styles.brandAccent}>.io</Text></Text>
              <Text style={styles.brandSubtitle}>FORÇA & HIPERTROFIA</Text>
            </View>
            <View style={styles.badgePro}>
              <Flame size={14} color={Theme.colors.accentTitanium} />
              <Text style={styles.badgeProText}>MODO FORÇA</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{workoutHistory.length}</Text>
              <Text style={styles.statLabel}>Treinos Feitos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Theme.colors.text }]}>{totalPRs}</Text>
              <Text style={styles.statLabel}>Recordes (PRs)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {lastWorkout ? `${lastWorkout.totalTonnageKg}kg` : '--'}
              </Text>
              <Text style={styles.statLabel}>Última Carga</Text>
            </View>
          </View>

          {/* Start Blank Workout Button */}
          <TouchableOpacity 
            style={styles.mainStartBtn} 
            onPress={() => startWorkout('Treino Livre de Força')}
            activeOpacity={0.8}
          >
            <View style={styles.playIconContainer}>
              <Play size={22} color={Theme.colors.textInverse} fill={Theme.colors.textInverse} />
            </View>
            <View>
              <Text style={styles.mainStartTitle}>Iniciar Treino Vazio</Text>
              <Text style={styles.mainStartSubtitle}>Monte seu treino série a série agora</Text>
            </View>
          </TouchableOpacity>

          {/* Templates de Treino de Força */}
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color={Theme.colors.accentTitanium} />
            <Text style={styles.sectionTitle}>Templates Rápidos de Treino</Text>
          </View>

          {/* Template 1: Push (Peito, Ombros, Tríceps) */}
          <TouchableOpacity 
            style={styles.templateCard}
            onPress={() => startTemplate('Push (Empurrar / Peito & Ombros)', ['barbell_bench_press', 'overhead_press_barbell_standing', 'cable_triceps_pushdown_rope'])}
            activeOpacity={0.7}
          >
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>Push (Peito, Ombros & Tríceps)</Text>
              <Text style={styles.templateBadge}>3 EXERCÍCIOS</Text>
            </View>
            <Text style={styles.templateExercises}>
              Supino Reto • Desenvolvimento Militar • Tríceps Corda
            </Text>
          </TouchableOpacity>

          {/* Template 2: Pull (Costas, Bíceps & Trapézio) */}
          <TouchableOpacity 
            style={styles.templateCard}
            onPress={() => startTemplate('Pull (Puxar / Costas & Bíceps)', ['deadlift_conventional', 'pull_up_pronated', 'ez_bar_curl'])}
            activeOpacity={0.7}
          >
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>Pull (Costas, Dorsal & Bíceps)</Text>
              <Text style={styles.templateBadge}>3 EXERCÍCIOS</Text>
            </View>
            <Text style={styles.templateExercises}>
              Levantamento Terra • Barra Fixa • Rosca Direta W
            </Text>
          </TouchableOpacity>

          {/* Template 3: Legs (Pernas & Posterior) */}
          <TouchableOpacity 
            style={styles.templateCard}
            onPress={() => startTemplate('Legs (Inferiores & Força)', ['barbell_back_squat_high_bar', 'leg_press_45_degree', 'stiff_leg_deadlift_barbell', 'standing_calf_raise_machine'])}
            activeOpacity={0.7}
          >
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>Legs (Pernas Completas)</Text>
              <Text style={styles.templateBadge}>4 EXERCÍCIOS</Text>
            </View>
            <Text style={styles.templateExercises}>
              Agachamento Livre • Leg Press 45º • Stiff • Panturrilha
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Se HÁ um treino ativo:
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.activeContainer}>
        {/* Active Header */}
        <View style={styles.activeHeader}>
          <View>
            <Text style={styles.activeWorkoutTitle} numberOfLines={1}>
              {currentWorkout.name}
            </Text>
            <View style={styles.timerRow}>
              <Clock size={13} color={Theme.colors.primary} />
              <Text style={styles.elapsedText}>{formatElapsed(elapsedSeconds)}</Text>
            </View>
          </View>

          <View style={styles.activeHeaderActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={handleCancelWorkout}
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

        {/* Cronômetro Flutuante de Descanso */}
        <RestTimerBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
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
  badgePro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 4,
  },
  badgeProText: {
    color: Theme.colors.accentFlame,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
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
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
  mainStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.lg,
    padding: 18,
    gap: 16,
    marginBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  playIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStartTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
  mainStartSubtitle: {
    fontSize: 12,
    color: 'rgba(11, 12, 16, 0.75)',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  templateCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  templateBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  templateExercises: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },

  // Active Workout View
  activeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  activeWorkoutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
    maxWidth: 180,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  elapsedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  activeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    paddingBottom: 160,
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
    backgroundColor: Theme.colors.surface,
    gap: 8,
    marginTop: 8,
  },
  addExerciseText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
