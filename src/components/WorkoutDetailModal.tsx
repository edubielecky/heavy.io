import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Clock, Weight, Dumbbell, Trophy, Check, Award, Flame, Trash2 } from 'lucide-react-native';
import Theme from '../theme/theme';
import { WorkoutSession, WorkoutExercise, PersonalRecord } from '../types/workout';
import { getWorkoutSession, getSessionPRs } from '../database/database';

interface WorkoutDetailModalProps {
  visible: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
  onDelete?: (session: WorkoutSession) => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  onClose,
  session,
  onDelete,
}) => {
  // Busca dados completos atualizados da sessão e os PRs batidos
  const { detailedSession, sessionPRs } = useMemo(() => {
    if (!session?.id) return { detailedSession: null, sessionPRs: [] };
    try {
      const detailed = getWorkoutSession(session.id) || session;
      const prs = getSessionPRs(session.id);
      return { detailedSession: detailed, sessionPRs: prs };
    } catch {
      return { detailedSession: session, sessionPRs: [] };
    }
  }, [session]);

  if (!detailedSession) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    const remainder = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const m = mins % 60;
      return `${hours}h ${m}m`;
    }
    return `${mins} min`;
  };

  // Mapeia quais exercícios bateram PR nesta sessão
  const prMap = new Map<string, PersonalRecord>();
  sessionPRs.forEach(pr => prMap.set(pr.exerciseId, pr));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Superior */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.badgeStep}>
                <Flame size={12} color={Theme.colors.primary} />
                <Text style={styles.badgeStepText}>DETALHAMENTO DE SESSÃO</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {detailedSession.name}
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={12} color={Theme.colors.textMuted} />
                <Text style={styles.dateText}>{formatDate(detailedSession.startTime)}</Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              {onDelete && (
                <TouchableOpacity
                  style={styles.headerDeleteBtn}
                  onPress={() => onDelete(detailedSession)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={17} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <X size={20} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Banner de Métricas Consolidadas */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Weight size={15} color={Theme.colors.primary} />
                <Text style={styles.metricValue}>
                  {Math.round(detailedSession.totalTonnageKg).toLocaleString('pt-BR')} kg
                </Text>
                <Text style={styles.metricLabel}>Tonelagem Total</Text>
              </View>

              <View style={styles.metricCard}>
                <Dumbbell size={15} color={Theme.colors.textSecondary} />
                <Text style={styles.metricValue}>{detailedSession.totalSets}</Text>
                <Text style={styles.metricLabel}>Séries Feitas</Text>
              </View>

              <View style={styles.metricCard}>
                <Clock size={15} color={Theme.colors.textSecondary} />
                <Text style={styles.metricValue}>{formatDuration(detailedSession.durationSeconds)}</Text>
                <Text style={styles.metricLabel}>Duração</Text>
              </View>
            </View>

            {/* Destaque de PRs se houver */}
            {sessionPRs.length > 0 && (
              <View style={styles.prBanner}>
                <Trophy size={16} color={Theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.prBannerTitle}>
                    {sessionPRs.length} {sessionPRs.length === 1 ? 'Recorde Pessoal Batido' : 'Recordes Pessoais Batidos'}!
                  </Text>
                  <Text style={styles.prBannerSub}>
                    {sessionPRs.map(pr => `${pr.exerciseName} (${pr.maxWeightKg}kg)`).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Lista Detalhada de Exercícios */}
            <Text style={styles.sectionHeading}>Exercícios e Séries Registradas:</Text>

            <View style={styles.exercisesList}>
              {detailedSession.exercises.map((we, exIdx) => {
                const completedSets = we.sets.filter(s => s.completed);
                const hasPR = prMap.has(we.exerciseId);
                const prInfo = prMap.get(we.exerciseId);

                return (
                  <View key={we.id || `${we.exerciseId}_${exIdx}`} style={styles.exerciseCard}>
                    {/* Header do Exercício */}
                    <View style={styles.exCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exName}>{we.exerciseName}</Text>
                        <View style={styles.exBadgeRow}>
                          <View style={styles.muscleBadge}>
                            <Text style={styles.muscleBadgeText}>{we.targetMuscle.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.setsSummaryText}>
                            {completedSets.length} séries concluídas
                          </Text>
                        </View>
                      </View>

                      {hasPR && prInfo && (
                        <View style={styles.prBadge}>
                          <Trophy size={11} color={Theme.colors.textInverse} />
                          <Text style={styles.prBadgeText}>PR: {prInfo.maxWeightKg}kg</Text>
                        </View>
                      )}
                    </View>

                    {/* Tabela de Séries */}
                    <View style={styles.setsTable}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeadCol, { width: 36 }]}>SÉRIE</Text>
                        <Text style={[styles.tableHeadCol, { width: 68 }]}>TIPO</Text>
                        <Text style={[styles.tableHeadCol, { flex: 1, textAlign: 'center' }]}>CARGA</Text>
                        <Text style={[styles.tableHeadCol, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                        <Text style={[styles.tableHeadCol, { flex: 1, textAlign: 'right' }]}>VOLUME</Text>
                        <Text style={[styles.tableHeadCol, { width: 32, textAlign: 'right' }]}></Text>
                      </View>

                      {we.sets.map((st, sIdx) => {
                        const volumeKg = Math.round(st.weightKg * st.reps);
                        const typeLabelMap: Record<string, string> = {
                          normal: 'Normal',
                          warmup: 'Aquec.',
                          drop: 'Drop',
                          failure: 'Falha',
                        };

                        return (
                          <View
                            key={st.id || `${we.id}_s_${sIdx}`}
                            style={[
                              styles.setRow,
                              !st.completed && styles.setRowIncomplete,
                            ]}
                          >
                            <Text style={[styles.setCol, { width: 36, fontWeight: '800' }]}>
                              {st.setNumber}
                            </Text>
                            <View style={{ width: 68 }}>
                              <Text style={styles.setTypeText}>
                                {typeLabelMap[st.type] || 'Normal'}
                              </Text>
                            </View>
                            <Text style={[styles.setCol, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>
                              {st.weightKg} kg
                            </Text>
                            <Text style={[styles.setCol, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>
                              {st.reps}
                            </Text>
                            <Text style={[styles.setCol, { flex: 1, textAlign: 'right', color: Theme.colors.textSecondary }]}>
                              {volumeKg} kg
                            </Text>
                            <View style={{ width: 32, alignItems: 'flex-end' }}>
                              {st.completed ? (
                                <View style={styles.checkIcon}>
                                  <Check size={12} color={Theme.colors.success} />
                                </View>
                              ) : (
                                <Text style={styles.uncompletedDash}>-</Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Ação de Exclusão do Treino */}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteWorkoutBtn}
                onPress={() => onDelete(detailedSession)}
                activeOpacity={0.8}
              >
                <Trash2 size={15} color="#EF4444" />
                <Text style={styles.deleteWorkoutBtnText}>Excluir Treino do Histórico</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  badgeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  badgeStepText: {
    color: Theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 50,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    marginBottom: 22,
  },
  prBannerTitle: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  prBannerSub: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  exercisesList: {
    gap: 14,
  },
  exerciseCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exName: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  exBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  muscleBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },
  setsSummaryText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  prBadgeText: {
    color: Theme.colors.textInverse,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  setsTable: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableHeadCol: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  setRowIncomplete: {
    opacity: 0.4,
  },
  setCol: {
    color: Theme.colors.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  setTypeText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncompletedDash: {
    color: Theme.colors.textMuted,
    fontSize: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  deleteWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
    marginTop: 14,
    marginBottom: 24,
  },
  deleteWorkoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
