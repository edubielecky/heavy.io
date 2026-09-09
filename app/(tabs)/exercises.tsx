import React, { useState } from 'react';
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
import { Search, Dumbbell, Timer, Flame, PlusCircle } from 'lucide-react-native';
import { EXERCISES_DATA } from '../../src/data/exercisesData';
import { Exercise, MuscleGroup } from '../../src/types/workout';
import { useWorkoutStore } from '../../src/store/workoutStore';
import Theme from '../../src/theme/theme';

const MUSCLE_GROUPS: { label: string; value: MuscleGroup | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Peito', value: 'peito' },
  { label: 'Costas', value: 'costas' },
  { label: 'Pernas', value: 'pernas' },
  { label: 'Ombros', value: 'ombros' },
  { label: 'Bíceps', value: 'biceps' },
  { label: 'Tríceps', value: 'triceps' },
  { label: 'Abdômen', value: 'abdomen' },
  { label: 'Panturrilhas', value: 'panturrilhas' },
];

export default function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const { currentWorkout, addExerciseToCurrentWorkout, personalRecords } = useWorkoutStore();

  const filteredExercises = EXERCISES_DATA.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === 'todos' || ex.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

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
          <Text style={styles.title}>Biblioteca de Exercícios</Text>
          <Text style={styles.subtitle}>Biomecânica e padrões de movimento de força</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color={Theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou músculo..."
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
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const pr = personalRecords[item.id];

            return (
              <View style={styles.exerciseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Dumbbell size={20} color={Theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <View style={styles.tagsRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.muscleGroup.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.equipmentText}>• {item.equipment.toUpperCase()}</Text>
                      <View style={styles.restTime}>
                        <Timer size={12} color={Theme.colors.textMuted} />
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
                      <PlusCircle size={24} color={Theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {item.description ? (
                  <Text style={styles.description}>{item.description}</Text>
                ) : null}

                {/* PR Banner se o usuário já fez esse exercício */}
                {pr && (
                  <View style={styles.prBanner}>
                    <Flame size={14} color={Theme.colors.accentFlame} />
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
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    marginBottom: 16,
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
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 14,
  },
  chipsContainer: {
    height: 40,
    marginBottom: 12,
  },
  chipsList: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    fontSize: 12,
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
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  equipmentText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  restTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  restText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  quickAddBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 10,
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.accentFlameMuted,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  prBannerText: {
    fontSize: 11,
    color: Theme.colors.accentFlame,
    fontWeight: '600',
  },
});
