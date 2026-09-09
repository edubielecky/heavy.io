import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  Dumbbell, 
  Flame, 
  TrendingUp, 
  Target, 
  ArrowRight, 
  Check, 
  ChevronRight 
} from 'lucide-react-native';
import Theme from '../src/theme/theme';
import { useUserStore } from '../src/store/userStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, setProfile } = useUserStore();

  // Estados iniciais do fluxo de novo usuário
  const [selectedGoal, setSelectedGoal] = useState<'forca_pura' | 'hipertrofia' | 'recomposicao'>('forca_pura');
  const [experienceLevel, setExperienceLevel] = useState<'iniciante' | 'intermediario' | 'avancado'>('intermediario');
  const [frequencyDays, setFrequencyDays] = useState(4);

  const goals = [
    {
      id: 'forca_pura' as const,
      title: 'Força Máxima (Powerlifting / 1RM)',
      desc: 'Progressão agressiva nos levantamentos básicos (Supino, Agachamento e Terra).',
      icon: Dumbbell,
    },
    {
      id: 'hipertrofia' as const,
      title: 'Hipertrofia & Densidade Muscular',
      desc: 'Acúmulo de volume técnico semanal e fadiga controlada com RIR/RPE.',
      icon: Flame,
    },
    {
      id: 'recomposicao' as const,
      title: 'Recomposição Corporal',
      desc: 'Ganho de massa magra e aumento consistente de eficiência metabólica.',
      icon: TrendingUp,
    },
  ];

  const levels = [
    { id: 'iniciante' as const, label: 'Iniciante', sub: 'Menos de 1 ano de treino consistente' },
    { id: 'intermediario' as const, label: 'Intermediário', sub: '1 a 3 anos aplicando sobrecarga' },
    { id: 'avancado' as const, label: 'Avançado', sub: 'Mais de 3 anos de periodização séria' },
  ];

  const handleFinishOnboarding = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    completeOnboarding({
      primaryGoal: selectedGoal,
      experienceLevel,
      preferredDaysPerWeek: frequencyDays,
    });
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header do Fluxo de Novo Atleta */}
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Target size={12} color={Theme.colors.primary} />
            <Text style={styles.stepBadgeText}>CONFIGURAÇÃO INICIAL • NOVO ATLETA</Text>
          </View>
          <Text style={styles.title}>Defina sua Diretriz de Força</Text>
          <Text style={styles.subtitle}>
            O heavy.io calibra suas sugestões de carga e metas de volume de acordo com seus objetivos.
          </Text>
        </View>

        {/* 1. Seleção de Objetivo */}
        <Text style={styles.sectionLabel}>OBJETIVO PRINCIPAL</Text>
        <View style={styles.goalsContainer}>
          {goals.map(g => {
            const isSelected = selectedGoal === g.id;
            const Icon = g.icon;
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                onPress={() => {
                  setSelectedGoal(g.id);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.goalIconBox, isSelected && styles.goalIconBoxSelected]}>
                  <Icon size={18} color={isSelected ? Theme.colors.textInverse : Theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalTitle, isSelected && styles.goalTitleSelected]}>
                    {g.title}
                  </Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Check size={14} color={Theme.colors.textInverse} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Nível de Experiência */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>EXPERIÊNCIA COM PESOS LIVRES</Text>
        <View style={styles.levelsRow}>
          {levels.map(l => {
            const isSelected = experienceLevel === l.id;
            return (
              <TouchableOpacity
                key={l.id}
                style={[styles.levelCard, isSelected && styles.levelCardSelected]}
                onPress={() => {
                  setExperienceLevel(l.id);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.levelLabel, isSelected && styles.levelLabelSelected]}>
                  {l.label}
                </Text>
                <Text style={styles.levelSub}>{l.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Frequência Semanal */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>FREQUÊNCIA SEMANAL ALVO</Text>
        <View style={styles.daysRow}>
          {[3, 4, 5, 6].map(days => {
            const isSelected = frequencyDays === days;
            return (
              <TouchableOpacity
                key={days}
                style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                onPress={() => {
                  setFrequencyDays(days);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {days}x
                </Text>
                <Text style={[styles.daySub, isSelected && styles.daySubSelected]}>
                  dias/sem
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botão de Finalização do Onboarding */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleFinishOnboarding}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>Entrar no Sistema & Começar Treino</Text>
          <ArrowRight size={18} color={Theme.colors.textInverse} />
        </TouchableOpacity>

        {/* Rodapé informativo */}
        <Text style={styles.footerNote}>
          Você poderá alterar suas diretrizes a qualquer momento na aba de estatísticas.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    padding: 22,
    paddingTop: 30,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 26,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  stepBadgeText: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 19,
    marginTop: 6,
  },
  sectionLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  goalsContainer: {
    gap: 10,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 14,
  },
  goalCardSelected: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.primary,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  goalIconBox: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconBoxSelected: {
    backgroundColor: Theme.colors.primary,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  goalTitleSelected: {
    color: Theme.colors.text,
  },
  goalDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelsRow: {
    gap: 8,
  },
  levelCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  levelCardSelected: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  levelLabelSelected: {
    color: Theme.colors.primary,
  },
  levelSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dayButtonSelected: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  dayText: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  dayTextSelected: {
    color: Theme.colors.textInverse,
  },
  daySub: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  daySubSelected: {
    color: Theme.colors.textInverse,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 50,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
    marginTop: 32,
  },
  submitButtonText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerNote: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
  },
});
