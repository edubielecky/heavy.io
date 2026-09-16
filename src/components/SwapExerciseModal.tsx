import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Search, RefreshCw, Dumbbell, ShieldCheck, Sparkles, Check, Ban, Activity, ThumbsDown, BatteryLow, SlidersHorizontal, ArrowLeft } from 'lucide-react-native';
import Theme from '../theme/theme';
import { Exercise, Equipment } from '../types/workout';
import {
  GuidedInputs,
  PlannedExercise,
  getBiomechanicSubstitutes,
  getAiBiomechanicSubstitute,
  AiBiomechanicSubstituteResult,
  SwapReasonCategory,
  SwapExerciseFeedback,
} from '../services/recommendationEngine';
import { useUserStore } from '../store/userStore';
import { useResponsive } from '../hooks/useResponsive';

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

const SWAP_REASONS: {
  id: SwapReasonCategory;
  label: string;
  sub: string;
  placeholder: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}[] = [
  {
    id: 'missing_equipment',
    label: 'Sem o aparelho',
    sub: 'Ocupado ou indisponível',
    placeholder: 'Opcional: O que tem livre? (ex: só halteres e banco)...',
    icon: Ban,
  },
  {
    id: 'pain_discomfort',
    label: 'Dor ou desconforto',
    sub: 'Alívio articular',
    placeholder: 'Opcional: Onde dói? (ex: ombro ao descer, lombar)...',
    icon: Activity,
  },
  {
    id: 'dislike_exercise',
    label: 'Pouco estímulo',
    sub: 'Não gosto / Baixo foco',
    placeholder: 'Opcional: O que prefere? (ex: prefiro halteres ou cabos)...',
    icon: ThumbsDown,
  },
  {
    id: 'high_fatigue',
    label: 'Fadiga excessiva',
    sub: 'Quero isolar mais',
    placeholder: 'Opcional: ex: poupar lombar, preferência por apoio...',
    icon: BatteryLow,
  },
  {
    id: 'custom',
    label: 'Outro motivo',
    sub: 'Personalizado',
    placeholder: 'Descreva sua necessidade ou preferência para a IA...',
    icon: SlidersHorizontal,
  },
];

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  visible,
  onClose,
  currentExercise,
  guidedInputs,
  onSelectSubstitute,
}) => {
  const { isFoldable, modalMaxWidth } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'all'>('all');
  const [selectedReason, setSelectedReason] = useState<SwapReasonCategory | null>('missing_equipment');
  const [reasonDetails, setReasonDetails] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiBiomechanicSubstituteResult | null>(null);

  const userProfile = useUserStore(s => s.profile);

  // Reseta estado da IA quando o exercício alvo mudar
  useEffect(() => {
    setAiResult(null);
    setIsAiLoading(false);
    setSelectedReason('missing_equipment');
    setReasonDetails('');
  }, [currentExercise?.exerciseId]);

  const currentFeedback = useMemo<SwapExerciseFeedback | undefined>(() => {
    if (!selectedReason && !reasonDetails.trim()) return undefined;
    return {
      category: selectedReason || 'custom',
      details: reasonDetails.trim() || undefined,
    };
  }, [selectedReason, reasonDetails]);

  // Busca os substitutos compatíveis cruzando biomecânica, aparelhos e o motivo do atleta
  const substitutes = useMemo(() => {
    if (!currentExercise) return [];
    const effectiveInputs: Partial<GuidedInputs> = {
      equipment: guidedInputs?.equipment || userProfile?.equipmentEnvironment || 'commercial',
      restrictions: guidedInputs?.restrictions || userProfile?.physicalRestrictions || [],
      ...guidedInputs,
    };
    return getBiomechanicSubstitutes(currentExercise.exerciseId, effectiveInputs, equipmentFilter, currentFeedback);
  }, [currentExercise, guidedInputs, userProfile, equipmentFilter, currentFeedback]);

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

  const handleRequestAiSubstitute = async (categoryOverride?: SwapReasonCategory) => {
    if (!currentExercise) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsAiLoading(true);
    try {
      const effectiveInputs: Partial<GuidedInputs> = {
        equipment: guidedInputs?.equipment || userProfile?.equipmentEnvironment || 'commercial',
        restrictions: guidedInputs?.restrictions || userProfile?.physicalRestrictions || [],
        ...guidedInputs,
      };
      const cat = categoryOverride || selectedReason || 'custom';
      const feedbackToSend: SwapExerciseFeedback = {
        category: cat,
        details: reasonDetails.trim() || undefined,
      };
      const result = await getAiBiomechanicSubstitute(currentExercise, effectiveInputs, feedbackToSend);
      if (result) {
        setAiResult(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      console.error('[heavy.io] Erro ao buscar substituto com IA:', err);
    } finally {
      setIsAiLoading(false);
    }
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
      <SafeAreaView style={[styles.modalOverlay, isFoldable && styles.overlayFoldable]}>
        <View style={[styles.modalContainer, isFoldable && { maxWidth: modalMaxWidth, borderRadius: 16, borderLeftWidth: 1, borderRightWidth: 1 }]}>
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
            ListHeaderComponent={
              <View style={styles.aiSectionContainer}>
                {!aiResult ? (
                  <View style={styles.aiFormCard}>
                    <View style={styles.aiFormHeader}>
                      <View style={styles.aiFormIconBox}>
                        <Sparkles size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.aiFormHeaderText}>
                        <View style={styles.aiActionBadgeRow}>
                          <Text style={styles.aiActionBadge}>CINESIOLOGIA & IA</Text>
                        </View>
                        <Text style={styles.aiFormTitle}>Por que deseja trocar?</Text>
                        <Text style={styles.aiFormSub}>
                          Selecione o motivo para a IA escolher o substituto exato.
                        </Text>
                      </View>
                    </View>

                    {/* Chips de motivos */}
                    <View style={styles.reasonsGrid}>
                      {SWAP_REASONS.map(reason => {
                        const isSelected = selectedReason === reason.id;
                        const IconComponent = reason.icon;
                        return (
                          <TouchableOpacity
                            key={reason.id}
                            style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                            onPress={() => {
                              Haptics.selectionAsync().catch(() => {});
                              setSelectedReason(reason.id);
                            }}
                            activeOpacity={0.75}
                          >
                            <View style={styles.reasonChipTop}>
                              <IconComponent
                                size={13}
                                color={isSelected ? '#FFFFFF' : '#A1A1AA'}
                              />
                              <Text
                                style={[
                                  styles.reasonChipTitle,
                                  isSelected && styles.reasonChipTitleActive,
                                ]}
                              >
                                {reason.label}
                              </Text>
                            </View>
                            <Text
                              style={[styles.reasonChipSub, isSelected && styles.reasonChipSubActive]}
                              numberOfLines={1}
                            >
                              {reason.sub}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Campo de detalhes adicionais */}
                    <View style={styles.detailsInputContainer}>
                      <TextInput
                        style={styles.detailsInput}
                        placeholder={
                          SWAP_REASONS.find(r => r.id === selectedReason)?.placeholder ||
                          'Opcional: detalhes adicionais...'
                        }
                        placeholderTextColor="#71717A"
                        value={reasonDetails}
                        onChangeText={setReasonDetails}
                        maxLength={120}
                        returnKeyType="done"
                      />
                    </View>

                    {/* Botão de Ação IA */}
                    <TouchableOpacity
                      style={[styles.aiSubmitBtn, isAiLoading && styles.aiSubmitBtnDisabled]}
                      onPress={() => handleRequestAiSubstitute()}
                      disabled={isAiLoading}
                      activeOpacity={0.85}
                    >
                      {isAiLoading ? (
                        <>
                          <ActivityIndicator size="small" color="#09090B" />
                          <Text style={styles.aiSubmitBtnText}>Calculando equivalência biomecânica...</Text>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} color="#09090B" />
                          <Text style={styles.aiSubmitBtnText}>Analisar e Sugerir com IA</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.aiResultCard}>
                    <View style={styles.aiResultTop}>
                      <View style={styles.aiResultBadge}>
                        <Sparkles size={11} color="#09090B" />
                        <Text style={styles.aiResultBadgeText}>SUGESTÃO DA IA • MESMA ATIVAÇÃO</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRequestAiSubstitute()}
                        disabled={isAiLoading}
                        style={styles.aiRegenerateBtn}
                        activeOpacity={0.7}
                      >
                        <RefreshCw size={11} color={Theme.colors.textMuted} />
                        <Text style={styles.aiRegenerateText}>Outra opção</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.aiResultExName}>{aiResult.substitute.name}</Text>
                    {aiResult.substitute.nameEn && (
                      <Text style={styles.aiResultExNameEn}>{aiResult.substitute.nameEn}</Text>
                    )}

                    <View style={styles.tagsRow}>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{aiResult.substitute.targetMuscle.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.tag, styles.tagEquipment]}>
                        <Text style={[styles.tagText, styles.tagEquipmentText]}>
                          {aiResult.substitute.equipment === 'dumbbell'
                            ? 'HALTERES'
                            : aiResult.substitute.equipment === 'barbell'
                            ? 'BARRA'
                            : aiResult.substitute.equipment === 'machine'
                            ? 'MÁQUINA'
                            : aiResult.substitute.equipment === 'cable'
                            ? 'CABO'
                            : aiResult.substitute.equipment === 'smith'
                            ? 'SMITH'
                            : 'LIVRE'}
                        </Text>
                      </View>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>
                          {aiResult.substitute.mechanic === 'compound' ? 'COMPOSTO' : 'ISOLADOR'}
                        </Text>
                      </View>
                    </View>

                    {aiResult.reasonAddressed && (
                      <View style={styles.aiReasonAddressedBox}>
                        <View style={styles.aiReasonAddressedHeader}>
                          <ShieldCheck size={12} color="#10B981" />
                          <Text style={styles.aiReasonAddressedLabel}>COMO RESOLVE SEU MOTIVO</Text>
                        </View>
                        <Text style={styles.aiReasonAddressedText}>{aiResult.reasonAddressed}</Text>
                      </View>
                    )}

                    <View style={styles.aiExplanationBox}>
                      <Text style={styles.aiExplanationLabel}>EQUIVALÊNCIA BIOMECÂNICA:</Text>
                      <Text style={styles.aiExplanationText}>{aiResult.activationExplanation}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.aiApplyBtn}
                      onPress={() => handleSelect(aiResult.substitute)}
                      activeOpacity={0.85}
                    >
                      <Check size={14} color="#09090B" />
                      <Text style={styles.aiApplyBtnText}>Aplicar Troca no Treino</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.aiChangeReasonBtn}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setAiResult(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <SlidersHorizontal size={13} color="#A1A1AA" />
                      <Text style={styles.aiChangeReasonBtnText}>Alterar motivo da troca</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.listDividerRow}>
                  <View style={styles.listDividerLine} />
                  <Text style={styles.listDividerText}>TODOS OS SUBSTITUTOS DO CATÁLOGO</Text>
                  <View style={styles.listDividerLine} />
                </View>
              </View>
            }
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
  overlayFoldable: {
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    flex: 1,
    width: '100%',
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
  aiSectionContainer: {
    marginBottom: 10,
  },
  aiFormCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    marginBottom: 4,
  },
  aiFormHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  aiFormIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiFormHeaderText: {
    flex: 1,
  },
  aiActionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  aiActionBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 0.6,
  },
  aiFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  aiFormSub: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    lineHeight: 15,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  reasonChip: {
    width: '48.5%',
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  reasonChipActive: {
    backgroundColor: '#27272A',
    borderColor: '#FFFFFF',
  },
  reasonChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  reasonChipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4D4D8',
  },
  reasonChipTitleActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  reasonChipSub: {
    fontSize: 10,
    color: '#71717A',
  },
  reasonChipSubActive: {
    color: '#A1A1AA',
  },
  detailsInputContainer: {
    backgroundColor: '#18181B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  detailsInput: {
    color: '#FFFFFF',
    fontSize: 12,
    padding: 0,
  },
  aiSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  aiSubmitBtnDisabled: {
    opacity: 0.7,
  },
  aiSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.2,
  },
  aiResultCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    marginBottom: 4,
  },
  aiResultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  aiResultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.6,
  },
  aiRegenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  aiRegenerateText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  aiResultExName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  aiResultExNameEn: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  aiReasonAddressedBox: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  aiReasonAddressedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  aiReasonAddressedLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  aiReasonAddressedText: {
    fontSize: 12,
    color: '#E4E4E7',
    lineHeight: 16,
  },
  aiExplanationBox: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  aiExplanationLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  aiExplanationText: {
    fontSize: 12,
    color: '#D4D4D8',
    lineHeight: 16,
  },
  aiApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  aiApplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.2,
  },
  aiChangeReasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  aiChangeReasonBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  listDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  listDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272A',
  },
  listDividerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.8,
  },
});
