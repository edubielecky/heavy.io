import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Modal
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
  Activity,
  Flame,
  Trash2,
  AlertTriangle
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { WorkoutSession } from '../../src/types/workout';
import { WorkoutDetailModal } from '../../src/components/WorkoutDetailModal';
import { getSessionPRs } from '../../src/database/database';
import Theme from '../../src/theme/theme';

export default function HistoryScreen() {
  const { workoutHistory, loadFromDatabase, deleteWorkoutFromHistory } = useWorkoutStore();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutSession | null>(null);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Superior Minimalista */}
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Treinos</Text>
          <Text style={styles.subtitle}>Consolidação de volume e sobrecarga progressiva</Text>
        </View>

        {/* Card de Resumo Geral */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewCol}>
            <Text style={styles.overviewValue}>{workoutHistory.length}</Text>
            <Text style={styles.overviewLabel}>Sessões Concluídas</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewCol}>
            <Text style={[styles.overviewValue, { color: Theme.colors.primary }]}>
              {(totalVolumeAllTime / 1000).toFixed(1)} t
            </Text>
            <Text style={styles.overviewLabel}>Tonelagem Acumulada</Text>
          </View>
        </View>

        {/* Lista de Sessões Passadas */}
        <FlatList
          data={workoutHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            // Checa se houve PRs nesta sessão
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
                {/* Topo do Card: Nome e Duração */}
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

                {/* Métricas Consolidadas: Tonelagem, Séries e PRs */}
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

                {/* Resumo de Exercícios */}
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

                {/* Rodapé do Card com Dica de Ação */}
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

        {/* Modal de Detalhamento da Sessão */}
        <WorkoutDetailModal
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          session={selectedSession}
          onDelete={handleRequestDelete}
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
    marginBottom: 16,
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
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 18,
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
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  overviewLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
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
