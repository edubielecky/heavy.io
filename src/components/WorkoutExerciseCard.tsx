import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Trash2, Dumbbell } from 'lucide-react-native';
import { WorkoutExercise } from '../types/workout';
import { SetRow } from './SetRow';
import { useWorkoutStore } from '../store/workoutStore';
import { getLastExercisePerformance } from '../database/database';
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
});
