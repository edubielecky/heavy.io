import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { WorkoutSet, SetType } from '../types/workout';
import Theme from '../theme/theme';

interface SetRowProps {
  workoutExerciseId: string;
  set: WorkoutSet;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  onUpdate,
  onToggleComplete,
  onDelete,
}) => {
  const getBadgeStyle = (type: SetType) => {
    switch (type) {
      case 'warmup':
        return { label: 'W', bg: 'rgba(245, 158, 11, 0.15)', text: Theme.colors.warning };
      case 'drop':
        return { label: 'D', bg: 'rgba(168, 85, 247, 0.15)', text: Theme.colors.accentPurple };
      case 'failure':
        return { label: 'F', bg: 'rgba(239, 68, 68, 0.15)', text: Theme.colors.danger };
      default:
        return { label: `${set.setNumber}`, bg: Theme.colors.surfaceElevated, text: Theme.colors.textSecondary };
    }
  };

  const badge = getBadgeStyle(set.type);

  const cycleSetType = () => {
    const types: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
    const currentIndex = types.indexOf(set.type);
    const nextType = types[(currentIndex + 1) % types.length];
    onUpdate({ type: nextType });
  };

  return (
    <View style={[styles.row, set.completed && styles.rowCompleted]}>
      {/* Set Badge / Type Cycler */}
      <TouchableOpacity 
        style={[styles.badge, { backgroundColor: badge.bg }]} 
        onPress={cycleSetType}
        activeOpacity={0.7}
      >
        <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
      </TouchableOpacity>

      {/* Carga (Kg) */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, set.completed && styles.inputCompleted]}
          keyboardType="numeric"
          selectTextOnFocus
          value={set.weightKg === 0 ? '' : set.weightKg.toString()}
          placeholder="0"
          placeholderTextColor={Theme.colors.textMuted}
          onChangeText={(text) => {
            const val = parseFloat(text.replace(',', '.'));
            onUpdate({ weightKg: isNaN(val) ? 0 : val });
          }}
        />
        <Text style={styles.unitText}>kg</Text>
      </View>

      {/* Repetições */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, set.completed && styles.inputCompleted]}
          keyboardType="numeric"
          selectTextOnFocus
          value={set.reps === 0 ? '' : set.reps.toString()}
          placeholder="0"
          placeholderTextColor={Theme.colors.textMuted}
          onChangeText={(text) => {
            const val = parseInt(text, 10);
            onUpdate({ reps: isNaN(val) ? 0 : val });
          }}
        />
        <Text style={styles.unitText}>reps</Text>
      </View>

      {/* Botão de Excluir Série */}
      <TouchableOpacity 
        style={styles.deleteBtn} 
        onPress={onDelete}
        activeOpacity={0.6}
      >
        <Trash2 size={16} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      {/* Checkbox de Conclusão */}
      <TouchableOpacity
        style={[
          styles.checkBtn,
          set.completed ? styles.checkBtnCompleted : styles.checkBtnPending,
        ]}
        onPress={onToggleComplete}
        activeOpacity={0.8}
      >
        <Check
          size={18}
          color={set.completed ? Theme.colors.textInverse : Theme.colors.borderLight}
          strokeWidth={3}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceCard,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  rowCompleted: {
    backgroundColor: 'rgba(204, 255, 0, 0.04)',
    borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    height: 38,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  input: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  inputCompleted: {
    color: Theme.colors.primary,
  },
  unitText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  deleteBtn: {
    padding: 6,
    marginRight: 4,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkBtnPending: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  checkBtnCompleted: {
    backgroundColor: Theme.colors.primary,
  },
});
