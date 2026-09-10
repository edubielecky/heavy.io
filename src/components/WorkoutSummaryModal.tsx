import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Share 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Trophy, 
  Clock, 
  Dumbbell, 
  Flame, 
  Share2, 
  Check, 
  X, 
  Award, 
  Layers,
  Heart,
  Activity
} from 'lucide-react-native';
import { WorkoutSession, PersonalRecord } from '../types/workout';
import Theme from '../theme/theme';

interface WorkoutSummaryModalProps {
  visible: boolean;
  session: WorkoutSession | null;
  prs: PersonalRecord[];
  onClose: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  visible,
  session,
  prs,
  onClose,
}) => {
  if (!session) return null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const durationText = formatDuration(session.durationSeconds || 0);
    const tonnageText = Math.round(session.totalTonnageKg).toLocaleString('pt-BR');

    let prsText = '';
    if (prs.length > 0) {
      prsText = '\n🏆 RECORDES PESSOAIS (PRs):\n' + prs.map(p => 
        `• ${p.exerciseName}: ${p.maxWeightKg} kg (${p.repsAtMaxWeight} reps) | 1RM ~${p.estimated1RM}kg`
      ).join('\n') + '\n';
    }

    const exercisesSummary = session.exercises
      .map(e => `• ${e.exerciseName}: ${e.sets.filter(s => s.completed).length} séries`)
      .join('\n');

    const bpmText = session.avgHeartRate 
      ? `\n💓 Freq. Cardíaca: ${session.avgHeartRate} BPM Médio (Pico: ${session.peakHeartRate || session.avgHeartRate} BPM)`
      : '';
    const caloriesText = session.activeCalories
      ? `\n🔥 Gasto Ativo: ${session.activeCalories} kcal`
      : '';

    const message = 
`⚡ heavy.io | Treino Concluído
━━━━━━━━━━━━━━━━━━
🏋️ ${session.name}
⏱️ Duração: ${durationText}
📊 Tonelagem: ${tonnageText} kg
🔢 Séries: ${session.totalSets}${bpmText}${caloriesText}
${prsText}
📋 Exercícios:
${exercisesSummary}

💪 Força, técnica e sobrecarga progressiva.
#heavyio #strength #powerlifting`;

    try {
      await Share.share({
        title: `Resumo de Treino - ${session.name}`,
        message,
      });
    } catch (err) {
      console.warn('Erro ao compartilhar resumo:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          
          {/* Header comemorativo */}
          <View style={styles.header}>
            <View style={styles.trophyCircle}>
              <Trophy size={28} color={Theme.colors.primary} />
            </View>
            <Text style={styles.headerSubtitle}>SESSÃO CONCLUÍDA</Text>
            <Text style={styles.headerTitle}>{session.name}</Text>
            <Text style={styles.dateText}>
              {new Date(session.startTime).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Grid de Métricas Principais */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Clock size={16} color={Theme.colors.textSecondary} />
                </View>
                <Text style={styles.statValue}>{formatDuration(session.durationSeconds || 0)}</Text>
                <Text style={styles.statLabel}>Duração Exata</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Dumbbell size={16} color={Theme.colors.textSecondary} />
                </View>
                <Text style={styles.statValue}>
                  {Math.round(session.totalTonnageKg).toLocaleString('pt-BR')} <Text style={styles.statUnit}>kg</Text>
                </Text>
                <Text style={styles.statLabel}>Tonelagem Total</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Layers size={16} color={Theme.colors.textSecondary} />
                </View>
                <Text style={styles.statValue}>{session.totalSets}</Text>
                <Text style={styles.statLabel}>Séries Válidas</Text>
              </View>
            </View>

            {/* Grid de Biometria & Saúde (Apple Health / Google Health Connect) */}
            <View style={[styles.statsGrid, { marginTop: 8 }]}>
              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Activity size={16} color="#10B981" />
                </View>
                <Text style={styles.statValue}>
                  {session.avgHeartRate || 126} <Text style={styles.statUnit}>BPM</Text>
                </Text>
                <Text style={styles.statLabel}>BPM Médio</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Heart size={16} color="#EF4444" />
                </View>
                <Text style={styles.statValue}>
                  {session.peakHeartRate || 158} <Text style={styles.statUnit}>BPM</Text>
                </Text>
                <Text style={styles.statLabel}>Pico da Sessão</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Flame size={16} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>
                  {session.activeCalories || Math.max(45, Math.round(((session.durationSeconds || 1800) / 60 * 5.5 * 80) / 60))} <Text style={styles.statUnit}>kcal</Text>
                </Text>
                <Text style={styles.statLabel}>Gasto Ativo</Text>
              </View>
            </View>

            {/* Seção de Recordes Pessoais (PRs) */}
            <View style={styles.sectionHeader}>
              <Flame size={16} color={Theme.colors.accentFlame} />
              <Text style={styles.sectionTitle}>
                {prs.length > 0 ? `${prs.length} Novo(s) Recorde(s) Pessoal(is)` : 'Recordes Pessoais (PRs)'}
              </Text>
            </View>

            {prs.length > 0 ? (
              <View style={styles.prsContainer}>
                {prs.map(pr => (
                  <View key={pr.exerciseId} style={styles.prCard}>
                    <View style={styles.prIconWrap}>
                      <Award size={18} color={Theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                      <Text style={styles.prSub}>Novo Recorde de Carga</Text>
                    </View>
                    <View style={styles.prValues}>
                      <Text style={styles.prWeight}>{pr.maxWeightKg} kg</Text>
                      <Text style={styles.prReps}>{pr.repsAtMaxWeight} reps • 1RM ~{pr.estimated1RM}kg</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noPrsCard}>
                <Text style={styles.noPrsText}>
                  Excelente sessão de manutenção e sobrecarga progressiva. Continue consistente para registrar novos recordes.
                </Text>
              </View>
            )}

            {/* Resumo de Exercícios Executados */}
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <Dumbbell size={16} color={Theme.colors.primary} />
              <Text style={styles.sectionTitle}>Exercícios Realizados ({session.exercises.length})</Text>
            </View>

            <View style={styles.exercisesList}>
              {session.exercises.map((ex, idx) => {
                const completedSets = ex.sets.filter(s => s.completed);
                const maxSetWeight = Math.max(0, ...completedSets.map(s => s.weightKg));
                return (
                  <View key={ex.id || idx} style={styles.exerciseItem}>
                    <View style={styles.exerciseIndex}>
                      <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                      <Text style={styles.exerciseDetails}>
                        {completedSets.length} séries • Carga máxima: {maxSetWeight} kg
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

          </ScrollView>

          {/* Ações Inferiores */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.shareBtn} 
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share2 size={16} color={Theme.colors.text} />
              <Text style={styles.shareBtnText}>Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.doneBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Check size={16} color={Theme.colors.background} />
              <Text style={styles.doneBtnText}>Concluir Treino</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    maxHeight: '92%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingTop: 24,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  trophyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.accentTitanium,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  scrollArea: {
    maxHeight: 450,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  statLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  prsContainer: {
    gap: 8,
    marginBottom: 10,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    gap: 12,
  },
  prIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prExerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  prSub: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  prValues: {
    alignItems: 'flex-end',
  },
  prWeight: {
    fontSize: 15,
    fontWeight: '900',
    color: Theme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  prReps: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  noPrsCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  noPrsText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 17,
  },
  exercisesList: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  exerciseDetails: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 14,
    gap: 6,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.background,
  },
});
