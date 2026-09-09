import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Search, RefreshCw, Check, Dumbbell, ShieldCheck } from 'lucide-react-native';
import Theme from '../theme/theme';
import { Exercise } from '../types/workout';
import {
  GuidedInputs,
  PlannedExercise,
  getBiomechanicSubstitutes,
} from '../services/recommendationEngine';

interface SwapExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  currentExercise: PlannedExercise | null;
  guidedInputs: GuidedInputs;
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

  // Busca os substitutos compatíveis com o algoritmo
  const substitutes = useMemo(() => {
    if (!currentExercise) return [];
    return getBiomechanicSubstitutes(currentExercise.exerciseId, guidedInputs);
  }, [currentExercise, guidedInputs]);

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Bar */}
          <View style={styles.modalHeader}>
            <View style={styles.titleArea}>
              <View style={styles.badgeRow}>
                <RefreshCw size={12} color={Theme.colors.primary} />
                <Text style={styles.badgeText}>SUBSTITUIÇÃO BIOMECÂNICA</Text>
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
              placeholder="Buscar entre os substitutos equivalentes..."
              placeholderTextColor={Theme.colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Safety Badge */}
          <View style={styles.safetyInfo}>
            <ShieldCheck size={14} color={Theme.colors.success} />
            <Text style={styles.safetyInfoText}>
              Apenas exercícios compatíveis com seus equipamentos e restrições articulares.
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
                <Text style={styles.emptyTitle}>Nenhum substituto encontrado</Text>
                <Text style={styles.emptySub}>
                  Tente alterar o termo de busca para localizar outro exercício.
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
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.equipment.toUpperCase()}</Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {item.mechanic === 'compound' ? 'COMPOSTO' : 'ISOLADOR'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.selectAction}>
                  <Text style={styles.selectActionText}>Selecionar</Text>
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
  },
  modalContainer: {
    flex: 1,
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
    marginBottom: 14,
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
  safetyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#121215',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  safetyInfoText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMain: {
    flex: 1,
    paddingRight: 10,
  },
  exName: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  exNameEn: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  selectAction: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  selectActionText: {
    color: Theme.colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
