import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { Calendar, Clock, Dumbbell, Weight, Trophy } from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import Theme from '../../src/theme/theme';

export default function HistoryScreen() {
  const { workoutHistory, loadFromDatabase } = useWorkoutStore();

  useEffect(() => {
    loadFromDatabase();
  }, []);

  const totalVolumeAllTime = workoutHistory.reduce((acc, curr) => acc + curr.totalTonnageKg, 0);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Treinos</Text>
          <Text style={styles.subtitle}>Registro de volume e evolução nas sessões</Text>
        </View>

        {/* Total stats card */}
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
            <Text style={styles.overviewLabel}>Volume Total</Text>
          </View>
        </View>

        {/* History List */}
        <FlatList
          data={workoutHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workoutName}>{item.name}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={Theme.colors.textMuted} />
                    <Text style={styles.dateText}>{formatDate(item.startTime)}</Text>
                  </View>
                </View>

                <View style={styles.durationBadge}>
                  <Clock size={12} color={Theme.colors.primary} />
                  <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
                </View>
              </View>

              {/* Metrics pills */}
              <View style={styles.pillsRow}>
                <View style={styles.pill}>
                  <Weight size={13} color={Theme.colors.textSecondary} />
                  <Text style={styles.pillText}>
                    <Text style={{ fontWeight: '800', color: Theme.colors.text }}>
                      {item.totalTonnageKg.toLocaleString('pt-BR')}
                    </Text> kg volume
                  </Text>
                </View>

                <View style={styles.pill}>
                  <Dumbbell size={13} color={Theme.colors.textSecondary} />
                  <Text style={styles.pillText}>
                    <Text style={{ fontWeight: '800', color: Theme.colors.text }}>
                      {item.totalSets}
                    </Text> séries
                  </Text>
                </View>
              </View>

              {/* Exercise summary list */}
              <View style={styles.exercisesSummary}>
                {item.exercises.map((we) => {
                  const completedSets = we.sets.filter((s) => s.completed);
                  const maxWeight = Math.max(0, ...completedSets.map((s) => s.weightKg));

                  return (
                    <View key={we.id} style={styles.exerciseSummaryRow}>
                      <Text style={styles.summaryExerciseName} numberOfLines={1}>
                        {completedSets.length}x {we.exerciseName}
                      </Text>
                      {maxWeight > 0 && (
                        <Text style={styles.summaryBestSet}>Melhor: {maxWeight}kg</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Trophy size={48} color={Theme.colors.borderLight} />
              <Text style={styles.emptyTitle}>Nenhum treino registrado ainda</Text>
              <Text style={styles.emptySubtitle}>
                Inicie seu primeiro treino na aba "Treino" para começar a construir seu histórico de força.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
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
  },
  overviewLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 30,
  },
  historyCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
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
    gap: 4,
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
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.sm,
    gap: 6,
  },
  pillText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  exercisesSummary: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    gap: 6,
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
    color: Theme.colors.primary,
    fontWeight: '700',
    marginLeft: 8,
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
});
