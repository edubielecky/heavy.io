import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert 
} from 'react-native';
import { Search, Dumbbell, Timer, Flame, PlusCircle, Activity } from 'lucide-react-native';
import { getExercises } from '../../src/database/database';
import { Exercise, MuscleGroup } from '../../src/types/workout';
import { useWorkoutStore } from '../../src/store/workoutStore';
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

export default function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const { currentWorkout, addExerciseToCurrentWorkout, personalRecords } = useWorkoutStore();

  // Consulta 100% offline e instantânea no SQLite
  const exercises = useMemo(() => {
    return getExercises({
      targetMuscle: selectedMuscle,
      search,
    });
  }, [selectedMuscle, search]);

  const handleAddToWorkout = (exercise: Exercise) => {
    if (!currentWorkout) {
      Alert.alert(
        'Nenhum Treino Ativo',
        'Inicie um treino na aba principal "Treino" para poder adicionar este exercício.'
      );
      return;
    }
    addExerciseToCurrentWorkout(exercise);
    Alert.alert('Adicionado!', `"${exercise.name}" foi adicionado ao seu treino ativo.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Catálogo de Exercícios</Text>
          <Text style={styles.subtitle}>
            {exercises.length} movimentos catalogados com especificações biomecânicas
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color={Theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, variação ou padrão biomecânico..."
            placeholderTextColor={Theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsContainer}>
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
                  onPress={() => setSelectedMuscle(item.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Exercises List */}
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const pr = personalRecords[item.id];

            return (
              <View style={styles.exerciseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Dumbbell size={18} color={Theme.colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    {item.nameEn && (
                      <Text style={styles.exerciseNameEn}>{item.nameEn}</Text>
                    )}
                    <View style={styles.tagsRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.targetMuscle.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.equipmentText}>• {item.equipment.toUpperCase()}</Text>
                      <Text style={styles.equipmentText}>
                        • {item.mechanic === 'compound' ? 'COMPOSTO' : 'ISOLADO'}
                      </Text>
                      <View style={styles.restTime}>
                        <Timer size={11} color={Theme.colors.textMuted} />
                        <Text style={styles.restText}>{item.defaultRestSeconds}s</Text>
                      </View>
                    </View>
                  </View>

                  {/* Add to workout if active */}
                  {currentWorkout && (
                    <TouchableOpacity 
                      style={styles.quickAddBtn}
                      onPress={() => handleAddToWorkout(item)}
                    >
                      <PlusCircle size={22} color={Theme.colors.text} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Sinergistas / Padrão de Movimento */}
                <View style={styles.detailsRow}>
                  <View style={styles.patternPill}>
                    <Activity size={11} color={Theme.colors.textMuted} />
                    <Text style={styles.patternText}>
                      {item.movementPattern.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  {item.synergistMuscles.length > 0 && (
                    <Text style={styles.synergistsText} numberOfLines={1}>
                      Sinergistas: {item.synergistMuscles.join(', ')}
                    </Text>
                  )}
                </View>

                {item.instructions ? (
                  <Text style={styles.description}>{item.instructions}</Text>
                ) : null}

                {/* PR Banner se o usuário já fez esse exercício */}
                {pr && (
                  <View style={styles.prBanner}>
                    <Flame size={13} color={Theme.colors.accentTitanium} />
                    <Text style={styles.prBannerText}>
                      Recorde Pessoal: <Text style={{ fontWeight: '800' }}>{pr.maxWeightKg}kg</Text> ({pr.repsAtMaxWeight} reps) • 1RM est: {pr.estimated1RM}kg
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
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
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 14,
  },
  chipsContainer: {
    height: 38,
    marginBottom: 12,
  },
  chipsList: {
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceCard,
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
  listContent: {
    paddingBottom: 30,
    paddingTop: 4,
  },
  exerciseCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  exerciseNameEn: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.accentTitanium,
    letterSpacing: 0.5,
  },
  equipmentText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
  },
  restTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 2,
  },
  restText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
  },
  quickAddBtn: {
    padding: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  patternPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  patternText: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  synergistsText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 8,
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  prBannerText: {
    fontSize: 11,
    color: Theme.colors.accentTitanium,
    fontWeight: '500',
  },
});
