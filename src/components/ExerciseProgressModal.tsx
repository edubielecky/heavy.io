import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Rect, Text as SvgText, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { 
  X, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  Dumbbell, 
  Clock, 
  Activity, 
  Plus, 
  Info,
  Layers,
  Pencil,
  Trash2,
  Sparkles
} from 'lucide-react-native';
import Theme from '../theme/theme';
import { Exercise } from '../types/workout';
import { getExerciseProgressHistory, ExerciseProgressPoint } from '../database/database';
import { useWorkoutStore } from '../store/workoutStore';
import { useResponsive } from '../hooks/useResponsive';

interface ExerciseProgressModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  onEditCustomExercise?: (exercise: Exercise) => void;
  onDeleteCustomExercise?: (exercise: Exercise) => void;
}

const CHART_HEIGHT = 160;

export const ExerciseProgressModal: React.FC<ExerciseProgressModalProps> = ({
  visible,
  onClose,
  exercise,
  onEditCustomExercise,
  onDeleteCustomExercise,
}) => {
  const { width, isFoldable, modalMaxWidth } = useResponsive();
  const chartWidth = isFoldable ? Math.min(modalMaxWidth - 64, 520) : width - 64;
  const { currentWorkout, addExerciseToCurrentWorkout } = useWorkoutStore();

  const history = useMemo(() => {
    if (!exercise) return [];
    try {
      return getExerciseProgressHistory(exercise.id);
    } catch (e) {
      console.error('Erro ao buscar histórico do exercício:', e);
      return [];
    }
  }, [exercise]);

  // Coordenadas para o gráfico SVG de evolução
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    const points = history.slice(-7); // Últimos até 7 registros
    const allWeights = points.map(p => p.maxWeightKg);
    const minW = Math.max(0, Math.min(...allWeights) - 5);
    const maxW = Math.max(...allWeights, minW + 10);
    const weightRange = maxW - minW || 1;

    const paddingX = 24;
    const paddingY = 24;
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = CHART_HEIGHT - paddingY * 2;

    const coords = points.map((p, idx) => {
      const x = points.length === 1 
        ? paddingX + usableWidth / 2 
        : paddingX + (idx / (points.length - 1)) * usableWidth;
      const y = paddingY + usableHeight - ((p.maxWeightKg - minW) / weightRange) * usableHeight;
      return { x, y, point: p };
    });

    let pathD = '';
    coords.forEach((c, idx) => {
      if (idx === 0) {
        pathD += `M ${c.x} ${c.y}`;
      } else {
        pathD += ` L ${c.x} ${c.y}`;
      }
    });

    return { coords, pathD, minW, maxW };
  }, [history, chartWidth]);

  if (!exercise) return null;

  // Métricas de evolução
  const firstSession = history[0];
  const lastSession = history[history.length - 1];
  const maxWeightAllTime = Math.max(0, ...history.map(h => h.maxWeightKg));
  const max1RMAllTime = Math.max(0, ...history.map(h => h.estimated1RM));
  
  const progressionKg = (lastSession && firstSession) 
    ? lastSession.maxWeightKg - firstSession.maxWeightKg 
    : 0;

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addExerciseToCurrentWorkout(exercise);
    onClose();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={[styles.overlay, isFoldable && styles.overlayFoldable]}>
        <View style={[styles.container, isFoldable && { maxWidth: modalMaxWidth, borderRadius: 16, borderLeftWidth: 1, borderRightWidth: 1 }]}>
          {/* Header Superior */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.badgeRow}>
                <Activity size={12} color={Theme.colors.primary} />
                <Text style={styles.badgeRowText}>CURVA DE FORÇA & ESPECIFICAÇÕES</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {exercise.name}
              </Text>
              {exercise.nameEn && (
                <Text style={styles.subEn}>{exercise.nameEn}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={20} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tags e Especificações Biomecânicas */}
            <View style={styles.tagsContainer}>
              {exercise.isCustom && (
                <View style={[styles.tag, styles.customTag]}>
                  <Sparkles size={10} color={Theme.colors.primary} />
                  <Text style={styles.customTagText}>PERSONALIZADO</Text>
                </View>
              )}
              <View style={styles.tag}>
                <Text style={styles.tagText}>{exercise.targetMuscle.toUpperCase()}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{exercise.equipment.toUpperCase()}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {exercise.mechanic === 'compound' ? 'COMPOSTO' : 'ISOLADOR'}
                </Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {exercise.movementPattern.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              <View style={[styles.tag, styles.tagRest]}>
                <Clock size={10} color={Theme.colors.textMuted} />
                <Text style={[styles.tagText, { color: Theme.colors.textMuted }]}>
                  {exercise.defaultRestSeconds}s descanso
                </Text>
              </View>
            </View>

            {/* Ações de Gestão do Exercício Customizado */}
            {exercise.isCustom && (onEditCustomExercise || onDeleteCustomExercise) && (
              <View style={styles.customManagementRow}>
                {onEditCustomExercise && (
                  <TouchableOpacity
                    style={styles.editCustomBtn}
                    onPress={() => {
                      onClose();
                      onEditCustomExercise(exercise);
                    }}
                    activeOpacity={0.8}
                  >
                    <Pencil size={13} color={Theme.colors.text} />
                    <Text style={styles.editCustomBtnText}>Editar Exercício</Text>
                  </TouchableOpacity>
                )}
                {onDeleteCustomExercise && (
                  <TouchableOpacity
                    style={styles.deleteCustomBtn}
                    onPress={() => {
                      onDeleteCustomExercise(exercise);
                    }}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={13} color={Theme.colors.danger} />
                    <Text style={styles.deleteCustomBtnText}>Excluir</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Sinergistas */}
            {exercise.synergistMuscles.length > 0 && (
              <Text style={styles.synergistsLine}>
                Músculos Sinergistas: <Text style={{ color: Theme.colors.textSecondary }}>{exercise.synergistMuscles.join(', ')}</Text>
              </Text>
            )}

            {/* SEÇÃO DA CURVA DE FORÇA / PROGRESSÃO */}
            <View style={styles.sectionHeadingRow}>
              <TrendingUp size={14} color={Theme.colors.primary} />
              <Text style={styles.sectionHeading}>EVOLUÇÃO DA CARGA MÁXIMA & 1RM</Text>
            </View>

            {history.length > 0 ? (
              <View style={styles.progressCard}>
                {/* Métricas Principais */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Recorde (PR)</Text>
                    <Text style={styles.metricValue}>{maxWeightAllTime} kg</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>1RM Estimado</Text>
                    <Text style={[styles.metricValue, { color: Theme.colors.primary }]}>
                      {max1RMAllTime} kg
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Evolução</Text>
                    <Text style={[styles.metricValue, { color: progressionKg >= 0 ? Theme.colors.success : Theme.colors.danger }]}>
                      {progressionKg >= 0 ? `+${progressionKg} kg` : `${progressionKg} kg`}
                    </Text>
                  </View>
                </View>

                {/* Gráfico SVG de Progressão */}
                {chartData && (
                  <View style={styles.chartContainer}>
                    <Svg width={chartWidth} height={CHART_HEIGHT}>
                      {/* Linhas de grade sutis */}
                      <Line
                        x1="20"
                        y1={CHART_HEIGHT - 24}
                        x2={chartWidth - 20}
                        y2={CHART_HEIGHT - 24}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                      />
                      <Line
                        x1="20"
                        y1="24"
                        x2={chartWidth - 20}
                        y2="24"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                      />

                      {/* Linha de Traçado da Força */}
                      {chartData.pathD && (
                        <Path
                          d={chartData.pathD}
                          fill="none"
                          stroke={Theme.colors.primary}
                          strokeWidth="2.5"
                        />
                      )}

                      {/* Pontos de Dados */}
                      {chartData.coords.map((c, i) => (
                        <React.Fragment key={i}>
                          <Circle
                            cx={c.x}
                            cy={c.y}
                            r="4.5"
                            fill="#09090B"
                            stroke={Theme.colors.primary}
                            strokeWidth="2"
                          />
                          <SvgText
                            x={c.x}
                            y={c.y - 8}
                            fill="#FFFFFF"
                            fontSize="9"
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            {`${c.point.maxWeightKg}k`}
                          </SvgText>
                          <SvgText
                            x={c.x}
                            y={CHART_HEIGHT - 8}
                            fill="#71717A"
                            fontSize="8"
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {formatDate(c.point.date)}
                          </SvgText>
                        </React.Fragment>
                      ))}
                    </Svg>
                  </View>
                )}

                {/* Histórico Cronológico de Sessões com Séries Detalhadas */}
                <Text style={styles.historySubHeading}>Registros Cronológicos Detalhados:</Text>
                <View style={styles.historyList}>
                  {history.slice().reverse().map((pt, idx) => (
                    <View key={pt.sessionId || idx} style={styles.historyCardItem}>
                      <View style={styles.historyItemTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyRowSessionName}>{pt.sessionName}</Text>
                          <Text style={styles.historyRowDate}>{formatDate(pt.date)} • {pt.totalSets} {pt.totalSets === 1 ? 'série' : 'séries'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.historyRowWeight}>Máx: {pt.maxWeightKg} kg</Text>
                          <Text style={styles.historyRow1RM}>1RM: {pt.estimated1RM}kg</Text>
                        </View>
                      </View>

                      {/* Grade de Séries com Carga e Reps */}
                      {pt.sets && pt.sets.length > 0 && (
                        <View style={styles.setsDetailGrid}>
                          {pt.sets.map((s, sIdx) => (
                            <View key={sIdx} style={styles.setDetailPill}>
                              <Text style={styles.setDetailNumber}>#{s.setNumber}</Text>
                              <Text style={styles.setDetailContent}>
                                {s.weightKg} kg × {s.reps}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              /* Estado Vazio de Força */
              <View style={styles.emptyProgressCard}>
                <Activity size={32} color={Theme.colors.borderLight} />
                <Text style={styles.emptyProgressTitle}>Sem registros de carga ainda</Text>
                <Text style={styles.emptyProgressSub}>
                  Execute este movimento em seus treinos para traçar sua curva de sobrecarga e acompanhar a evolução do seu 1RM estimado ao longo do tempo.
                </Text>
              </View>
            )}

            {/* Instruções Técnicas de Execução */}
            {exercise.instructions && (
              <View style={styles.instructionsBox}>
                <View style={styles.instructionsHeader}>
                  <Info size={13} color={Theme.colors.textSecondary} />
                  <Text style={styles.instructionsTitle}>TÉCNICA & ORIENTAÇÃO BIOMECÂNICA</Text>
                </View>
                <Text style={styles.instructionsText}>{exercise.instructions}</Text>
              </View>
            )}
          </ScrollView>

          {/* Rodapé: Adicionar ao Treino Ativo se houver sessão */}
          {currentWorkout && (
            <View style={styles.footerAction}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                <Plus size={18} color={Theme.colors.textInverse} />
                <Text style={styles.addBtnText}>Adicionar ao Treino Ativo</Text>
              </TouchableOpacity>
            </View>
          )}
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
  overlayFoldable: {
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    width: '100%',
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeRowText: {
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
  subEn: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tagRest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  synergistsLine: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 18,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionHeading: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  progressCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#18181B',
    padding: 10,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  chartContainer: {
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 16,
  },
  historySubHeading: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  historyList: {
    gap: 10,
  },
  historyCardItem: {
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyRowSessionName: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  historyRowDate: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  historyRowWeight: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  historyRow1RM: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  setsDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  setDetailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  setDetailNumber: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  setDetailContent: {
    color: Theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyProgressCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 20,
    gap: 8,
  },
  emptyProgressTitle: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  emptyProgressSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionsBox: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  instructionsTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  instructionsText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  footerAction: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: '#09090B',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 50,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  addBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
  customTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#3F3F46',
  },
  customTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: 0.5,
  },
  customManagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  editCustomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: 9,
  },
  editCustomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  deleteCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  deleteCustomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.danger,
  },
});
