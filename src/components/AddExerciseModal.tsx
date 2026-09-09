import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { Search, X, Dumbbell, Check } from 'lucide-react-native';
import { EXERCISES_DATA } from '../data/exercisesData';
import { Exercise, MuscleGroup } from '../types/workout';
import Theme from '../theme/theme';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const MUSCLE_FILTERS: { label: string; value: MuscleGroup | 'todos' }[] = [
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

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');

  const filteredExercises = EXERCISES_DATA.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === 'todos' || ex.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const handleSelect = (exercise: Exercise) => {
    onSelectExercise(exercise);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Adicionar Exercício</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={22} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar exercício (ex: Supino, Agachamento)..."
              placeholderTextColor={Theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Muscle Filters */}
          <View style={styles.filterScrollWrapper}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={MUSCLE_FILTERS}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => {
                const isSelected = selectedMuscle === item.value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedMuscle(item.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* List of Exercises */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemIcon}>
                  <Dumbbell size={20} color={Theme.colors.primary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemBadge}>{item.muscleGroup.toUpperCase()}</Text>
                    <Text style={styles.itemEquipment}>• {item.equipment.toUpperCase()}</Text>
                  </View>
                </View>
                <Check size={18} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum exercício encontrado</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 15,
  },
  filterScrollWrapper: {
    height: 40,
    marginBottom: 10,
  },
  filterList: {
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterChipText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: Theme.colors.textInverse,
  },
  exerciseList: {
    paddingBottom: 40,
    paddingTop: 6,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    padding: 14,
    borderRadius: Theme.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  itemEquipment: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 15,
  },
});
