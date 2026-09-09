import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  SafeAreaView 
} from 'react-native';
import { Trophy, Calculator, Dumbbell, Flame, Zap } from 'lucide-react-native';
import { useWorkoutStore, calculateEstimated1RM } from '../../src/store/workoutStore';
import Theme from '../../src/theme/theme';

export default function ProfileStatsScreen() {
  const { workoutHistory, personalRecords, loadFromDatabase } = useWorkoutStore();

  useEffect(() => {
    loadFromDatabase();
  }, []);

  // Estado para calculadora interativa de 1RM
  const [calcWeight, setCalcWeight] = useState('100');
  const [calcReps, setCalcReps] = useState('5');

  const weightNum = parseFloat(calcWeight) || 0;
  const repsNum = parseInt(calcReps, 10) || 0;
  const estimated1RM = calculateEstimated1RM(weightNum, repsNum);

  // Tabela de porcentagens de periodização
  const percentages = [
    { pct: 100, label: '1 rep (Força Máxima)' },
    { pct: 95, label: '2 reps' },
    { pct: 90, label: '3-4 reps' },
    { pct: 85, label: '5-6 reps (Força)' },
    { pct: 80, label: '7-8 reps (Hipertrofia/Força)' },
    { pct: 75, label: '9-10 reps (Hipertrofia)' },
    { pct: 70, label: '11-12 reps (Hipertrofia/Resistência)' },
  ];

  const totalPRs = Object.values(personalRecords);
  const totalVolume = workoutHistory.reduce((acc, curr) => acc + curr.totalTonnageKg, 0);
  const totalSets = workoutHistory.reduce((acc, curr) => acc + curr.totalSets, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Estatísticas & Força</Text>
          <Text style={styles.subtitle}>Cálculo de 1RM, periodização e seus recordes</Text>
        </View>

        {/* Atleta Banner Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNum}>{workoutHistory.length}</Text>
            <Text style={styles.overviewLabel}>Treinos</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewNum}>{totalSets}</Text>
            <Text style={styles.overviewLabel}>Séries Feitas</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewNum, { color: Theme.colors.primary }]}>
              {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '0t'}
            </Text>
            <Text style={styles.overviewLabel}>Carga Total</Text>
          </View>
        </View>

        {/* 1RM Calculator */}
        <View style={styles.sectionHeader}>
          <Calculator size={18} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>Calculadora de 1RM (Epley / Brzycki)</Text>
        </View>

        <View style={styles.calcCard}>
          <View style={styles.inputsRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Carga Utilizada (kg)</Text>
              <TextInput
                style={styles.calcInput}
                keyboardType="numeric"
                value={calcWeight}
                onChangeText={setCalcWeight}
                placeholder="Ex: 100"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Repetições Feitas</Text>
              <TextInput
                style={styles.calcInput}
                keyboardType="numeric"
                value={calcReps}
                onChangeText={setCalcReps}
                placeholder="Ex: 5"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </View>
          </View>

          {/* Resultado 1RM */}
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>1RM Estimado</Text>
            <Text style={styles.resultValue}>{estimated1RM} <Text style={{ fontSize: 16 }}>kg</Text></Text>
          </View>

          {/* Tabela de Porcentagens */}
          <View style={styles.pctTable}>
            <Text style={styles.pctTableTitle}>Tabela de Cargas para Periodização</Text>
            {percentages.map((p) => {
              const weightAtPct = Math.round((estimated1RM * (p.pct / 100)) * 2) / 2;
              return (
                <View key={p.pct} style={styles.pctRow}>
                  <Text style={styles.pctPercent}>{p.pct}%</Text>
                  <Text style={styles.pctDesc}>{p.label}</Text>
                  <Text style={styles.pctWeight}>{weightAtPct} kg</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recordes Pessoais (PRs) */}
        <View style={styles.sectionHeader}>
          <Trophy size={18} color={Theme.colors.accentFlame} />
          <Text style={styles.sectionTitle}>Hall de Recordes Pessoais (PRs)</Text>
        </View>

        {totalPRs.length > 0 ? (
          totalPRs.map((pr) => (
            <View key={pr.exerciseId} style={styles.prCard}>
              <View style={styles.prIcon}>
                <Flame size={20} color={Theme.colors.accentFlame} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                <Text style={styles.prSub}>
                  Recorde batido em {new Date(pr.achievedAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={styles.prValues}>
                <Text style={styles.prWeight}>{pr.maxWeightKg} kg</Text>
                <Text style={styles.pr1RM}>1RM: {pr.estimated1RM}kg</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyPrCard}>
            <Dumbbell size={32} color={Theme.colors.borderLight} />
            <Text style={styles.emptyPrText}>
              Nenhum recorde registrado ainda. À medida que você registrar séries na aba de treinos, seus recordes de carga aparecerão aqui!
            </Text>
          </View>
        )}
      </ScrollView>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    marginBottom: 20,
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
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewNum: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.text,
  },
  overviewLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  calcCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 28,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  calcInput: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.text,
    marginTop: 2,
  },
  pctTable: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
  },
  pctTableTitle: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pctPercent: {
    width: 45,
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.accentTitanium,
  },
  pctDesc: {
    flex: 1,
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  pctWeight: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
    gap: 12,
  },
  prIcon: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.accentFlameMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prExerciseName: {
    fontSize: 15,
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
    fontSize: 16,
    fontWeight: '900',
    color: Theme.colors.text,
  },
  pr1RM: {
    fontSize: 10,
    color: Theme.colors.accentFlame,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyPrCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    gap: 10,
  },
  emptyPrText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
