import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  Search, 
  Dumbbell, 
  Timer, 
  Flame, 
  PlusCircle, 
  Activity, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Sparkles
} from 'lucide-react-native';
import { getExercises, deleteCustomExercise } from '../../src/database/database';
import { Exercise, MuscleGroup, Equipment } from '../../src/types/workout';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { ExerciseProgressModal } from '../../src/components/ExerciseProgressModal';
import { CustomExerciseModal } from '../../src/components/CustomExerciseModal';
import Theme from '../../src/theme/theme';

const MUSCLE_GROUPS: { label: string; value: MuscleGroup | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Peito', value: 'peito' },
  { label: 'Costas', value: 'costas' },
  { label: 'Quadríceps', value: 'quadriceps' },
  { label: 'Posteriores', value: 'isquiotibiais' },
  { label: 'Glúteos', value: 'gluteos' },
  { label: 'Ombros', value: 'ombros' },
  { label: 'Bíceps', value: 'biceps' },
  { label: 'Tríceps', value: 'triceps' },
  { label: 'Abdômen', value: 'abdomen' },
  { label: 'Panturrilhas', value: 'panturrilhas' },
  { label: 'Trapézio', value: 'trapezio' },
];

const EQUIPMENT_OPTIONS: { label: string; value: Equipment | 'todos' }[] = [
  { label: 'Todos Equip.', value: 'todos' },
  { label: 'Barra', value: 'barbell' },
  { label: 'Halter', value: 'dumbbell' },
  { label: 'Polia / Cabo', value: 'cable' },
  { label: 'Máquina', value: 'machine' },
  { label: 'Smith', value: 'smith' },
  { label: 'Peso do Corpo', value: 'bodyweight' },
];

export default function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'todos'>('todos');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados de Criação / Edição de Exercício Customizado
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { currentWorkout, addExerciseToCurrentWorkout, personalRecords, loadFromDatabase } = useWorkoutStore();

  useFocusEffect(
    useCallback(() => {
      loadFromDatabase();
    }, [loadFromDatabase])
  );

  // Consulta 100% offline e instantânea no SQLite com filtros de grupo muscular e equipamento
  const exercises = useMemo(() => {
    return getExercises({
      targetMuscle: selectedMuscle,
      equipment: selectedEquipment,
      search,
    });
  }, [selectedMuscle, selectedEquipment, search, refreshKey]);

  const handleOpenExercise = (exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

  const handleOpenCreateExercise = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setExerciseToEdit(null);
    setCustomModalVisible(true);
  };

  const handleEditExercise = (exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExerciseToEdit(exercise);
    setCustomModalVisible(true);
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    Alert.alert(
      'Excluir Exercício Customizado?',
      `Deseja realmente remover "${exercise.name}" do seu catálogo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const success = deleteCustomExercise(exercise.id);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setRefreshKey(prev => prev + 1);
            } else {
              Alert.alert('Erro', 'Não foi possível excluir o exercício.');
            }
          },
        },
      ]
    );
  };

  const handleQuickAdd = (exercise: Exercise) => {
    if (!currentWorkout) {
      Alert.alert(
        'Nenhum Treino Ativo',
        'Inicie um treino na aba principal "Treino" para adicionar este exercício.'
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addExerciseToCurrentWorkout(exercise);
    Alert.alert('Adicionado!', `"${exercise.name}" foi adicionado ao seu treino ativo.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Superior com Botão de Novo Exercício */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Biblioteca de Exercícios</Text>
              <Text style={styles.subtitle}>
                {exercises.length} movimentos com curva de força e histórico
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.createExerciseBtn}
              onPress={handleOpenCreateExercise}
              activeOpacity={0.8}
            >
              <Plus size={14} color={Theme.colors.textInverse} />
              <Text style={styles.createExerciseBtnText}>Novo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Busca Textual em Tempo Real */}
        <View style={styles.searchBar}>
          <Search size={16} color={Theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, variação ou biomecânica..."
            placeholderTextColor={Theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Linha 1: Filtros de Grupo Muscular */}
        <View style={styles.chipsSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={MUSCLE_GROUPS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.chipsList}
            renderItem={({ item }) => {
              const active = selectedMuscle === item.value;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedMuscle(item.value);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Linha 2: Filtros de Equipamento */}
        <View style={styles.chipsSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={EQUIPMENT_OPTIONS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.chipsList}
            renderItem={({ item }) => {
              const active = selectedEquipment === item.value;
              return (
                <TouchableOpacity
                  style={[styles.chipEquipment, active && styles.chipEquipmentActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedEquipment(item.value);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipEquipmentText, active && styles.chipEquipmentTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Lista de Exercícios Filtrados */}
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const pr = personalRecords[item.id];

            return (
              <TouchableOpacity
                style={styles.exerciseCard}
                onPress={() => handleOpenExercise(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Dumbbell size={16} color={Theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.nameEn && (
                      <Text style={styles.exerciseNameEn} numberOfLines={1}>
                        {item.nameEn}
                      </Text>
                    )}

                    <View style={styles.tagsRow}>
                      {item.isCustom && (
                        <View style={styles.badgeCustom}>
                          <Sparkles size={9} color={Theme.colors.primary} />
                          <Text style={styles.badgeCustomText}>CUSTOM</Text>
                        </View>
                      )}
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.targetMuscle.toUpperCase()}</Text>
                      </View>
                      <View style={styles.badgeEquip}>
                        <Text style={styles.badgeEquipText}>{item.equipment.toUpperCase()}</Text>
                      </View>
                      <View style={styles.restTime}>
                        <Timer size={10} color={Theme.colors.textMuted} />
                        <Text style={styles.restText}>{item.defaultRestSeconds}s</Text>
                      </View>
                    </View>
                  </View>

                  {/* Ações Rápidas no Card */}
                  <View style={styles.cardActionsRight}>
                    {item.isCustom && (
                      <View style={styles.customCardActions}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => handleEditExercise(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Pencil size={13} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => handleDeleteExercise(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={13} color={Theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {currentWorkout && (
                      <TouchableOpacity 
                        style={styles.quickAddBtn}
                        onPress={() => handleQuickAdd(item)}
                        activeOpacity={0.7}
                      >
                        <PlusCircle size={22} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Banner de Recorde se já houver registro de sobrecarga */}
                {pr && (
                  <View style={styles.prBanner}>
                    <Flame size={12} color={Theme.colors.primary} />
                    <Text style={styles.prBannerText}>
                      Recorde Atual: <Text style={styles.prBold}>{pr.maxWeightKg}kg</Text> ({pr.repsAtMaxWeight} reps) • 1RM est: {pr.estimated1RM}kg
                    </Text>
                  </View>
                )}

                {/* Rodapé do Card: Curva de Força */}
                <View style={styles.cardFooter}>
                  <View style={styles.strengthCurveHint}>
                    <TrendingUp size={12} color={Theme.colors.textSecondary} />
                    <Text style={styles.strengthCurveText}>Ver curva de força e histórico</Text>
                  </View>
                  <ChevronRight size={14} color={Theme.colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum exercício encontrado</Text>
              <Text style={styles.emptySub}>
                Tente ajustar os filtros de grupo muscular ou equipamento para localizar o movimento.
              </Text>
            </View>
          }
        />

        {/* Modal de Curva de Força e Especificações do Exercício */}
        <ExerciseProgressModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          exercise={selectedExercise}
          onEditCustomExercise={(ex) => {
            setModalVisible(false);
            handleEditExercise(ex);
          }}
          onDeleteCustomExercise={(ex) => {
            setModalVisible(false);
            handleDeleteExercise(ex);
          }}
        />

        {/* Modal de Criação / Edição de Exercício Customizado */}
        <CustomExerciseModal
          visible={customModalVisible}
          onClose={() => {
            setCustomModalVisible(false);
            setExerciseToEdit(null);
          }}
          exerciseToEdit={exerciseToEdit}
          onSave={() => {
            setRefreshKey(prev => prev + 1);
          }}
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
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  header: {
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.sm,
  },
  createExerciseBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  chipsSection: {
    marginBottom: 8,
  },
  chipsList: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Theme.colors.textInverse,
  },
  chipEquipment: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipEquipmentActive: {
    backgroundColor: '#27272A',
    borderColor: Theme.colors.primary,
  },
  chipEquipmentText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  chipEquipmentTextActive: {
    color: Theme.colors.text,
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 40,
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.2,
  },
  exerciseNameEn: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  badgeCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeCustomText: {
    color: Theme.colors.text,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeEquip: {
    backgroundColor: '#18181B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeEquipText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  restTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 2,
  },
  restText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardActionBtn: {
    padding: 6,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  quickAddBtn: {
    padding: 4,
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  prBannerText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  prBold: {
    fontWeight: '800',
    color: Theme.colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
    marginTop: 10,
  },
  strengthCurveHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  strengthCurveText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
