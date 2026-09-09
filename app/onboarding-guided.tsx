import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  Dumbbell,
  RefreshCw,
  Zap,
  Target,
  Activity,
  Award,
} from 'lucide-react-native';
import Theme from '../src/theme/theme';
import { saveRoutine } from '../src/database/database';
import { useUserStore } from '../src/store/userStore';
import { Exercise } from '../src/types/workout';
import {
  WeeklyFrequency,
  SessionDuration,
  PrimaryGoal,
  ExperienceLevel,
  EquipmentEnvironment,
  PhysicalRestriction,
  GuidedInputs,
  GeneratedPlan,
  PlannedExercise,
  PlannedSession,
  generateGuidedRoutine,
} from '../src/services/recommendationEngine';
import { SwapExerciseModal } from '../src/components/SwapExerciseModal';

export default function OnboardingGuidedScreen() {
  const router = useRouter();
  const { completeOnboarding } = useUserStore();

  // Estado do wizard (Etapas B1 a B7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Variáveis Coletadas (B1 a B6)
  const [frequency, setFrequency] = useState<WeeklyFrequency>(4);
  const [duration, setDuration] = useState<SessionDuration>('45-60');
  const [goal, setGoal] = useState<PrimaryGoal>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [equipment, setEquipment] = useState<EquipmentEnvironment>('commercial');
  const [restrictions, setRestrictions] = useState<PhysicalRestriction[]>(['none']);

  // Plano Gerado (B7)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(0);

  // Modal de Troca de Exercício
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [exerciseToSwap, setExerciseToSwap] = useState<{
    sessionIndex: number;
    exerciseIndex: number;
    exercise: PlannedExercise;
  } | null>(null);

  // Navegação entre passos
  const handleNextStep = () => {
    Haptics.selectionAsync().catch(() => {});
    if (currentStep === 6) {
      // Ao sair do B6 para o B7, executa o motor algorítmico local
      const inputs: GuidedInputs = {
        frequency,
        sessionDuration: duration,
        goal,
        experienceLevel: experience,
        equipment,
        restrictions,
      };
      const plan = generateGuidedRoutine(inputs);
      setGeneratedPlan(plan);
      setActiveSessionIndex(0);
      setCurrentStep(7);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    Haptics.selectionAsync().catch(() => {});
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  // Gerenciamento de restrições (multi-select inteligente)
  const toggleRestriction = (res: PhysicalRestriction) => {
    Haptics.selectionAsync().catch(() => {});
    if (res === 'none') {
      setRestrictions(['none']);
      return;
    }

    let updated: PhysicalRestriction[] = restrictions.filter((r): r is PhysicalRestriction => r !== 'none');
    if (updated.includes(res)) {
      updated = updated.filter(r => r !== res);
      if (updated.length === 0) updated = ['none'];
    } else {
      updated.push(res);
    }
    setRestrictions(updated);
  };

  // Abertura do modal de troca de exercício
  const openSwapModal = (sessionIndex: number, exerciseIndex: number, exercise: PlannedExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExerciseToSwap({ sessionIndex, exerciseIndex, exercise });
    setSwapModalVisible(true);
  };

  // Aplicação da troca de exercício no plano
  const handleApplySwap = (substitute: Exercise) => {
    if (!exerciseToSwap || !generatedPlan) return;

    const updatedSessions = [...generatedPlan.sessions];
    const targetSession = { ...updatedSessions[exerciseToSwap.sessionIndex] };
    const updatedExercises = [...targetSession.exercises];

    const prevEx = updatedExercises[exerciseToSwap.exerciseIndex];
    updatedExercises[exerciseToSwap.exerciseIndex] = {
      ...prevEx,
      exerciseId: substitute.id,
      exerciseName: substitute.name,
      targetMuscle: substitute.targetMuscle,
      movementPattern: substitute.movementPattern,
    };

    targetSession.exercises = updatedExercises;
    updatedSessions[exerciseToSwap.sessionIndex] = targetSession;

    setGeneratedPlan({
      ...generatedPlan,
      sessions: updatedSessions,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  // Persistência no SQLite e conclusão do onboarding
  const handleConfirmPlan = () => {
    if (!generatedPlan) return;

    try {
      // 1. Grava cada sessão como uma rotina no SQLite local
      generatedPlan.sessions.forEach((sess, sIdx) => {
        saveRoutine({
          id: `guided_routine_${Date.now()}_${sIdx}`,
          name: sess.name,
          description: `${sess.focus} • ${sess.dayOfWeek}`,
          isSystem: false,
          exercises: sess.exercises.map((ex, exIdx) => ({
            id: `re_guided_${Date.now()}_${sIdx}_${exIdx}`,
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            targetMuscle: ex.targetMuscle,
            orderIndex: exIdx,
            targetSets: ex.targetSets,
            targetRepsMin: ex.targetRepsMin,
            targetRepsMax: ex.targetRepsMax,
            restSeconds: ex.restSeconds,
          })),
        });
      });

      // 2. Atualiza a store global
      completeOnboarding({
        onboardingTrack: 'guided',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        'Plano Ativado!',
        'Sua periodização personalizada foi calculada e gravada com sucesso no SQLite do heavy.io.',
        [{ text: 'Acessar Treino', onPress: () => router.replace('/(tabs)' as any) }]
      );
    } catch (err) {
      console.error('Erro ao persistir rotinas guiadas:', err);
      Alert.alert('Erro', 'Houve uma falha ao salvar as rotinas no banco local.');
    }
  };

  const stepLabels: Record<number, string> = {
    1: 'Passo B1: Frequência Semanal',
    2: 'Passo B2: Tempo por Sessão',
    3: 'Passo B3: Objetivo Principal',
    4: 'Passo B4: Nível de Experiência',
    5: 'Passo B5: Local e Equipamento',
    6: 'Passo B6: Restrições Articulares',
    7: 'Passo B7: Plano Recomendado',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header & Progress */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handlePrevStep} activeOpacity={0.8}>
          <ArrowLeft size={20} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.progressPills}>
          {[1, 2, 3, 4, 5, 6, 7].map(step => (
            <View
              key={step}
              style={[
                styles.pill,
                step <= currentStep && styles.pillActive,
                step === currentStep && styles.pillCurrent,
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepNumber}>{currentStep}/7</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.badgeHeader}>
          <Sparkles size={13} color={Theme.colors.primary} />
          <Text style={styles.badgeHeaderText}>MOTOR BIOMECÂNICO HEAVY.IO</Text>
        </View>

        <Text style={styles.stepTitle}>{stepLabels[currentStep]}</Text>

        {/* ========================================================= */}
        {/* PASSO B1: FREQUÊNCIA SEMANAL                              */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepDescription}>
              Quantos dias por semana você tem disponibilidade real para treinar?
            </Text>

            <View style={styles.optionsList}>
              {[
                { days: 2 as WeeklyFrequency, title: '2 Dias por Semana', sub: 'Full Body 2x (Agachamento & Terra equilibrados)', tag: 'MÍNIMO EFICIENTE' },
                { days: 3 as WeeklyFrequency, title: '3 Dias por Semana', sub: 'Full Body 3x (Frequência ideal com alta recuperação)', tag: 'COMPROVADO' },
                { days: 4 as WeeklyFrequency, title: '4 Dias por Semana', sub: 'Upper / Lower (2x superiores e 2x inferiores)', tag: 'MAIS EQUILIBRADO' },
                { days: 5 as WeeklyFrequency, title: '5 Dias por Semana', sub: 'Estrutura Híbrida Upper/Lower + PPL', tag: 'ALTO VOLUME' },
                { days: 6 as WeeklyFrequency, title: '6 Dias por Semana', sub: 'Push / Pull / Legs (2x) divisão clássica de atletas', tag: 'AVANÇADO' },
              ].map(opt => {
                const isSelected = frequency === opt.days;
                return (
                  <TouchableOpacity
                    key={opt.days}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setFrequency(opt.days)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.tagRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO B2: TEMPO POR SESSÃO                                */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepDescription}>
              Quanto tempo você planeja dedicar a cada sessão de treino?
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: '30-45' as SessionDuration, title: '30 a 45 minutos', sub: '4 exercícios diretos, descansos compactos e alta densidade.', tag: 'RÁPIDO & DENSO' },
                { id: '45-60' as SessionDuration, title: '45 a 60 minutos', sub: '5 exercícios, equilíbrio ótimo de compostos pesados e isoladores.', tag: 'PADRÃO OURO' },
                { id: '60-90' as SessionDuration, title: '60 a 90 minutos', sub: '6 exercícios, descansos amplos para máxima expressão de força.', tag: 'FORÇA MÁXIMA' },
              ].map(opt => {
                const isSelected = duration === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setDuration(opt.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.tagRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO B3: OBJETIVO PRINCIPAL                             */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepDescription}>
              Qual o foco central que guiará a seleção de faixas de repetição e descanso?
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'hypertrophy' as PrimaryGoal, title: 'Hipertrofia Estética', sub: 'Ênfase em estresse metabólico, volume direto e faixas de 8-12 repetições.', tag: 'CRESCIMENTO' },
                { id: 'strength' as PrimaryGoal, title: 'Ganho de Força Base', sub: 'Foco em progressão de carga mecânica em compostos pesados (5-8 reps, mais descanso).', tag: 'SOBRECARGA' },
                { id: 'conditioning' as PrimaryGoal, title: 'Condicionamento Atlético', sub: 'Estímulo funcional e densidade muscular com menor tempo de repouso.', tag: 'PERFORMANCE' },
              ].map(opt => {
                const isSelected = goal === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setGoal(opt.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.tagRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO B4: NÍVEL DE EXPERIÊNCIA                            */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepDescription}>
              O algoritmo calibra o volume semanal de séries de acordo com seu histórico.
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'beginner' as ExperienceLevel, title: 'Iniciante (< 6 meses)', sub: 'Volume de 10-12 séries semanais. Prioridade na aprendizagem de padrões motores.', tag: '10-12 SÉRIES/GRUPO' },
                { id: 'intermediate' as ExperienceLevel, title: 'Intermediário (6m a 2 anos)', sub: 'Volume de 14-18 séries semanais. Maior variedade de estímulos pesados e acessórios.', tag: '14-18 SÉRIES/GRUPO' },
                { id: 'returning' as ExperienceLevel, title: 'Retomando após pausa', sub: 'Rampa gradual de volume para evitar fadiga aguda precoce e dores tardias.', tag: 'REACLIMATAÇÃO' },
              ].map(opt => {
                const isSelected = experience === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setExperience(opt.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.tagRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO B5: LOCAL / EQUIPAMENTO                             */}
        {/* ========================================================= */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.stepDescription}>
              Quais equipamentos estarão realmente disponíveis para os seus treinos?
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'commercial' as EquipmentEnvironment, title: 'Academia Comercial Completa', sub: 'Acesso pleno a barras olímpicas, máquinas articuladas, cabos e racks de halteres.', tag: 'ACERVO TOTAL' },
                { id: 'condo' as EquipmentEnvironment, title: 'Academia de Condomínio / Básica', sub: 'Halteres, banco ajustável, polia funcional e barra. Sem máquinas de alavanca complexas.', tag: 'ESSENCIAIS' },
                { id: 'home_dumbbells' as EquipmentEnvironment, title: 'Halteres + Peso do Corpo', sub: 'Treino exclusivo com pesos livres manuais e calistenia de sobrecarga.', tag: 'MINIMALISTA' },
              ].map(opt => {
                const isSelected = equipment === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setEquipment(opt.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.tagRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO B6: RESTRIÇÕES / DESCONFORTOS                       */}
        {/* ========================================================= */}
        {currentStep === 6 && (
          <View>
            <Text style={styles.stepDescription}>
              Selecione se possui desconfortos articulares. O algoritmo substituirá automaticamente exercícios lesivos por alternativas seguras.
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'none' as PhysicalRestriction, title: 'Sem Restrições', sub: 'Todas as alavancas e compostos pesados liberados sem restrição.', tag: '100% LIBERADO' },
                { id: 'lower_back' as PhysicalRestriction, title: 'Lombar', sub: 'Exclui terra tradicional e agachamento livre com barra; prioriza Leg Press 45° e búlgaro.', tag: 'SEGURANÇA AXIAL' },
                { id: 'shoulders' as PhysicalRestriction, title: 'Ombros', sub: 'Substitui desenvolvimentos pesados com barra por pegada neutra com halteres e elevações.', tag: 'PROTEÇÃO MANGUITO' },
                { id: 'knees' as PhysicalRestriction, title: 'Joelhos', sub: 'Prioriza amplitudes controladas, leg press com pés altos e fortalecimento de posteriores.', tag: 'PROTEÇÃO PATELAR' },
              ].map(opt => {
                const isSelected = restrictions.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => toggleRestriction(opt.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.tagRow}>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.checkSquare, isSelected && styles.checkSquareActive]}>
                      {isSelected && <Check size={14} color={Theme.colors.textInverse} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO B7: APRESENTAÇÃO E APROVAÇÃO DO PLANO               */}
        {/* ========================================================= */}
        {currentStep === 7 && generatedPlan && (
          <View>
            {/* Header do Plano Gerado */}
            <View style={styles.planHeaderCard}>
              <View style={styles.planHeaderTop}>
                <View style={styles.splitBadge}>
                  <Text style={styles.splitBadgeText}>{generatedPlan.splitType.toUpperCase()}</Text>
                </View>
                <Text style={styles.volumeText}>
                  ~{generatedPlan.weeklyDirectSetsPerMuscle} séries/semana
                </Text>
              </View>
              <Text style={styles.planTitle}>{generatedPlan.planName}</Text>
              <Text style={styles.planDesc}>{generatedPlan.description}</Text>
            </View>

            {/* Abas das Sessões */}
            <Text style={styles.sessionsHeading}>Sessões da Periodização:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionTabsRow}>
              {generatedPlan.sessions.map((sess, idx) => {
                const isActive = activeSessionIndex === idx;
                return (
                  <TouchableOpacity
                    key={sess.id}
                    style={[styles.sessionTabPill, isActive && styles.sessionTabPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveSessionIndex(idx);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sessionTabPillText, isActive && styles.sessionTabPillTextActive]}>
                      {`Treino ${String.fromCharCode(65 + idx)}`}
                    </Text>
                    <Text style={styles.sessionTabPillSub}>{sess.dayOfWeek.slice(0, 3)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Card Detalhado da Sessão Ativa */}
            {generatedPlan.sessions[activeSessionIndex] && (
              <View style={styles.activeSessionContainer}>
                <View style={styles.sessionMetaHeader}>
                  <Text style={styles.sessionMetaName}>
                    {generatedPlan.sessions[activeSessionIndex].name}
                  </Text>
                  <Text style={styles.sessionMetaFocus}>
                    Foco: {generatedPlan.sessions[activeSessionIndex].focus}
                  </Text>
                </View>

                {/* Lista de Exercícios da Sessão */}
                <View style={styles.exerciseList}>
                  {generatedPlan.sessions[activeSessionIndex].exercises.map((ex, exIdx) => {
                    const tierLabelMap: Record<string, { label: string; color: string }> = {
                      primary_compound: { label: 'COMPOSTO PRINCIPAL', color: Theme.colors.primary },
                      secondary_compound: { label: 'COMPOSTO ACESSÓRIO', color: Theme.colors.textSecondary },
                      isolation: { label: 'ISOLADOR', color: '#A1A1AA' },
                      core: { label: 'CORE / ESTABILIDADE', color: Theme.colors.accentTitanium },
                    };
                    const tierInfo = tierLabelMap[ex.tier] || { label: 'EXERCÍCIO', color: Theme.colors.textSecondary };

                    return (
                      <View key={`${ex.exerciseId}_${exIdx}`} style={styles.exerciseRowCard}>
                        <View style={styles.exLeft}>
                          <View style={styles.exTierBadge}>
                            <Text style={[styles.exTierText, { color: tierInfo.color }]}>
                              {tierInfo.label}
                            </Text>
                          </View>
                          <Text style={styles.exName}>{ex.exerciseName}</Text>
                          <Text style={styles.exParams}>
                            {ex.targetSets} séries × {ex.targetRepsMin}-{ex.targetRepsMax} reps • {ex.restSeconds}s descanso
                          </Text>
                        </View>

                        {/* Botão de Trocar Exercício */}
                        <TouchableOpacity
                          style={styles.swapBtn}
                          onPress={() => openSwapModal(activeSessionIndex, exIdx, ex)}
                          activeOpacity={0.8}
                        >
                          <RefreshCw size={13} color={Theme.colors.textSecondary} />
                          <Text style={styles.swapBtnText}>Trocar</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Ação de Conclusão e Persistência */}
            <TouchableOpacity
              style={styles.finishPlanBtn}
              onPress={handleConfirmPlan}
              activeOpacity={0.85}
            >
              <Text style={styles.finishPlanBtnText}>Começar com esta rotina</Text>
              <ArrowRight size={18} color={Theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}

        {/* Botão de Avanço nos Passos 1 a 6 */}
        {currentStep < 7 && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextStep}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 6 ? 'Gerar Periodização' : 'Próximo Passo'}
            </Text>
            <ArrowRight size={18} color={Theme.colors.textInverse} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal de Troca Inteligente de Exercício */}
      <SwapExerciseModal
        visible={swapModalVisible}
        onClose={() => setSwapModalVisible(false)}
        currentExercise={exerciseToSwap?.exercise || null}
        guidedInputs={{
          frequency,
          sessionDuration: duration,
          goal,
          experienceLevel: experience,
          equipment,
          restrictions,
        }}
        onSelectSubstitute={handleApplySwap}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPills: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pill: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  pillActive: {
    backgroundColor: Theme.colors.borderLight,
  },
  pillCurrent: {
    backgroundColor: Theme.colors.primary,
    width: 28,
  },
  stepNumber: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  badgeHeader: {
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
    marginBottom: 10,
  },
  badgeHeaderText: {
    color: Theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: 22,
  },
  optionsList: {
    gap: 12,
    marginBottom: 28,
  },
  optionCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  optionContent: {
    flex: 1,
    paddingRight: 12,
  },
  tagRow: {
    marginBottom: 4,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
  },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121215',
  },
  checkSquareActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 50,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  nextButtonText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // =========================================================
  // ESTILOS DO PASSO B7 (PLANO RECOMENDADO)
  // =========================================================
  planHeaderCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 20,
  },
  planHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  splitBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  splitBadgeText: {
    color: Theme.colors.textInverse,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  volumeText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  planTitle: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  planDesc: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  sessionsHeading: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sessionTabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sessionTabPill: {
    backgroundColor: '#121215',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 8,
    alignItems: 'center',
  },
  sessionTabPillActive: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.primary,
  },
  sessionTabPillText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  sessionTabPillTextActive: {
    color: Theme.colors.text,
  },
  sessionTabPillSub: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  activeSessionContainer: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 24,
  },
  sessionMetaHeader: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 10,
  },
  sessionMetaName: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sessionMetaFocus: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseRowCard: {
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exLeft: {
    flex: 1,
    paddingRight: 8,
  },
  exTierBadge: {
    marginBottom: 4,
  },
  exTierText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exName: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  exParams: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  swapBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  finishPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 52,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  finishPlanBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
