import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Activity,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Layers,
  Dumbbell,
  ArrowRight,
  Sliders,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Theme from '../theme/theme';
import { WorkoutProgram, Routine } from '../types/workout';
import {
  WorkoutAuditResult,
  BiomechanicFinding,
  auditWorkoutProgram,
  auditSingleRoutine,
  AuditAction,
} from '../services/aiWorkoutService';

interface WorkoutAuditModalProps {
  visible: boolean;
  onClose: () => void;
  program?: WorkoutProgram | null;
  routine?: Routine | null;
  onApplyAction?: (action: AuditAction) => void;
}

export const WorkoutAuditModal: React.FC<WorkoutAuditModalProps> = ({
  visible,
  onClose,
  program,
  routine,
  onApplyAction,
}) => {
  const [loading, setLoading] = useState(true);
  const [auditResult, setAuditResult] = useState<WorkoutAuditResult | null>(null);
  const [activeTab, setActiveTab] = useState<'findings' | 'volume'>('findings');

  const executeAudit = async () => {
    setLoading(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      if (program) {
        const res = await auditWorkoutProgram(program);
        setAuditResult(res);
      } else if (routine) {
        const res = await auditSingleRoutine(routine);
        setAuditResult(res);
      }
    } catch (err) {
      console.error('Erro ao auditar rotina:', err);
      Alert.alert('Erro na Análise', 'Não foi possível concluir o diagnóstico biomecânico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && (program || routine)) {
      executeAudit();
      setActiveTab('findings');
    }
  }, [visible, program, routine]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return Theme.colors.success;
    if (score >= 70) return Theme.colors.text;
    return Theme.colors.warning;
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 85) return 'ALTA EFICIÊNCIA BIOMECÂNICA';
    if (score >= 70) return 'EQUILIBRADO COM OPORTUNIDADES';
    return 'ATENÇÃO A SOBRECARGA E DESBALANÇO';
  };

  const getAxialColor = (level: string) => {
    if (level === 'low') return Theme.colors.success;
    if (level === 'moderate') return Theme.colors.accentTitanium;
    if (level === 'high') return Theme.colors.warning;
    return Theme.colors.danger;
  };

  const getLandmarkBadge = (landmark: string) => {
    switch (landmark) {
      case 'MAV':
        return { label: 'MAV', bg: 'rgba(16, 185, 129, 0.12)', border: Theme.colors.success, text: Theme.colors.success };
      case 'MEV':
        return { label: 'MEV', bg: 'rgba(212, 212, 216, 0.10)', border: Theme.colors.borderLight, text: Theme.colors.accentTitanium };
      case 'MRV':
        return { label: 'MRV', bg: 'rgba(245, 158, 11, 0.12)', border: Theme.colors.warning, text: Theme.colors.warning };
      case 'EXCESSIVE':
        return { label: '> MRV', bg: 'rgba(239, 68, 68, 0.12)', border: Theme.colors.danger, text: Theme.colors.danger };
      default:
        return { label: 'SUB-MEV', bg: 'rgba(113, 113, 122, 0.10)', border: Theme.colors.border, text: Theme.colors.textMuted };
    }
  };

  const handleAction = (action?: AuditAction) => {
    if (!action) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (onApplyAction) {
      onApplyAction(action);
      onClose();
    } else {
      Alert.alert(
        'Ação Biomecânica',
        action.reason,
        [{ text: 'Entendido' }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Técnico */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.titleRow}>
              <Activity size={18} color={Theme.colors.primary} />
              <Text style={styles.headerTitle}>DIAGNÓSTICO BIOMECÂNICO</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.aiBadge}>
                <Sparkles size={11} color={Theme.colors.textSecondary} />
                <Text style={styles.aiBadgeText}>
                  {auditResult?.isAiGenerated ? 'IA GEMINI 3.6 FLASH' : 'MOTOR CINEMÁTICO LOCAL'}
                </Text>
              </View>
              <Text style={styles.targetNameText} numberOfLines={1}>
                {program?.name || routine?.name || 'Treino'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingTitle}>PROCESSANDO VETORES BIOMECÂNICOS</Text>
            <Text style={styles.loadingSubtitle}>
              Calculando sobrecarga axial, razão agonista/antagonista e marcos de volume...
            </Text>
          </View>
        ) : auditResult ? (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Score Central Hero */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreTopRow}>
                <View style={styles.scoreValueContainer}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(auditResult.overallScore) }]}>
                    {auditResult.overallScore}
                  </Text>
                  <Text style={styles.scoreDenominator}>/ 100</Text>
                </View>
                <View style={styles.scoreLabelBadge}>
                  <Text style={[styles.scoreBadgeText, { color: getScoreColor(auditResult.overallScore) }]}>
                    {getScoreBadgeText(auditResult.overallScore)}
                  </Text>
                </View>
              </View>

              {/* Barra de Progresso Fina */}
              <View style={styles.scoreBarTrack}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${Math.min(100, auditResult.overallScore)}%`,
                      backgroundColor: getScoreColor(auditResult.overallScore),
                    },
                  ]}
                />
              </View>

              {/* Síntese Técnica */}
              <Text style={styles.summaryText}>{auditResult.summary}</Text>
            </View>

            {/* Grid 2x2 de Métricas Críticas */}
            <View style={styles.metricsGrid}>
              {/* 1. Carga Axial */}
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>CARGA AXIAL LOMBAR</Text>
                <View style={styles.metricTileValueRow}>
                  <Text
                    style={[
                      styles.metricTileValue,
                      { color: getAxialColor(auditResult.axialFatigue.level) },
                    ]}
                  >
                    {auditResult.axialFatigue.level.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.metricTileSubtext} numberOfLines={2}>
                  {auditResult.axialFatigue.description}
                </Text>
              </View>

              {/* 2. Push vs Pull Ratio */}
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>RELAÇÃO PUSH : PULL</Text>
                <View style={styles.metricTileValueRow}>
                  <Text style={styles.metricTileValue}>
                    {auditResult.pushPullBalance.ratio}:1
                  </Text>
                  <Text style={styles.metricTileUnit}>
                    ({auditResult.pushPullBalance.pushSets} / {auditResult.pushPullBalance.pullSets})
                  </Text>
                </View>
                <Text style={styles.metricTileSubtext} numberOfLines={2}>
                  {auditResult.pushPullBalance.comment}
                </Text>
              </View>

              {/* 3. Equilíbrio de Coxa (Quads vs Posteriores) */}
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>QUADS : POSTERIOR</Text>
                <View style={styles.metricTileValueRow}>
                  <Text style={styles.metricTileValue}>
                    {auditResult.lowerChainBalance.ratio}:1
                  </Text>
                  <Text style={styles.metricTileUnit}>
                    ({auditResult.lowerChainBalance.quadSets} / {auditResult.lowerChainBalance.hamstringSets})
                  </Text>
                </View>
                <Text style={styles.metricTileSubtext} numberOfLines={2}>
                  {auditResult.lowerChainBalance.comment}
                </Text>
              </View>

              {/* 4. Cobertura de Alongamento */}
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>ALONGAMENTO SOB TENSÃO</Text>
                <View style={styles.metricTileValueRow}>
                  <Text style={styles.metricTileValue}>
                    {auditResult.stretchCoverage.percentage}%
                  </Text>
                </View>
                <Text style={styles.metricTileSubtext} numberOfLines={2}>
                  {auditResult.stretchCoverage.comment}
                </Text>
              </View>
            </View>

            {/* Alternador de Abas */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'findings' && styles.tabButtonActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab('findings');
                }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'findings' && styles.tabButtonTextActive,
                  ]}
                >
                  DIAGNÓSTICOS & AJUSTES ({auditResult.findings.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'volume' && styles.tabButtonActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab('volume');
                }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'volume' && styles.tabButtonTextActive,
                  ]}
                >
                  MARCOS DE VOLUME ({auditResult.volumeBreakdown.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conteúdo da Aba 1: Diagnósticos e Achados */}
            {activeTab === 'findings' && (
              <View style={styles.findingsList}>
                {auditResult.findings.map(finding => {
                  const isCrit = finding.severity === 'critical';
                  const isWarn = finding.severity === 'warning';
                  const isOpt = finding.severity === 'optimization';
                  const isPos = finding.severity === 'positive';

                  const badgeColor = isCrit
                    ? Theme.colors.danger
                    : isWarn
                    ? Theme.colors.warning
                    : isPos
                    ? Theme.colors.success
                    : Theme.colors.accentTitanium;

                  const badgeLabel = isCrit
                    ? 'RISCO CRÍTICO'
                    : isWarn
                    ? 'ATENÇÃO MECÂNICA'
                    : isPos
                    ? 'ESTRUTURA SÓLIDA'
                    : 'OTIMIZAÇÃO';

                  return (
                    <View key={finding.id} style={styles.findingCard}>
                      <View style={styles.findingHeader}>
                        <View
                          style={[
                            styles.findingBadge,
                            { borderColor: badgeColor, backgroundColor: `${badgeColor}15` },
                          ]}
                        >
                          <Text style={[styles.findingBadgeText, { color: badgeColor }]}>
                            {badgeLabel}
                          </Text>
                        </View>
                        <Text style={styles.findingTitle}>{finding.title}</Text>
                      </View>

                      <Text style={styles.findingDesc}>{finding.description}</Text>

                      {finding.recommendation ? (
                        <View style={styles.recommendationBox}>
                          <Text style={styles.recommendationLabel}>RECOMENDAÇÃO TÉCNICA:</Text>
                          <Text style={styles.recommendationText}>
                            {finding.recommendation}
                          </Text>
                        </View>
                      ) : null}

                      {finding.suggestedAction ? (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleAction(finding.suggestedAction)}
                        >
                          <View style={styles.actionButtonContent}>
                            <Sliders size={14} color={Theme.colors.textInverse} />
                            <Text style={styles.actionButtonText}>
                              Substituir por {finding.suggestedAction.toExerciseName}
                            </Text>
                          </View>
                          <ArrowRight size={14} color={Theme.colors.textInverse} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Conteúdo da Aba 2: Marcos de Volume (MEV, MAV, MRV) */}
            {activeTab === 'volume' && (
              <View style={styles.volumeList}>
                <View style={styles.volumeHeaderNotice}>
                  <Text style={styles.volumeNoticeText}>
                    Classificação baseada em volume efetivo semanal (Séries diretas com RIR 1–3).
                  </Text>
                </View>

                {auditResult.volumeBreakdown.map(item => {
                  const badge = getLandmarkBadge(item.landmark);
                  return (
                    <View key={item.muscle} style={styles.volumeItemRow}>
                      <View style={styles.volumeItemMain}>
                        <Text style={styles.volumeMuscleLabel}>{item.muscleLabel}</Text>
                        <Text style={styles.volumeTargetText}>Alvo: {item.targetRange}</Text>
                      </View>

                      <View style={styles.volumeItemRight}>
                        <Text style={styles.volumeSetsCount}>{item.weeklySets} séries</Text>
                        <View
                          style={[
                            styles.volumeLandmarkBadge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <Text style={[styles.volumeLandmarkText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Rodapé com botão de reanálise */}
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={styles.reanalyzeButton}
                onPress={executeAudit}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color={Theme.colors.textSecondary} />
                <Text style={styles.reanalyzeButtonText}>REANALISAR DADOS DO TREINO</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  headerTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: 1.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  targetNameText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    flex: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: 1,
    marginTop: 8,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  scoreCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 18,
    gap: 12,
  },
  scoreTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  scoreDenominator: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  scoreLabelBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreBarTrack: {
    height: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  summaryText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 12,
    gap: 6,
  },
  metricTileLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  metricTileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricTileValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  metricTileUnit: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  metricTileSubtext: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    lineHeight: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 3,
    marginTop: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: Theme.colors.text,
  },
  findingsList: {
    gap: 12,
  },
  findingCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 14,
    gap: 8,
  },
  findingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  findingBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  findingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  findingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
    flex: 1,
  },
  findingDesc: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
  recommendationBox: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: Theme.colors.accentTitanium,
    marginTop: 4,
    gap: 4,
  },
  recommendationLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  recommendationText: {
    fontSize: 11,
    color: Theme.colors.text,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textInverse,
  },
  volumeList: {
    gap: 8,
  },
  volumeHeaderNotice: {
    paddingVertical: 4,
  },
  volumeNoticeText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  volumeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  volumeItemMain: {
    gap: 2,
  },
  volumeMuscleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  volumeTargetText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
  },
  volumeItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeSetsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  volumeLandmarkBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  volumeLandmarkText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerActions: {
    marginTop: 8,
    alignItems: 'center',
  },
  reanalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  reanalyzeButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.8,
  },
});
