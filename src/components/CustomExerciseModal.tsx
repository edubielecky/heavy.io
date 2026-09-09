import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check, Dumbbell, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { 
  Exercise, 
  MuscleGroup, 
  Equipment, 
  ExerciseMechanic, 
  MovementPattern 
} from '../types/workout';
import { createCustomExercise, updateCustomExercise } from '../database/database';
import Theme from '../theme/theme';

interface CustomExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (savedExercise: Exercise) => void;
  exerciseToEdit?: Exercise | null;
}

const MUSCLE_OPTIONS: { label: string; value: MuscleGroup }[] = [
  { label: 'Peito', value: 'peito' },
  { label: 'Costas', value: 'costas' },
  { label: 'Quadríceps', value: 'quadriceps' },
  { label: 'Posteriores', value: 'isquiotibiais' },
  { label: 'Glúteos', value: 'gluteos' },
  { label: 'Ombros', value: 'ombros' },
  { label: 'Bíceps', value: 'biceps' },
  { label: 'Tríceps', value: 'triceps' },
  { label: 'Antebraço', value: 'antibraco' },
  { label: 'Panturrilhas', value: 'panturrilhas' },
  { label: 'Abdômen', value: 'abdomen' },
  { label: 'Lombar', value: 'lombar' },
  { label: 'Trapézio', value: 'trapezio' },
];

const EQUIPMENT_OPTIONS: { label: string; value: Equipment }[] = [
  { label: 'Barra', value: 'barbell' },
  { label: 'Halter', value: 'dumbbell' },
  { label: 'Polia / Cabo', value: 'cable' },
  { label: 'Máquina', value: 'machine' },
  { label: 'Smith', value: 'smith' },
  { label: 'Peso Corporal', value: 'bodyweight' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Outro', value: 'other' },
];

const MECHANIC_OPTIONS: { label: string; value: ExerciseMechanic; desc: string }[] = [
  { label: 'Composto', value: 'compound', desc: 'Multiarticular (ex: supino, agacho)' },
  { label: 'Isolado', value: 'isolation', desc: 'Monoarticular (ex: rosca, elevação)' },
];

const REST_PRESETS = [60, 90, 120, 180];

export const CustomExerciseModal: React.FC<CustomExerciseModalProps> = ({
  visible,
  onClose,
  onSave,
  exerciseToEdit,
}) => {
  const isEditing = !!exerciseToEdit;

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [targetMuscle, setTargetMuscle] = useState<MuscleGroup>('peito');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [mechanic, setMechanic] = useState<ExerciseMechanic>('compound');
  const [movementPattern, setMovementPattern] = useState<MovementPattern>('horizontal_push');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(90);
  const [instructions, setInstructions] = useState('');

  // Hidrata dados se estiver em modo de edição
  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name || '');
      setNameEn(exerciseToEdit.nameEn || '');
      setTargetMuscle(exerciseToEdit.targetMuscle || 'peito');
      setEquipment(exerciseToEdit.equipment || 'barbell');
      setMechanic(exerciseToEdit.mechanic || 'compound');
      setMovementPattern(exerciseToEdit.movementPattern || 'horizontal_push');
      setDefaultRestSeconds(exerciseToEdit.defaultRestSeconds || 90);
      setInstructions(exerciseToEdit.instructions || '');
    } else {
      // Reset para criação
      setName('');
      setNameEn('');
      setTargetMuscle('peito');
      setEquipment('barbell');
      setMechanic('compound');
      setMovementPattern('horizontal_push');
      setDefaultRestSeconds(90);
      setInstructions('');
    }
  }, [exerciseToEdit, visible]);

  // Sugere padrão de movimento apropriado com base no grupo muscular
  const handleSelectMuscle = (m: MuscleGroup) => {
    setTargetMuscle(m);
    Haptics.selectionAsync().catch(() => {});
    if (m === 'peito') setMovementPattern('horizontal_push');
    else if (m === 'costas') setMovementPattern('horizontal_pull');
    else if (m === 'quadriceps') setMovementPattern('squat');
    else if (m === 'isquiotibiais' || m === 'gluteos') setMovementPattern('hinge');
    else if (m === 'ombros') setMovementPattern('vertical_push');
    else if (m === 'panturrilhas') setMovementPattern('calf_raise');
    else setMovementPattern('isolation');
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nome Obrigatório', 'Por favor, informe o nome do exercício.');
      return;
    }

    try {
      if (isEditing && exerciseToEdit) {
        const updated = updateCustomExercise(exerciseToEdit.id, {
          name: trimmedName,
          nameEn: nameEn.trim() || undefined,
          targetMuscle,
          equipment,
          mechanic,
          movementPattern,
          defaultRestSeconds,
          instructions: instructions.trim() || undefined,
        });

        if (updated) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onSave(updated);
          onClose();
        } else {
          Alert.alert('Erro', 'Não foi possível atualizar o exercício customizado.');
        }
      } else {
        const newExerciseId = `custom_ex_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const created = createCustomExercise({
          id: newExerciseId,
          name: trimmedName,
          nameEn: nameEn.trim() || undefined,
          targetMuscle,
          synergistMuscles: [],
          movementPattern,
          mechanic,
          equipment,
          defaultRestSeconds,
          instructions: instructions.trim() || undefined,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onSave(created);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar exercício customizado:', error);
      Alert.alert('Erro ao Salvar', 'Ocorreu uma falha ao persistir no SQLite.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header Superior */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Editar Exercício' : 'Novo Exercício'}
              </Text>
              <Text style={styles.headerSubtitle}>CATÁLOGO PERSONALIZADO</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Check size={16} color={Theme.colors.textInverse} />
              <Text style={styles.saveBtnText}>{isEditing ? 'Atualizar' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.container} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Seção 1: Identificação */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NOME DO EXERCÍCIO *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Supino Inclinado com Halteres (Pegada Neutra)"
                placeholderTextColor={Theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus={!isEditing}
              />

              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>NOME EM INGLÊS / VARIAÇÃO (OPCIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Incline Neutral-Grip DB Press"
                placeholderTextColor={Theme.colors.textMuted}
                value={nameEn}
                onChangeText={setNameEn}
              />
            </View>

            {/* Seção 2: Grupo Muscular Alvo */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GRUPO MUSCULAR PRIMÁRIO *</Text>
              <View style={styles.chipsWrap}>
                {MUSCLE_OPTIONS.map((m) => {
                  const active = targetMuscle === m.value;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => handleSelectMuscle(m.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Seção 3: Equipamento */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TIPO DE EQUIPAMENTO *</Text>
              <View style={styles.chipsWrap}>
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const active = equipment === eq.value;
                  return (
                    <TouchableOpacity
                      key={eq.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setEquipment(eq.value);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {eq.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Seção 4: Mecânica Articular */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MECÂNICA ARTICULAR</Text>
              <View style={styles.mechanicRow}>
                {MECHANIC_OPTIONS.map((opt) => {
                  const active = mechanic === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.mechanicBox, active && styles.mechanicBoxActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setMechanic(opt.value);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.mechanicTitle, active && styles.mechanicTitleActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.mechanicDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Seção 5: Tempo Padrão de Descanso */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DESCANSO PADRÃO (SEGUNDOS)</Text>
              <View style={styles.restPresetsRow}>
                {REST_PRESETS.map((seconds) => {
                  const active = defaultRestSeconds === seconds;
                  return (
                    <TouchableOpacity
                      key={seconds}
                      style={[styles.restPill, active && styles.restPillActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setDefaultRestSeconds(seconds);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.restPillText, active && styles.restPillTextActive]}>
                        {seconds}s
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  style={styles.customRestInput}
                  keyboardType="number-pad"
                  value={String(defaultRestSeconds || '')}
                  onChangeText={(val) => {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed > 0) setDefaultRestSeconds(parsed);
                    else if (val === '') setDefaultRestSeconds(0);
                  }}
                  placeholder="outro"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Seção 6: Instruções / Notas Técnicas */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>INSTRUÇÕES OU NOTAS BIOMECÂNICAS</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observações de postura, ângulo de banco, pegada..."
                placeholderTextColor={Theme.colors.textMuted}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: '#0D0D12',
  },
  closeBtn: {
    padding: 8,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#121215',
    padding: 16,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  chipTextActive: {
    color: Theme.colors.textInverse,
    fontWeight: '700',
  },
  mechanicRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mechanicBox: {
    flex: 1,
    backgroundColor: '#18181B',
    padding: 12,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  mechanicBoxActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  mechanicTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  mechanicTitleActive: {
    color: Theme.colors.text,
  },
  mechanicDesc: {
    fontSize: 10,
    color: Theme.colors.textMuted,
  },
  restPresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restPill: {
    backgroundColor: '#18181B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  restPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  restPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  restPillTextActive: {
    color: Theme.colors.textInverse,
  },
  customRestInput: {
    width: 65,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
    fontVariant: ['tabular-nums'],
  },
});
