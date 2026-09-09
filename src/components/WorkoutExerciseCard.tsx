import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Trash2, Dumbbell, TrendingUp, ShieldAlert, Activity } from 'lucide-react-native';
import { WorkoutExercise } from '../types/workout';
import { SetRow } from './SetRow';
import { useWorkoutStore } from '../store/workoutStore';
import { getLastExercisePerformance } from '../database/database';
import { calculateProgressiveOverload } from '../services/progressiveOverloadEngine';
import Theme from '../theme/theme';

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseCard: React.FC<WorkoutExerciseCardProps> = ({
  workoutExercise,
}) => {
  const { 
    addSet, 
    removeSet, 
    updateSet, 
    toggleSetCompleted, 
    removeExerciseFromCurrentWorkout,
    applyOverloadRecommendation,
    personalRecords,
    focusedExerciseId,
    setFocusedExercise
  } = useWorkoutStore();

  const pr = personalRecords[workoutExercise.exerciseId];
  const isFocused = focusedExerciseId === workoutExercise.id;

  const completedSets = workoutExercise.sets.filter(s => s.completed).length;
  const totalSets = workoutExercise.sets.length;

  // Recupera o desempenho anterior (fantasma) deste exercício no banco local
  const lastPerformance = useMemo(() => {
    return getLastExercisePerformance(workoutExercise.exerciseId);
  }, [workoutExercise.exerciseId]);

  // Inteligência de Sobrecarga Progressiva e Consolidação (janela de 3 a 5 sessões + RIR)
  const overloadRec = useMemo(() => {
    const currentWeight = workoutExercise.sets.find(s => s.weightKg > 0)?.weightKg || 0;
    return calculateProgressiveOverload({
      exerciseId: workoutExercise.exerciseId,
      targetRepsMin: workoutExercise.targetRepsMin,
      targetRepsMax: workoutExercise.targetRepsMax,
      currentWeightKg: currentWeight,
    });
  }, [
    workoutExercise.exerciseId,
    workoutExercise.targetRepsMin,
    workoutExercise.targetRepsMax,
    workoutExercise.sets,
  ]);

  return (
    <View style={[styles.card, isFocused && styles.cardFocused]}>
      {/* Cabeçalho do Exercício */}
      <TouchableOpacity 
        style={styles.header}
        activeOpacity={0.9}
        onPress={() => setFocusedExercise(workoutExercise.id)}
      >
        <View style={styles.titleArea}>
          <View style={[styles.iconBox, isFocused && styles.iconBoxFocused]}>
            <Dumbbell size={18} color={isFocused ? Theme.colors.primary : Theme.colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {workoutExercise.exerciseName}
              </Text>
              {isFocused && (
                <View style={styles.focusPill}>
                  <Text style={styles.focusPillText}>EM FOCO</Text>
                </View>
              )}
            </View>
            <View style={styles.subHeader}>
              <View style={styles.muscleBadge}>
                <Text style={styles.muscleText}>
                  {workoutExercise.targetMuscle.toUpperCase()}
                </Text>
              </View>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>
                  {completedSets}/{totalSets} SÉRIES
                </Text>
              </View>
              {pr && (
                <Text style={styles.prText}>
                  PR: {pr.maxWeightKg}kg
                </Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.deleteExerciseBtn}
          onPress={() => removeExerciseFromCurrentWorkout(workoutExercise.id)}
        >
          <Trash2 size={18} color={Theme.colors.danger} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Banner de Sobrecarga Progressiva & Consolidação Técnica */}
      {overloadRec && overloadRec.type !== 'insufficient_data' && (
        <View style={[
          styles.recommendationBox,
          overloadRec.type === 'increase' && styles.recBoxIncrease,
          overloadRec.type === 'consolidate' && styles.recBoxConsolidate,
        ]}>
          <View style={styles.recHeaderRow}>
            <View style={styles.recBadgeGroup}>
              {overloadRec.type === 'increase' ? (
                <TrendingUp size={14} color="#10B981" />
              ) : overloadRec.type === 'consolidate' ? (
                <ShieldAlert size={14} color="#F59E0B" />
              ) : (
                <Activity size={14} color={Theme.colors.textSecondary} />
              )}
              <Text style={[
                styles.recTitle,
                overloadRec.type === 'increase' && styles.recTitleIncrease,
                overloadRec.type === 'consolidate' && styles.recTitleConsolidate,
              ]}>
                {overloadRec.title}
              </Text>
            </View>

            {overloadRec.type === 'increase' && (
              <TouchableOpacity
                style={styles.applyRecBtn}
                activeOpacity={0.8}
                onPress={() => applyOverloadRecommendation(workoutExercise.id, overloadRec.suggestedWeightKg)}
              >
                <Text style={styles.applyRecBtnText}>
                  APLICAR {overloadRec.suggestedWeightKg} KG
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.recRationaleText}>
            {overloadRec.rationale}
          </Text>

          {/* Rodapé técnico da janela analisada */}
          <View style={styles.recMetaRow}>
            <Text style={styles.recMetaText}>
              Janela: {overloadRec.sessionsAnalyzed} {overloadRec.sessionsAnalyzed === 1 ? 'sessão' : 'sessões'}
            </Text>
            <Text style={styles.recMetaDot}>•</Text>
            <Text style={styles.recMetaText}>
              RIR médio: {overloadRec.recentAvgRir !== undefined ? overloadRec.recentAvgRir.toFixed(1) : '-'}
            </Text>
            <Text style={styles.recMetaDot}>•</Text>
            <Text style={styles.recMetaText}>
              Séries válidas: {overloadRec.recentValidSetsCount}
            </Text>
          </View>
        </View>
      )}

      {/* Cabeçalho da Tabela */}
      <View style={styles.tableHeader}>
        <Text style={[styles.columnLabel, { width: 34 }]}>SÉRIE</Text>
        <Text style={[styles.columnLabel, { width: 64, textAlign: 'center' }]}>ANTERIOR</Text>
        <Text style={[styles.columnLabel, { flex: 1, textAlign: 'center' }]}>PESO</Text>
        <Text style={[styles.columnLabel, { flex: 1, textAlign: 'center' }]}>REPS</Text>
        <Text style={[styles.columnLabel, { width: 44, textAlign: 'center' }]}>STATUS</Text>
      </View>

      {/* Lista de Séries */}
      {workoutExercise.sets.map((set, index) => {
        const prevSet = lastPerformance?.sets[index];
        const prevString = prevSet ? `${prevSet.weightKg}k × ${prevSet.reps}` : undefined;

        return (
          <SetRow
            key={set.id}
            workoutExerciseId={workoutExercise.id}
            set={set}
            previousPerformance={prevString}
            onUpdate={(updates) => updateSet(workoutExercise.id, set.id, updates)}
            onToggleComplete={() => toggleSetCompleted(workoutExercise.id, set.id)}
            onDelete={() => removeSet(workoutExercise.id, set.id)}
          />
        );
      })}

      {/* Botão Adicionar Série */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={() => addSet(workoutExercise.id, 'normal')}
        activeOpacity={0.7}
      >
        <Plus size={16} color={Theme.colors.primary} />
        <Text style={styles.addSetText}>Adicionar Série</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardFocused: {
    borderColor: Theme.colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxFocused: {
    backgroundColor: Theme.colors.primaryMuted,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusPill: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  focusPillText: {
    color: Theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  muscleBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressBadge: {
    backgroundColor: Theme.colors.surfaceCard,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  progressBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  prText: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteExerciseBtn: {
    padding: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  columnLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.primaryMuted,
    marginTop: 6,
    gap: 6,
  },
  addSetText: {
    color: Theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  // Estilos do Banner de Sobrecarga e Consolidação (AGENTS.md)
  recommendationBox: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.sm,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  recBoxIncrease: {
    borderColor: '#10B981',
    borderLeftWidth: 3,
  },
  recBoxConsolidate: {
    borderColor: '#F59E0B',
    borderLeftWidth: 3,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  recTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  recTitleIncrease: {
    color: '#10B981',
  },
  recTitleConsolidate: {
    color: '#F59E0B',
  },
  applyRecBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  applyRecBtnText: {
    color: '#09090B',
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  recRationaleText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  recMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  recMetaText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recMetaDot: {
    color: Theme.colors.borderLight,
    fontSize: 10,
  },
});
