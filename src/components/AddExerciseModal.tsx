import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Dumbbell, Plus, Sparkles } from 'lucide-react-native';
import { getExercises } from '../database/database';
import { Exercise, MuscleGroup } from '../types/workout';
import { CustomExerciseModal } from './CustomExerciseModal';
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

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [customModalOpen, setCustomModalOpen] = useState(false);

  // Consulta instantânea no banco SQLite
  const exercisesList = useMemo(() => {
    return getExercises({
      targetMuscle: selectedMuscle,
      search,
    });
  }, [selectedMuscle, search, visible, customModalOpen]);

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
            <View>
              <Text style={styles.headerTitle}>Biblioteca de Exercícios</Text>
              <Text style={styles.headerSubtitle}>
                {exercisesList.length} exercícios disponíveis
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity 
                style={styles.newCustomBtn}
                onPress={() => setCustomModalOpen(true)}
                activeOpacity={0.8}
              >
                <Plus size={13} color={Theme.colors.textInverse} />
                <Text style={styles.newCustomBtnText}>Criar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={22} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome ou variação técnica..."
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
            data={exercisesList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemIcon}>
                  <Dumbbell size={18} color={Theme.colors.text} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    {item.isCustom && (
                      <View style={styles.customBadge}>
                        <Sparkles size={8} color={Theme.colors.primary} />
                        <Text style={styles.customBadgeText}>CUSTOM</Text>
                      </View>
                    )}
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>{item.targetMuscle.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.itemEquipment}>
                      • {item.equipment.toUpperCase()} • {item.mechanic === 'compound' ? 'COMPOSTO' : 'ISOLADO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.addBtnCircle}>
                  <Plus size={16} color={Theme.colors.text} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum exercício encontrado no catálogo</Text>
              </View>
            }
          />
        </View>

        {/* Modal de Criação de Exercício Customizado Rápido */}
        <CustomExerciseModal
          visible={customModalOpen}
          onClose={() => setCustomModalOpen(false)}
          onSave={(created) => {
            setCustomModalOpen(false);
            handleSelect(created);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
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
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  newCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  newCustomBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 14,
  },
  filterScrollWrapper: {
    height: 38,
    marginBottom: 10,
  },
  filterList: {
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: Theme.colors.textInverse,
  },
  exerciseList: {
    paddingBottom: 40,
    paddingTop: 4,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    padding: 12,
    borderRadius: Theme.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 3,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  customBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: 0.5,
  },
  itemBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.accentTitanium,
  },
  itemEquipment: {
    fontSize: 10,
    color: Theme.colors.textMuted,
  },
  addBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
});
