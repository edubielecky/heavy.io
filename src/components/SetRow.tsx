import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { WorkoutSet, SetType } from '../types/workout';
import Theme from '../theme/theme';

interface SetRowProps {
  workoutExerciseId: string;
  set: WorkoutSet;
  previousPerformance?: string;
  previousWeight?: number;
  previousReps?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  previousPerformance,
  previousWeight,
  previousReps,
  targetRepsMin,
  targetRepsMax,
  onUpdate,
  onToggleComplete,
  onDelete,
}) => {
  // Estado local para digitação fluida sem interrupções de render/parsing
  const [weightText, setWeightText] = useState<string>(() =>
    set.weightKg === 0 ? '' : String(set.weightKg)
  );
  const [repsText, setRepsText] = useState<string>(() =>
    set.reps === 0 ? '' : String(set.reps)
  );

  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);

  // Sincroniza o estado local apenas quando o valor numérico mudar externamente
  useEffect(() => {
    const formatted = set.weightKg === 0 ? '' : String(set.weightKg);
    const currentParsed = parseFloat(weightText.replace(',', '.'));
    const propVal = set.weightKg;
    if (isNaN(currentParsed) ? propVal !== 0 : currentParsed !== propVal) {
      setWeightText(formatted);
    }
  }, [set.weightKg]);

  useEffect(() => {
    const formatted = set.reps === 0 ? '' : String(set.reps);
    const currentParsed = parseInt(repsText, 10);
    const propVal = set.reps;
    if (isNaN(currentParsed) ? propVal !== 0 : currentParsed !== propVal) {
      setRepsText(formatted);
    }
  }, [set.reps]);

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

  const handleWeightChange = (text: string) => {
    // Permite digitação contínua com ponto ou vírgula decimal (ex: "12", "12.", "12,5")
    if (text === '' || /^\d*([.,]\d*)?$/.test(text)) {
      setWeightText(text);

      const normalized = text.replace(',', '.');
      if (text === '' || text === '.' || text === ',') {
        onUpdate({ weightKg: 0 });
      } else {
        const val = parseFloat(normalized);
        if (!isNaN(val) && val >= 0) {
          onUpdate({ weightKg: val });
        }
      }
    }
  };

  const handleWeightBlur = () => {
    setIsWeightFocused(false);
    if (weightText === '' || weightText === '.' || weightText === ',') {
      setWeightText('');
      onUpdate({ weightKg: 0 });
    } else {
      const normalized = weightText.replace(',', '.');
      const val = parseFloat(normalized);
      if (!isNaN(val)) {
        setWeightText(val === 0 ? '' : String(val));
        onUpdate({ weightKg: val });
      }
    }
  };

  const handleRepsChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setRepsText(cleaned);

    if (cleaned === '') {
      onUpdate({ reps: 0 });
    } else {
      const val = parseInt(cleaned, 10);
      if (!isNaN(val) && val >= 0) {
        onUpdate({ reps: val });
      }
    }
  };

  const handleRepsBlur = () => {
    setIsRepsFocused(false);
    if (repsText === '') {
      setRepsText('');
      onUpdate({ reps: 0 });
    } else {
      const val = parseInt(repsText, 10);
      if (!isNaN(val)) {
        setRepsText(val === 0 ? '' : String(val));
        onUpdate({ reps: val });
      }
    }
  };

  const handleToggleComplete = () => {
    // Se a série ainda não foi concluída e os campos estiverem vazios/zerados,
    // preenche com os valores de referência anterior/meta (padrão de apps de precisão)
    if (!set.completed) {
      const updates: Partial<WorkoutSet> = {};

      if ((set.weightKg === 0 || weightText === '') && previousWeight && previousWeight > 0) {
        updates.weightKg = previousWeight;
        setWeightText(String(previousWeight));
      }

      if (set.reps === 0 || repsText === '') {
        const fallbackReps = (previousReps && previousReps > 0)
          ? previousReps
          : (targetRepsMin || 10);
        updates.reps = fallbackReps;
        setRepsText(String(fallbackReps));
      }

      if (Object.keys(updates).length > 0) {
        onUpdate(updates);
      }
    }

    onToggleComplete();
  };

  // Placeholders contextuais inteligentes
  const weightPlaceholder = previousWeight && previousWeight > 0 
    ? String(previousWeight) 
    : '0';

  const repsPlaceholder = previousReps && previousReps > 0 
    ? String(previousReps) 
    : targetRepsMin 
      ? String(targetRepsMin) 
      : '10';

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

      {/* Fantasma da Performance Anterior */}
      <View style={styles.previousBox}>
        <Text style={previousPerformance ? styles.previousText : styles.previousEmpty} numberOfLines={1}>
          {previousPerformance || '—'}
        </Text>
      </View>

      {/* Carga (Kg) */}
      <View 
        style={[
          styles.inputContainer,
          isWeightFocused && styles.inputContainerFocused,
          set.completed && styles.inputContainerCompleted,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            set.completed && styles.inputCompleted,
            Platform.OS === 'web' && ({ outline: 'none' } as any),
          ]}
          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
          inputMode="decimal"
          selectTextOnFocus
          value={weightText}
          placeholder={weightPlaceholder}
          placeholderTextColor={Theme.colors.borderLight}
          onChangeText={handleWeightChange}
          onFocus={() => setIsWeightFocused(true)}
          onBlur={handleWeightBlur}
          maxLength={6}
          returnKeyType="done"
        />
      </View>

      {/* Repetições */}
      <View 
        style={[
          styles.inputContainer,
          isRepsFocused && styles.inputContainerFocused,
          set.completed && styles.inputContainerCompleted,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            set.completed && styles.inputCompleted,
            Platform.OS === 'web' && ({ outline: 'none' } as any),
          ]}
          keyboardType="number-pad"
          inputMode="numeric"
          selectTextOnFocus
          value={repsText}
          placeholder={repsPlaceholder}
          placeholderTextColor={Theme.colors.borderLight}
          onChangeText={handleRepsChange}
          onFocus={() => setIsRepsFocused(true)}
          onBlur={handleRepsBlur}
          maxLength={4}
          returnKeyType="done"
        />
      </View>

      {/* Botão de Excluir Série */}
      <TouchableOpacity 
        style={styles.deleteBtn} 
        onPress={onDelete}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Trash2 size={15} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      {/* Checkbox de Conclusão */}
      <TouchableOpacity
        style={[
          styles.checkBtn,
          set.completed ? styles.checkBtnCompleted : styles.checkBtnPending,
        ]}
        onPress={handleToggleComplete}
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
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceCard,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  rowCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: Theme.colors.borderLight,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  previousBox: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  previousText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  previousEmpty: {
    color: Theme.colors.borderLight,
    fontSize: 12,
  },
  inputContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 4,
    marginHorizontal: 3,
    height: 36,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: '#18181B',
  },
  inputContainerCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: Theme.colors.border,
  },
  input: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  inputCompleted: {
    color: Theme.colors.primary,
  },
  deleteBtn: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
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
