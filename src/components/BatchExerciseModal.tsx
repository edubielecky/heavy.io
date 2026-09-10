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
import { Search, X, Check, Dumbbell, Plus, CheckCircle2, Circle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getExercises } from '../database/database';
import { Exercise, MuscleGroup, Equipment } from '../types/workout';
import Theme from '../theme/theme';

interface BatchExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmBatch: (exercises: Exercise[]) => void;
  alreadySelectedIds?: string[];
}

const MUSCLE_FILTERS: { label: string; value: MuscleGroup | 'todos' }[] = [
  { label: 'Todos os Músculos', value: 'todos' },
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

const EQUIPMENT_FILTERS: { label: string; value: Equipment | 'todos' }[] = [
  { label: 'Todos os Equipamentos', value: 'todos' },
  { label: 'Barra', value: 'barbell' },
  { label: 'Halter', value: 'dumbbell' },
  { label: 'Polia / Cabo', value: 'cable' },
  { label: 'Máquina', value: 'machine' },
  { label: 'Smith', value: 'smith' },
  { label: 'Peso do Corpo', value: 'bodyweight' },
];

export const BatchExerciseModal: React.FC<BatchExerciseModalProps> = ({
  visible,
  onClose,
  onConfirmBatch,
  alreadySelectedIds = [],
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'todos'>('todos');
  const [selectedMap, setSelectedMap] = useState<Record<string, Exercise>>({});

  // Reset de seleção ao abrir modal
  React.useEffect(() => {
    if (visible) {
      setSelectedMap({});
      setSearch('');
    }
  }, [visible]);

  // Consulta do catálogo de 173 exercícios SQLite
  const exercisesList = useMemo(() => {
    let list = getExercises({
      targetMuscle: selectedMuscle,
      search,
    });

    if (selectedEquipment !== 'todos') {
      list = list.filter(e => e.equipment === selectedEquipment);
    }

    return list;
  }, [selectedMuscle, selectedEquipment, search, visible]);

  const toggleSelectExercise = (exercise: Exercise) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedMap(prev => {
      const copy = { ...prev };
      if (copy[exercise.id]) {
        delete copy[exercise.id];
      } else {
        copy[exercise.id] = exercise;
      }
      return copy;
    });
  };

  const selectedCount = Object.keys(selectedMap).length;

  const handleConfirm = () => {
    const list = Object.values(selectedMap);
    if (list.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirmBatch(list);
    onClose();
  };

  const formatEquipment = (eq: Equipment) => {
    const map: Record<Equipment, string> = {
      barbell: 'Barra',
      dumbbell: 'Halter',
      cable: 'Polia',
      machine: 'Máquina',
      bodyweight: 'Peso Corporal',
      smith: 'Smith',
      kettlebell: 'Kettlebell',
      other: 'Outro',
    };
    return map[eq] || eq;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Inserção em Lote</Text>
              <Text style={styles.headerSubtitle}>
                {selectedCount > 0 ? `${selectedCount} selecionado(s)` : 'Selecione múltiplos exercícios'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={22} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome técnico..."
              placeholderTextColor={Theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Filtros por Grupo Muscular */}
          <View style={styles.filterSection}>
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
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => {
                      setSelectedMuscle(item.value);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Filtros por Equipamento */}
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={EQUIPMENT_FILTERS}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => {
                const isSelected = selectedEquipment === item.value;
                return (
                  <TouchableOpacity
                    style={[styles.filterChipSmall, isSelected && styles.filterChipSmallActive]}
                    onPress={() => {
                      setSelectedEquipment(item.value);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                  >
                    <Text style={[styles.filterChipSmallText, isSelected && styles.filterChipSmallTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Lista de Exercícios com Multi-select */}
          <FlatList
            data={exercisesList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = !!selectedMap[item.id];
              const isAlreadyAdded = alreadySelectedIds.includes(item.id);

              return (
                <TouchableOpacity
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                    isAlreadyAdded && styles.exerciseCardDisabled,
                  ]}
                  onPress={() => !isAlreadyAdded && toggleSelectExercise(item)}
                  activeOpacity={isAlreadyAdded ? 1 : 0.7}
                >
                  <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                    <Dumbbell size={18} color={isSelected ? Theme.colors.textInverse : Theme.colors.primary} />
                  </View>

                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.badgesRow}>
                      <View style={styles.muscleBadge}>
                        <Text style={styles.muscleText}>{item.targetMuscle.toUpperCase()}</Text>
                      </View>
                      <View style={styles.equipmentBadge}>
                        <Text style={styles.equipmentText}>{formatEquipment(item.equipment)}</Text>
                      </View>
                      <View style={styles.mechanicBadge}>
                        <Text style={styles.mechanicText}>
                          {item.mechanic === 'compound' ? 'Composto' : 'Isolador'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.checkIndicator}>
                    {isAlreadyAdded ? (
                      <Text style={styles.alreadyAddedText}>Na sessão</Text>
                    ) : isSelected ? (
                      <CheckCircle2 size={22} color={Theme.colors.primary} />
                    ) : (
                      <Circle size={22} color={Theme.colors.borderLight} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Barra Flutuante de Confirmação em Lote */}
          {selectedCount > 0 && (
            <View style={styles.floatingFooter}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Check size={18} color={Theme.colors.textInverse} />
                <Text style={styles.confirmBtnText}>
                  Adicionar {selectedCount} Exercício{selectedCount > 1 ? 's' : ''} à Sessão
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 14,
  },
  filterSection: {
    marginBottom: 6,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterChipText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Theme.colors.textInverse,
    fontWeight: '800',
  },
  filterChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipSmallActive: {
    backgroundColor: Theme.colors.accentTitanium,
    borderColor: Theme.colors.accentTitanium,
  },
  filterChipSmallText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  filterChipSmallTextActive: {
    color: Theme.colors.textInverse,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 12,
  },
  exerciseCardSelected: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.primary,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  exerciseCardDisabled: {
    opacity: 0.4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: Theme.colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muscleBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  muscleText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  equipmentBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  equipmentText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  mechanicBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  mechanicText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
  },
  checkIndicator: {
    paddingRight: 4,
  },
  alreadyAddedText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '700',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 50,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  confirmBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
