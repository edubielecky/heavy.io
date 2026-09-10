import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SwapExerciseModal } from '../src/components/SwapExerciseModal';
import { saveRoutine } from '../src/database/database';
import {
  EquipmentEnvironment,
  ExperienceLevel,
  GeneratedPlan,
  GuidedInputs,
  PhysicalRestriction,
  PlannedExercise,
  PrimaryGoal,
  SessionDuration,
  WeeklyFrequency,
  generateGuidedRoutine,
} from '../src/services/recommendationEngine';
import { BiologicalSex, MusclePriority, useUserStore } from '../src/store/userStore';
import Theme from '../src/theme/theme';
import { Exercise } from '../src/types/workout';

export default function OnboardingGuidedScreen() {
  const router = useRouter();
  const { completeOnboarding } = useUserStore();

  // Wizard de 9 etapas científicas (Passos 1 a 9)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Passo 1: Biometria & Fisiologia
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>('male');
  const [age, setAge] = useState<string>('26');
  const [weight, setWeight] = useState<string>('78');
  const [height, setHeight] = useState<string>('176');

  // Passo 2: Foco Muscular Prioritário
  const [musclePriority, setMusclePriority] = useState<MusclePriority>('balanced');

  // Passos 3 a 8: Variáveis Operacionais de Treino
  const [frequency, setFrequency] = useState<WeeklyFrequency>(4);
  const [duration, setDuration] = useState<SessionDuration>('45-60');
  const [goal, setGoal] = useState<PrimaryGoal>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [equipment, setEquipment] = useState<EquipmentEnvironment>('commercial');
  const [restrictions, setRestrictions] = useState<PhysicalRestriction[]>(['none']);

  // Passo 9: Plano Fisiológico Gerado
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
    if (currentStep === 8) {
      // Ao sair do Passo 8 para o 9, executa o motor fisiológico algorítmico
      const parsedAge = parseInt(age, 10) || 26;
      const parsedWeight = parseFloat(weight.replace(',', '.')) || 75;
      const parsedHeight = parseFloat(height.replace(',', '.')) || 175;

      const inputs: GuidedInputs = {
        frequency,
        sessionDuration: duration,
        goal,
        experienceLevel: experience,
        equipment,
        restrictions,
        biologicalSex,
        age: parsedAge,
        weightKg: parsedWeight,
        heightCm: parsedHeight,
        musclePriority,
      };

      const plan = generateGuidedRoutine(inputs);
      setGeneratedPlan(plan);
      setActiveSessionIndex(0);
      setCurrentStep(9);
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
      const parsedAge = parseInt(age, 10) || 26;
      const parsedWeight = parseFloat(weight.replace(',', '.')) || 75;
      const parsedHeight = parseFloat(height.replace(',', '.')) || 175;

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

      // 2. Atualiza a store global com as métricas fisiológicas
      const expMap: Record<ExperienceLevel, 'iniciante' | 'intermediario' | 'avancado'> = {
        beginner: 'iniciante',
        intermediate: 'intermediario',
        advanced: 'avancado',
        returning: 'iniciante',
      };

      completeOnboarding({
        onboardingTrack: 'guided',
        experienceLevel: expMap[experience],
        biologicalSex,
        age: parsedAge,
        musclePriority,
        heightCm: parsedHeight,
        bodyWeightKg: parsedWeight,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        'Plano Fisiológico Ativado!',
        'Sua periodização personalizada foi calculada e gravada com sucesso no SQLite do heavy.io.',
        [{ text: 'Acessar Treino', onPress: () => router.replace('/(tabs)' as any) }]
      );
    } catch (err) {
      console.error('Erro ao persistir rotinas guiadas:', err);
      Alert.alert('Erro', 'Houve uma falha ao salvar as rotinas no banco local.');
    }
  };

  const stepLabels: Record<number, string> = {
    1: 'Passo 1: Biometria & Alavancas',
    2: 'Passo 2: Foco Muscular Prioritário',
    3: 'Passo 3: Frequência Semanal',
    4: 'Passo 4: Tempo por Sessão',
    5: 'Passo 5: Objetivo Fisiológico',
    6: 'Passo 6: Nível de Treino & Histórico',
    7: 'Passo 7: Local & Equipamento',
    8: 'Passo 8: Restrições & Desconfortos',
    9: 'Passo 9: Prescrição Científica do Treino',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header & Progress */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handlePrevStep} activeOpacity={0.8}>
          <ArrowLeft size={20} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.progressPills}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(step => (
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

        <Text style={styles.stepNumber}>{currentStep}/9</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{stepLabels[currentStep]}</Text>

        {/* ========================================================= */}
        {/* PASSO 1: BIOMETRIA & FISIOLOGIA                           */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepDescription}>
              Seus parâmetros antropométricos calibram alavancas de movimento, estresse axial na coluna e recuperação metabólica entre séries (Hunter, 2014).
            </Text>

            {/* Sexo Biológico */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SEXO BIOLÓGICO</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    biologicalSex === 'male' && styles.toggleBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBiologicalSex('male');
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      biologicalSex === 'male' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Masculino
                  </Text>
                  <Text style={styles.toggleSubText}>Mais descanso em compostos pesados</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    biologicalSex === 'female' && styles.toggleBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBiologicalSex('female');
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      biologicalSex === 'female' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Feminino
                  </Text>
                  <Text style={styles.toggleSubText}>Menor fadiga metabólica e foco glúteo/quad</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Idade, Peso, Altura */}
            <View style={styles.numericGrid}>
              <View style={styles.numericCol}>
                <Text style={styles.inputLabel}>IDADE</Text>
                <View style={styles.numericInputBox}>
                  <TextInput
                    style={styles.numericTextInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="26"
                    placeholderTextColor="#71717A"
                  />
                  <Text style={styles.inputUnit}>anos</Text>
                </View>
              </View>

              <View style={styles.numericCol}>
                <Text style={styles.inputLabel}>PESO</Text>
                <View style={styles.numericInputBox}>
                  <TextInput
                    style={styles.numericTextInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="78"
                    placeholderTextColor="#71717A"
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.numericCol}>
                <Text style={styles.inputLabel}>ALTURA</Text>
                <View style={styles.numericInputBox}>
                  <TextInput
                    style={styles.numericTextInput}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="176"
                    placeholderTextColor="#71717A"
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>
            </View>

            <View style={styles.scienceCallout}>
              <Activity size={16} color="#A1A1AA" />
              <Text style={styles.scienceCalloutText}>
                Atletas mais altos (&gt;182 cm) recebem exercícios com menor cisalhamento espinhal. Atletas mais pesados (&gt;90 kg) recebem puxadas articuladas para preservar articulações.
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASSO 2: FOCO MUSCULAR PRIORITÁRIO                        */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepDescription}>
              Conforme Simão et al. (2012), os primeiros exercícios da sessão recebem o maior estímulo hipertrófico. Qual grupo muscular é sua prioridade máxima?
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'balanced' as MusclePriority, title: 'Equilíbrio Fisiológico', sub: 'Distribuição uniforme sem viés. Ideal para base sólida e simetria muscular integral.', tag: 'PADRÃO HARMONIOSO' },
                { id: 'chest' as MusclePriority, title: 'Prioridade Peitoral', sub: 'Ênfase em porção clavicular (superior) e esternal com maior volume semanal direto (MAV máximo).', tag: '+VOLUME PEITO' },
                { id: 'back' as MusclePriority, title: 'Prioridade Costas & Dorsais', sub: 'Foco em largura de latíssimo e espessura de romboides com variações sob tensão prolongada.', tag: '+LARGURA & DENSIDADE' },
                { id: 'legs_glutes' as MusclePriority, title: 'Prioridade Pernas & Glúteos', sub: 'Acento em agachamentos profundos, búlgaros e isoladores na posição de maior alongamento.', tag: '+HIPERTROFIA INFERIOR' },
                { id: 'shoulders' as MusclePriority, title: 'Prioridade Ombros & Deltoides', sub: 'Foco em elevações laterais na polia e deltoide posterior para a silhueta estética em V.', tag: '+LARGURA CLAVICULAR' },
                { id: 'arms' as MusclePriority, title: 'Prioridade Braços (Bíceps/Tríceps)', sub: 'Volume direto aumentado com ênfase na cabeça longa do tríceps e bíceps no plano escapular.', tag: '+HIPERTROFIA BRAQUIAL' },
              ].map(opt => {
                const isSelected = musclePriority === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setMusclePriority(opt.id)}
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
        {/* PASSO 3: FREQUÊNCIA SEMANAL                               */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepDescription}>
              Quantos dias por semana você tem disponibilidade real para treinar com consistência?
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
        {/* PASSO 4: TEMPO POR SESSÃO                                 */}
        {/* ========================================================= */}
        {currentStep === 4 && (
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
        {/* PASSO 5: OBJETIVO FISIOLÓGICO                             */}
        {/* ========================================================= */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.stepDescription}>
              Qual o foco central que guiará as faixas de repetição e o estresse mecânico ou metabólico?
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'hypertrophy' as PrimaryGoal, title: 'Hipertrofia Estética', sub: 'Tensão mecânica contínua, volume direto na faixa MAV e séries de 8-12 repetições com RIR 1-2.', tag: 'CRESCIMENTO MUSCULAR' },
                { id: 'strength' as PrimaryGoal, title: 'Ganho de Força Base', sub: 'Progressão mecânica estrita nos grandes levantamentos (5-8 reps, mais repouso interséries).', tag: 'SOBRECARGA AXIAL' },
                { id: 'conditioning' as PrimaryGoal, title: 'Condicionamento Atlético', sub: 'Estímulo funcional e densidade de trabalho com tempos controlados de repouso.', tag: 'PERFORMANCE' },
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
        {/* PASSO 6: NÍVEL DE TREINO & HISTÓRICO                      */}
        {/* ========================================================= */}
        {currentStep === 6 && (
          <View>
            <Text style={styles.stepDescription}>
              O algoritmo calibra o volume semanal de séries de acordo com seus marcos de volume (Israetel, RP).
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'beginner' as ExperienceLevel, title: 'Iniciante (< 6 meses)', sub: 'Volume conservador (MEV). Prioridade na aprendizagem motora e adaptações neurais sem fadiga sistêmica.', tag: '10-12 SÉRIES/GRUPO' },
                { id: 'intermediate' as ExperienceLevel, title: 'Intermediário (6m a 2 anos)', sub: 'Volume ótimo adaptativo (MAV). Maior variedade de estímulos pesados e posições de alongamento.', tag: '14-18 SÉRIES/GRUPO' },
                { id: 'returning' as ExperienceLevel, title: 'Retomando após pausa', sub: 'Rampa gradual de volume para proteger tecidos conjuntivos e evitar dor tardia excessiva.', tag: 'REACLIMATAÇÃO' },
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
        {/* PASSO 7: LOCAL & EQUIPAMENTO                              */}
        {/* ========================================================= */}
        {currentStep === 7 && (
          <View>
            <Text style={styles.stepDescription}>
              Quais equipamentos estarão realmente disponíveis para as sessões de treino?
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'commercial' as EquipmentEnvironment, title: 'Academia Comercial Completa', sub: 'Acesso total a barras olímpicas, máquinas articuladas, cabos e racks de agachamento.', tag: 'ACERVO COMPLETO' },
                { id: 'condo' as EquipmentEnvironment, title: 'Academia de Condomínio / Básica', sub: 'Halteres, banco ajustável, polia funcional e barra. Sem máquinas de alavanca complexas.', tag: 'ESSENCIAIS' },
                { id: 'home_dumbbells' as EquipmentEnvironment, title: 'Halteres + Peso do Corpo', sub: 'Treino exclusivo com pesos livres manuais e calistenia com sobrecarga.', tag: 'MINIMALISTA' },
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
        {/* PASSO 8: RESTRIÇÕES & DESCONFORTOS                        */}
        {/* ========================================================= */}
        {currentStep === 8 && (
          <View>
            <Text style={styles.stepDescription}>
              Selecione desconfortos articulares prévios. O algoritmo substituirá automaticamente exercícios axiais ou de alto risco por opções biomecanicamente favoráveis.
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
        {/* PASSO 9: PRESCRIÇÃO CIENTÍFICA DO TREINO                  */}
        {/* ========================================================= */}
        {currentStep === 9 && generatedPlan && (
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

              {/* Framework Científico Integrado */}
              {generatedPlan.scientificSummary && (
                <View style={styles.scienceFrameworkBox}>
                  <View style={styles.scienceBadgeRow}>
                    <Sparkles size={13} color="#FFFFFF" />
                    <Text style={styles.scienceFrameworkBadge}>
                      {generatedPlan.scientificSummary.primaryStimulus}
                    </Text>
                  </View>
                  <Text style={styles.scienceFrameworkText}>
                    {generatedPlan.scientificSummary.weeklyVolumeProfile}
                  </Text>
                  <Text style={styles.scienceFrameworkAdaptation}>
                    {generatedPlan.scientificSummary.anthropometricAdaptation}
                  </Text>
                  <Text style={styles.scienceFrameworkSfr}>
                    {generatedPlan.scientificSummary.recoveryRecommendation}
                  </Text>
                </View>
              )}
            </View>

            {/* Volume Landmarks Fisiológicos */}
            {generatedPlan.volumeBreakdown && generatedPlan.volumeBreakdown.length > 0 && (
              <View style={styles.volumeLandmarksCard}>
                <View style={styles.landmarksHeader}>
                  <Layers size={14} color="#A1A1AA" />
                  <Text style={styles.landmarksTitle}>DISTRIBUIÇÃO DE VOLUME SEMANAL (MEV / MAV)</Text>
                </View>
                <View style={styles.landmarksGrid}>
                  {generatedPlan.volumeBreakdown.slice(0, 6).map((vb, vbIdx) => (
                    <View key={`${vb.muscle}_${vbIdx}`} style={styles.landmarkItem}>
                      <View style={styles.landmarkLabelRow}>
                        <Text style={styles.landmarkMuscleName}>{vb.muscleLabel}</Text>
                        {vb.landmark === 'PRIORITÁRIO' ? (
                          <View style={styles.priorityMiniBadge}>
                            <Text style={styles.priorityMiniBadgeText}>PRIORITÁRIO</Text>
                          </View>
                        ) : (
                          <View style={styles.mevMavBadge}>
                            <Text style={styles.mevMavBadgeText}>{vb.landmark}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.landmarkSets}>
                        {vb.weeklySets} <Text style={styles.landmarkSetsUnit}>séries/sem</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

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
                    return (
                      <View key={`${ex.exerciseId}_${exIdx}`} style={styles.exerciseRowCard}>
                        <View style={styles.exLeft}>
                          {/* Papel Fisiológico */}
                          <View style={styles.exRoleBadge}>
                            <Zap size={10} color="#FFFFFF" />
                            <Text style={styles.exRoleText}>{ex.physiologicalRole}</Text>
                          </View>

                          <Text style={styles.exName}>{ex.exerciseName}</Text>
                          <Text style={styles.exParams}>
                            {ex.targetSets} séries × {ex.targetRepsMin}-{ex.targetRepsMax} reps • {ex.restSeconds}s repouso • RIR {ex.targetRir}
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
              <Text style={styles.finishPlanBtnText}>Ativar Periodização no App</Text>
              <ArrowRight size={18} color={Theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}

        {/* Botão de Avanço nos Passos 1 a 8 */}
        {currentStep < 9 && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextStep}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 8 ? 'Calcular Periodização Fisiológica' : 'Próximo Passo'}
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
          biologicalSex,
          age: parseInt(age, 10) || 26,
          weightKg: parseFloat(weight.replace(',', '.')) || 75,
          heightCm: parseFloat(height.replace(',', '.')) || 175,
          musclePriority,
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
    borderBottomColor: '#27272A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPills: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  pill: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#18181B',
  },
  pillActive: {
    backgroundColor: '#3F3F46',
  },
  pillCurrent: {
    backgroundColor: '#FFFFFF',
    width: 22,
  },
  stepNumber: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 19,
    marginBottom: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 10,
    padding: 14,
  },
  toggleBtnActive: {
    backgroundColor: '#18181B',
    borderColor: '#FFFFFF',
    borderLeftWidth: 3,
    borderLeftColor: '#FFFFFF',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A1A1AA',
    marginBottom: 4,
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  toggleSubText: {
    fontSize: 11,
    color: '#71717A',
    lineHeight: 15,
  },
  numericGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  numericCol: {
    flex: 1,
  },
  numericInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  numericTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
  },
  scienceCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 28,
  },
  scienceCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 18,
  },
  optionsList: {
    gap: 12,
    marginBottom: 28,
  },
  optionCard: {
    backgroundColor: '#121215',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    backgroundColor: '#18181B',
    borderColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#FFFFFF',
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
    backgroundColor: '#18181B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagBadgeText: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#FFFFFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121215',
  },
  checkSquareActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 10,
    gap: 8,
  },
  nextButtonText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  planHeaderCard: {
    backgroundColor: '#121215',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 16,
  },
  planHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  splitBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  splitBadgeText: {
    color: '#09090B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  volumeText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  planDesc: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 18,
  },
  scienceFrameworkBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  scienceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  scienceFrameworkBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scienceFrameworkText: {
    color: '#D4D4D8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  scienceFrameworkAdaptation: {
    color: '#A1A1AA',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  scienceFrameworkSfr: {
    color: '#71717A',
    fontSize: 11,
    lineHeight: 15,
  },
  volumeLandmarksCard: {
    backgroundColor: '#121215',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 20,
  },
  landmarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  landmarksTitle: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  landmarksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  landmarkItem: {
    backgroundColor: '#18181B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '48%',
  },
  landmarkLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  landmarkMuscleName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  priorityMiniBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  priorityMiniBadgeText: {
    color: '#09090B',
    fontSize: 8,
    fontWeight: '900',
  },
  mevMavBadge: {
    backgroundColor: '#27272A',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mevMavBadgeText: {
    color: '#A1A1AA',
    fontSize: 8,
    fontWeight: '800',
  },
  landmarkSets: {
    color: '#D4D4D8',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  landmarkSetsUnit: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '500',
  },
  sessionsHeading: {
    color: '#A1A1AA',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    marginRight: 8,
    alignItems: 'center',
  },
  sessionTabPillActive: {
    backgroundColor: '#18181B',
    borderColor: '#FFFFFF',
  },
  sessionTabPillText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '800',
  },
  sessionTabPillTextActive: {
    color: '#FFFFFF',
  },
  sessionTabPillSub: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  activeSessionContainer: {
    backgroundColor: '#121215',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 24,
  },
  sessionMetaHeader: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    paddingBottom: 10,
  },
  sessionMetaName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sessionMetaFocus: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 2,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseRowCard: {
    backgroundColor: '#18181B',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exLeft: {
    flex: 1,
    paddingRight: 8,
  },
  exRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  exRoleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D4D4D8',
    letterSpacing: 0.6,
  },
  exName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exParams: {
    color: '#A1A1AA',
    fontSize: 11,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#121215',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  swapBtnText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
  },
  finishPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 10,
    gap: 8,
  },
  finishPlanBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
