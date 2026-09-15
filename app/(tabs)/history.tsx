import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  Calendar, 
  Clock, 
  Dumbbell, 
  Weight, 
  Trophy, 
  ChevronRight, 
  Layers,
  Search,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { WorkoutSession, Exercise } from '../../src/types/workout';
import { WorkoutDetailModal } from '../../src/components/WorkoutDetailModal';
import { ExerciseProgressModal } from '../../src/components/ExerciseProgressModal';
import { getSessionPRs, getExerciseById } from '../../src/database/database';
import Theme from '../../src/theme/theme';

interface ExerciseExecutionHistory {
  exerciseId: string;
  exerciseName: string;
  targetMuscle: string;
  bestWeightKg: number;
  best1RM: number;
  totalSetsDone: number;
  sessionsCount: number;
  sessions: {
    sessionId: string;
    sessionName: string;
    date: string;
    maxWeight: number;
    sets: {
      setNumber: number;
      weightKg: number;
      reps: number;
      type: string;
      completed: boolean;
    }[];
  }[];
}

export default function HistoryScreen() {
  const { workoutHistory, loadFromDatabase, deleteWorkoutFromHistory } = useWorkoutStore();
  
  // Alternador de Visualização: 'sessions' (por treino) ou 'exercises' (detalhado por exercício)
  const [viewMode, setViewMode] = useState<'sessions' | 'exercises'>('sessions');
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Modais
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutSession | null>(null);

  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<Exercise | null>(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  // Recarrega dados sempre que a aba History ganha foco
  useFocusEffect(
    useCallback(() => {
      loadFromDatabase();
    }, [loadFromDatabase])
  );

  const totalVolumeAllTime = workoutHistory.reduce(
    (acc, curr) => acc + curr.totalTonnageKg, 
    0
  );

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainder = mins % 60;
      return `${hours}h ${remainder}m`;
    }
    return `${mins} min`;
  };

  const handleOpenDetail = (session: WorkoutSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedSession(session);
    setDetailModalVisible(true);
  };

  const handleRequestDelete = (session: WorkoutSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSessionToDelete(session);
  };

  const handleConfirmDelete = () => {
    if (!sessionToDelete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    const id = sessionToDelete.id;
    deleteWorkoutFromHistory(id);
    setSessionToDelete(null);
    if (selectedSession?.id === id) {
      setDetailModalVisible(false);
      setSelectedSession(null);
    }
  };

  // Agrupa todo o histórico cronológico de cada exercício realizado com suas séries completas
  const exercisesHistory = useMemo((): ExerciseExecutionHistory[] => {
    const map = new Map<string, ExerciseExecutionHistory>();

    workoutHistory.forEach(sess => {
      sess.exercises.forEach(we => {
        const completedSets = we.sets.filter(s => s.completed);
        if (completedSets.length === 0) return;

        let maxWeight = 0;
        let best1RM = 0;

        completedSets.forEach(s => {
          if (s.weightKg > maxWeight) maxWeight = s.weightKg;
          const est = s.weightKg > 0 && s.reps > 0 ? s.weightKg * (1 + s.reps / 30) : 0;
          if (est > best1RM) best1RM = Math.round(est * 10) / 10;
        });

        if (!map.has(we.exerciseId)) {
          map.set(we.exerciseId, {
            exerciseId: we.exerciseId,
            exerciseName: we.exerciseName,
            targetMuscle: we.targetMuscle || 'peito',
            bestWeightKg: 0,
            best1RM: 0,
            totalSetsDone: 0,
            sessionsCount: 0,
            sessions: [],
          });
        }

        const item = map.get(we.exerciseId)!;
        item.sessionsCount += 1;
        item.totalSetsDone += completedSets.length;
        if (maxWeight > item.bestWeightKg) item.bestWeightKg = maxWeight;
        if (best1RM > item.best1RM) item.best1RM = best1RM;

        item.sessions.push({
          sessionId: sess.id,
          sessionName: sess.name,
          date: sess.startTime,
          maxWeight,
          sets: completedSets.map(s => ({
            setNumber: s.setNumber,
            weightKg: s.weightKg,
            reps: s.reps,
            type: s.type,
            completed: s.completed,
          })),
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.sessionsCount - a.sessionsCount);
  }, [workoutHistory]);

  const filteredExercisesHistory = useMemo(() => {
    if (!exerciseSearch.trim()) return exercisesHistory;
    const term = exerciseSearch.toLowerCase();
    return exercisesHistory.filter(e => 
      e.exerciseName.toLowerCase().includes(term) ||
      e.targetMuscle.toLowerCase().includes(term)
    );
  }, [exercisesHistory, exerciseSearch]);

  const handleOpenExerciseModal = (exerciseId: string, fallbackName: string, targetMuscle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const fullEx = getExerciseById(exerciseId);
    if (fullEx) {
      setSelectedExerciseForModal(fullEx);
    } else {
      setSelectedExerciseForModal({
        id: exerciseId,
        name: fallbackName,
        targetMuscle: targetMuscle as any,
        synergistMuscles: [],
        movementPattern: 'horizontal_push',
        mechanic: 'compound',
        equipment: 'barbell',
        defaultRestSeconds: 90,
        isCustom: false,
        createdAt: new Date().toISOString(),
      });
    }
    setExerciseModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Superior Minimalista */}
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Treinos</Text>
          <Text style={styles.subtitle}>Registro detalhado de cargas, reps e tonelagem</Text>
        </View>

        {/* Card de Resumo Geral */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewCol}>
            <Text style={styles.overviewValue}>{workoutHistory.length}</Text>
            <Text style={styles.overviewLabel}>Sessões Concluídas</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewCol}>
            <Text style={styles.overviewValue}>{exercisesHistory.length}</Text>
            <Text style={styles.overviewLabel}>Exercícios Feitos</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewCol}>
            <Text style={[styles.overviewValue, { color: Theme.colors.primary }]}>
              {(totalVolumeAllTime / 1000).toFixed(1)} t
            </Text>
            <Text style={styles.overviewLabel}>Tonelagem Total</Text>
          </View>
        </View>

        {/* Seletor de Modo: Por Sessão vs Por Exercício */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, viewMode === 'sessions' && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setViewMode('sessions');
            }}
            activeOpacity={0.8}
          >
            <Layers size={14} color={viewMode === 'sessions' ? Theme.colors.textInverse : Theme.colors.textSecondary} />
            <Text style={[styles.tabBtnText, viewMode === 'sessions' && styles.tabBtnTextActive]}>
              Por Treino ({workoutHistory.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, viewMode === 'exercises' && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setViewMode('exercises');
            }}
            activeOpacity={0.8}
          >
            <Dumbbell size={14} color={viewMode === 'exercises' ? Theme.colors.textInverse : Theme.colors.textSecondary} />
            <Text style={[styles.tabBtnText, viewMode === 'exercises' && styles.tabBtnTextActive]}>
              Por Exercício ({exercisesHistory.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* VISÃO 1: LISTA POR TREINO (SESSÕES) */}
        {viewMode === 'sessions' && (
          <FlatList
            data={workoutHistory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              let sessionPRCount = 0;
              try {
                sessionPRCount = getSessionPRs(item.id).length;
              } catch {}

              return (
                <TouchableOpacity
                  style={styles.historyCard}
                  onPress={() => handleOpenDetail(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.workoutName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.dateRow}>
                        <Calendar size={12} color={Theme.colors.textMuted} />
                        <Text style={styles.dateText}>{formatDate(item.startTime)}</Text>
                      </View>
                    </View>

                    <View style={styles.cardActionsRow}>
                      <View style={styles.durationBadge}>
                        <Clock size={12} color={Theme.colors.primary} />
                        <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.cardTrashBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRequestDelete(item);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.pillsRow}>
                    <View style={styles.pill}>
                      <Weight size={13} color={Theme.colors.textSecondary} />
                      <Text style={styles.pillText}>
                        <Text style={styles.metricBold}>
                          {Math.round(item.totalTonnageKg).toLocaleString('pt-BR')}
                        </Text> kg volume
                      </Text>
                    </View>

                    <View style={styles.pill}>
                      <Dumbbell size={13} color={Theme.colors.textSecondary} />
                      <Text style={styles.pillText}>
                        <Text style={styles.metricBold}>{item.totalSets}</Text> séries
                      </Text>
                    </View>

                    {sessionPRCount > 0 && (
                      <View style={[styles.pill, styles.prPill]}>
                        <Trophy size={12} color={Theme.colors.textInverse} />
                        <Text style={styles.prPillText}>
                          {sessionPRCount} {sessionPRCount === 1 ? 'PR' : 'PRs'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.exercisesSummary}>
                    {item.exercises.slice(0, 4).map((we) => {
                      const completedSets = we.sets.filter((s) => s.completed);
                      const maxWeight = Math.max(0, ...completedSets.map((s) => s.weightKg));

                      return (
                        <View key={we.id} style={styles.exerciseSummaryRow}>
                          <Text style={styles.summaryExerciseName} numberOfLines={1}>
                            {completedSets.length}× {we.exerciseName}
                          </Text>
                          {maxWeight > 0 && (
                            <Text style={styles.summaryBestSet}>Melhor: {maxWeight}kg</Text>
                          )}
                        </View>
                      );
                    })}
                    {item.exercises.length > 4 && (
                      <Text style={styles.moreExercisesText}>
                        + {item.exercises.length - 4} outros exercícios...
                      </Text>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>Toque para ver séries detalhadas</Text>
                    <ChevronRight size={14} color={Theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Trophy size={48} color={Theme.colors.borderLight} />
                <Text style={styles.emptyTitle}>Nenhum treino registrado ainda</Text>
                <Text style={styles.emptySubtitle}>
                  Inicie seu primeiro treino na aba "Treino" para começar a consolidar seu histórico de força e evolução.
                </Text>
              </View>
            }
          />
        )}

        {/* VISÃO 2: DETALHADO POR EXERCÍCIO (TODOS OS EXERCÍCIOS JÁ FEITOS) */}
        {viewMode === 'exercises' && (
          <View style={{ flex: 1 }}>
            {/* Barra de Busca de Exercício no Histórico */}
            <View style={styles.searchBar}>
              <Search size={15} color={Theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrar exercícios já realizados..."
                placeholderTextColor={Theme.colors.textMuted}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                clearButtonMode="while-editing"
              />
            </View>

            <FlatList
              data={filteredExercisesHistory}
              keyExtractor={(item) => item.exerciseId}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.exerciseHistoryCard}>
                  {/* Topo do Exercício */}
                  <TouchableOpacity
                    style={styles.exCardHeaderPressable}
                    activeOpacity={0.8}
                    onPress={() => handleOpenExerciseModal(item.exerciseId, item.exerciseName, item.targetMuscle)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exHistoryName}>{item.exerciseName}</Text>
                      <View style={styles.exMetaRow}>
                        <View style={styles.musclePill}>
                          <Text style={styles.musclePillText}>{item.targetMuscle.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.exSessionsCountText}>
                          {item.sessionsCount} {item.sessionsCount === 1 ? 'treino' : 'treinos'} • {item.totalSetsDone} séries feitas
                        </Text>
                      </View>
                    </View>

                    <View style={styles.exHeaderMetrics}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.exBestWeightText}>Máx: {item.bestWeightKg} kg</Text>
                        <Text style={styles.exBest1RMText}>1RM: {item.best1RM} kg</Text>
                      </View>
                      <ChevronRight size={16} color={Theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  {/* Sessões e Séries Detalhadas do Exercício */}
                  <View style={styles.exSessionsWrapper}>
                    <Text style={styles.exSessionsHeading}>Histórico Completo de Execuções:</Text>
                    {item.sessions.map((sess, sIdx) => (
                      <View key={sess.sessionId || sIdx} style={styles.exSessionEntry}>
                        <View style={styles.exSessionEntryTop}>
                          <Text style={styles.exSessionNameText}>{sess.sessionName}</Text>
                          <Text style={styles.exSessionDateText}>{formatDate(sess.date)}</Text>
                        </View>

                        {/* Grade com todas as séries e reps feitas na sessão */}
                        <View style={styles.setsFlowRow}>
                          {sess.sets.map((st, setIdx) => (
                            <View key={setIdx} style={styles.setTag}>
                              <Text style={styles.setTagNumber}>#{st.setNumber}</Text>
                              <Text style={styles.setTagMetrics}>
                                {st.weightKg} kg × {st.reps}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Dumbbell size={48} color={Theme.colors.borderLight} />
                  <Text style={styles.emptyTitle}>
                    {exerciseSearch ? 'Nenhum exercício encontrado' : 'Nenhum exercício registrado'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {exerciseSearch 
                      ? 'Tente buscar por outro termo ou limpe o filtro.' 
                      : 'Ao concluir seus treinos, todos os exercícios realizados aparecerão aqui com cada repetição e carga salva.'}
                  </Text>
                </View>
              }
            />
          </View>
        )}

        {/* Modal de Detalhamento da Sessão */}
        <WorkoutDetailModal
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          session={selectedSession}
          onDelete={handleRequestDelete}
        />

        {/* Modal de Progresso e Curva de Força do Exercício */}
        <ExerciseProgressModal
          visible={exerciseModalVisible}
          onClose={() => {
            setExerciseModalVisible(false);
            setSelectedExerciseForModal(null);
          }}
          exercise={selectedExerciseForModal}
        />

        {/* Modal de Confirmação de Exclusão */}
        <Modal
          visible={!!sessionToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setSessionToDelete(null)}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalCard}>
              <View style={styles.deleteModalHeader}>
                <View style={styles.deleteIconBadge}>
                  <AlertTriangle size={20} color="#EF4444" />
                </View>
                <Text style={styles.deleteModalTitle}>Excluir Treino?</Text>
              </View>

              <Text style={styles.deleteModalText}>
                Tem certeza que deseja excluir o treino{' '}
                <Text style={styles.deleteModalWorkoutName}>"{sessionToDelete?.name}"</Text> do seu histórico? Esta ação é irreversível e removerá os dados de tonelagem e eventuais recordes registrados nesta sessão.
              </Text>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => setSessionToDelete(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.8}
                >
                  <Trash2 size={15} color="#FFFFFF" />
                  <Text style={styles.deleteConfirmBtnText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
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
  overviewCard: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
  },
  overviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: Theme.colors.border,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  overviewLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Theme.colors.textInverse,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 6,
  },
  pillText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  metricBold: {
    fontWeight: '800',
    color: Theme.colors.text,
  },
  prPill: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  prPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.textInverse,
    letterSpacing: 0.4,
  },
  exercisesSummary: {
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
  },
  exerciseSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryExerciseName: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  summaryBestSet: {
    fontSize: 12,
    color: Theme.colors.text,
    fontWeight: '800',
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  moreExercisesText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  cardFooterText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  exerciseHistoryCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exCardHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  exHistoryName: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  exMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  musclePill: {
    backgroundColor: '#18181B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  musclePillText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },
  exSessionsCountText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  exHeaderMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exBestWeightText: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  exBest1RMText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  exSessionsWrapper: {
    paddingTop: 10,
    gap: 10,
  },
  exSessionsHeading: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exSessionEntry: {
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 8,
  },
  exSessionEntryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exSessionNameText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  exSessionDateText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  setsFlowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  setTagNumber: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  setTagMetrics: {
    color: Theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTrashBtn: {
    padding: 6,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  deleteIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  deleteModalText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },
  deleteModalWorkoutName: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  deleteConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
