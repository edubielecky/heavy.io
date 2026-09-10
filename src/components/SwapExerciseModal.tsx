import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Search, RefreshCw, Dumbbell, ShieldCheck } from 'lucide-react-native';
import Theme from '../theme/theme';
import { Exercise, Equipment } from '../types/workout';
import {
  GuidedInputs,
  PlannedExercise,
  getBiomechanicSubstitutes,
} from '../services/recommendationEngine';
import { useUserStore } from '../store/userStore';

export interface SwapExerciseTarget {
  exerciseId: string;
  exerciseName: string;
}

interface SwapExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  currentExercise: SwapExerciseTarget | PlannedExercise | null;
  guidedInputs?: Partial<GuidedInputs>;
  onSelectSubstitute: (substitute: Exercise) => void;
}

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  visible,
  onClose,
  currentExercise,
  guidedInputs,
  onSelectSubstitute,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'all'>('all');

  const userProfile = useUserStore(s => s.profile);

  // Busca os substitutos compatíveis cruzando biomecânica e disponibilidade de aparelhos
  const substitutes = useMemo(() => {
    if (!currentExercise) return [];
    const effectiveInputs: Partial<GuidedInputs> = {
      equipment: guidedInputs?.equipment || userProfile?.equipmentEnvironment || 'commercial',
      restrictions: guidedInputs?.restrictions || userProfile?.physicalRestrictions || [],
      ...guidedInputs,
    };
    return getBiomechanicSubstitutes(currentExercise.exerciseId, effectiveInputs, equipmentFilter);
  }, [currentExercise, guidedInputs, userProfile, equipmentFilter]);

  // Filtro de busca textual adicional
  const filteredSubstitutes = useMemo(() => {
    if (!searchTerm.trim()) return substitutes;
    const term = searchTerm.toLowerCase().trim();
    return substitutes.filter(
      ex =>
        ex.name.toLowerCase().includes(term) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(term))
    );
  }, [substitutes, searchTerm]);

  const handleSelect = (substitute: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectSubstitute(substitute);
    onClose();
  };

  if (!currentExercise) return null;

  const currentGymEnv = guidedInputs?.equipment || userProfile?.equipmentEnvironment || 'commercial';
  const gymEnvLabel = currentGymEnv === 'home_dumbbells' 
    ? 'Halteres & Peso Livre' 
    : currentGymEnv === 'condo' 
    ? 'Academia de Condomínio' 
    : 'Academia Completa';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Bar */}
          <View style={styles.modalHeader}>
            <View style={styles.titleArea}>
              <View style={styles.badgeRow}>
                <RefreshCw size={12} color={Theme.colors.primary} />
                <Text style={styles.badgeText}>SUBSTITUIÇÃO INTELIGENTE</Text>
              </View>
              <Text style={styles.modalTitle}>Trocar Exercício</Text>
              <Text style={styles.modalSub}>
                Exercício atual:{' '}
                <Text style={styles.currentName}>{currentExercise.exerciseName}</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={20} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Search size={16} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome ou substituto..."
              placeholderTextColor={Theme.colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Filtros de Aparelhos da Academia */}
          <View style={styles.filterPillsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filterPillsScroll}
            >
              {[
                { label: 'TODOS', value: 'all' as const },
                { label: 'HALTERES', value: 'dumbbell' as const },
                { label: 'BARRA', value: 'barbell' as const },
                { label: 'MÁQUINAS / CABOS', value: 'machine' as const },
                { label: 'PESO DO CORPO', value: 'bodyweight' as const },
              ].map(pill => {
                const isActive = equipmentFilter === pill.value;
                return (
                  <TouchableOpacity
                    key={pill.value}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setEquipmentFilter(pill.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Safety & Environment Badge */}
          <View style={styles.safetyInfo}>
            <ShieldCheck size={14} color="#10B981" />
            <Text style={styles.safetyInfoText}>
              Substitutos equivalentes filtrados para <Text style={{ color: Theme.colors.text, fontWeight: '700' }}>{gymEnvLabel}</Text>.
            </Text>
          </View>

          {/* Substitutes List */}
          <FlatList
            data={filteredSubstitutes}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhum substituto compatível encontrado</Text>
                <Text style={styles.emptySub}>
                  Tente alterar o filtro de aparelho ou o termo de busca para localizar outro exercício.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseCard}
                onPress={() => handleSelect(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardMain}>
                  <Text style={styles.exName}>{item.name}</Text>
                  {item.nameEn && <Text style={styles.exNameEn}>{item.nameEn}</Text>}

                  <View style={styles.tagsRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.targetMuscle.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.tag, styles.tagEquipment]}>
                      <Text style={[styles.tagText, styles.tagEquipmentText]}>
                        {item.equipment === 'dumbbell'
                          ? 'HALTERES'
                          : item.equipment === 'barbell'
                          ? 'BARRA'
                          : item.equipment === 'machine'
                          ? 'MÁQUINA'
                          : item.equipment === 'cable'
                          ? 'CABO'
                          : item.equipment === 'smith'
                          ? 'SMITH'
                          : 'LIVRE'}
                      </Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {item.mechanic === 'compound' ? 'COMPOSTO' : 'ISOLADOR'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.selectAction}>
                  <Text style={styles.selectActionText}>Trocar</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#09090B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    paddingRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: Theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  currentName: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    marginHorizontal: 18,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  filterPillsContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  filterPillsScroll: {
    paddingHorizontal: 18,
    gap: 6,
  },
  filterPill: {
    backgroundColor: '#121215',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  filterPillTextActive: {
    color: '#09090B',
  },
  safetyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#121215',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  safetyInfoText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 40,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardMain: {
    flex: 1,
    paddingRight: 10,
  },
  exName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  exNameEn: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#18181B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  tagEquipment: {
    borderColor: '#3F3F46',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  tagEquipmentText: {
    color: Theme.colors.primary,
  },
  selectAction: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  selectActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
