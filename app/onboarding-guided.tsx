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
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwapExerciseModal } from '../src/components/SwapExerciseModal';
import { WorkoutAuditModal } from '../src/components/WorkoutAuditModal';
import { createProgram, setActiveProgram } from '../src/database/database';
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
  generateAiGuidedRoutine,
  generateGuidedRoutine,
} from '../src/services/recommendationEngine';
import { BiologicalSex, MusclePriority, useUserStore } from '../src/store/userStore';
import Theme from '../src/theme/theme';
import { Exercise, WorkoutProgram } from '../src/types/workout';

type StepKey =
  | 'biometrics'
  | 'priority'
  | 'frequency'
  | 'duration'
  | 'goal'
  | 'experience'
  | 'equipment'
  | 'restrictions'
  | 'result';

export default function OnboardingGuidedScreen() {
  const router = useRouter();
  const { hasCompletedOnboarding, profile, completeOnboarding } = useUserStore();

  // Se o usuário já possui biometria salva no banco/store, pula perguntas básicas e foca em mudança de treino
  const isExistingProfile = Boolean(
    profile?.bodyWeightKg && profile?.heightCm
  );

  const stepsOrder = useMemo<StepKey[]>(() => {
    if (isExistingProfile) {
      return [
        'priority',
        'frequency',
        'duration',
        'goal',
        'equipment',
        'restrictions',
        'result',
      ];
    }
    return [
      'biometrics',
      'priority',
      'frequency',
      'duration',
      'goal',
      'experience',
      'equipment',
      'restrictions',
      'result',
    ];
  }, [isExistingProfile]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const currentStepKey = stepsOrder[currentStepIndex] || 'priority';

  // Passo 1: Biometria & Fisiologia (carrega dados salvos do usuário)
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(profile?.biologicalSex || 'male');
  const [age, setAge] = useState<string>(profile?.age ? String(profile.age) : '');
  const [weight, setWeight] = useState<string>(profile?.bodyWeightKg ? String(profile.bodyWeightKg) : '');
  const [height, setHeight] = useState<string>(profile?.heightCm ? String(profile.heightCm) : '');

  // Passo 2: Foco Muscular Prioritário
  const [musclePriority, setMusclePriority] = useState<MusclePriority>(profile?.musclePriority || 'balanced');

  // Passos de Treino (Mudança de Rotina)
  const [frequency, setFrequency] = useState<WeeklyFrequency>(
    (profile?.preferredDaysPerWeek as WeeklyFrequency) || 4
  );
  const [duration, setDuration] = useState<SessionDuration>('45-60');

  const initialGoal: PrimaryGoal = profile?.primaryGoal === 'forca_pura'
    ? 'strength'
    : profile?.primaryGoal === 'recomposicao'
      ? 'conditioning'
      : 'hypertrophy';
  const [goal, setGoal] = useState<PrimaryGoal>(initialGoal);

  const initialExp: ExperienceLevel = profile?.experienceLevel === 'iniciante'
    ? 'beginner'
    : profile?.experienceLevel === 'avancado'
      ? 'advanced'
      : 'intermediate';
  const [experience, setExperience] = useState<ExperienceLevel>(initialExp);

  const [equipment, setEquipment] = useState<EquipmentEnvironment>(profile?.equipmentEnvironment || 'commercial');
  const [restrictions, setRestrictions] = useState<PhysicalRestriction[]>(
    profile?.physicalRestrictions && profile.physicalRestrictions.length > 0
      ? (profile.physicalRestrictions as PhysicalRestriction[])
      : ['none']
  );

  // Passo Final: Plano Fisiológico Gerado
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(0);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationStage, setGenerationStage] = useState('Consultando IA Fisiológica e Biomecânica...');

  // Submodal de Auditoria Biomecânica com IA
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Modal de Troca de Exercício
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [exerciseToSwap, setExerciseToSwap] = useState<{
    sessionIndex: number;
    exerciseIndex: number;
    exercise: PlannedExercise;
  } | null>(null);

  // Converte o plano gerado para o formato WorkoutProgram para auditoria
  const programForAudit = useMemo<WorkoutProgram | null>(() => {
    if (!generatedPlan) return null;
    return {
      id: 'onboarding_generated_plan',
      name: generatedPlan.planName,
      description: generatedPlan.description,
      isActive: true,
      routines: generatedPlan.sessions.map((s, sIdx) => ({
        id: s.id,
        name: s.name,
        description: s.focus,
        isSystem: true,
        orderIndex: sIdx,
        createdAt: new Date().toISOString(),
        exercises: s.exercises.map((e, eIdx) => ({
          id: `item_${s.id}_${eIdx}`,
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          targetMuscle: e.targetMuscle,
          orderIndex: eIdx,
          targetSets: e.targetSets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          restSeconds: e.restSeconds,
        })),
      })),
      createdAt: new Date().toISOString(),
    };
  }, [generatedPlan]);

  // Navegação entre passos
  const handleNextStep = () => {
    Haptics.selectionAsync().catch(() => { });
    const nextIndex = currentStepIndex + 1;
    // Ao avançar para a última etapa (result), executa a síntese fisiológica com IA
    if (nextIndex === stepsOrder.length - 1) {
      const parsedAge = parseInt(age, 10) || profile?.age || 26;
      const parsedWeight = parseFloat(weight.replace(',', '.')) || profile?.bodyWeightKg || 78;
      const parsedHeight = parseFloat(height.replace(',', '.')) || profile?.heightCm || 176;

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

      setCurrentStepIndex(nextIndex);
      setIsGeneratingPlan(true);
      setGenerationStage('Calibrando alavancas articulares e catálogo de exercícios...');

      // Resolve a chave da API em tempo de bundling (Metro inlina EXPO_PUBLIC_* vars)
      const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      generateAiGuidedRoutine(inputs, { apiKey: geminiKey, timeoutMs: 45000 })
        .then((plan) => {
          setGeneratedPlan(plan);
          setActiveSessionIndex(0);
        })
        .catch((err) => {
          console.error('[heavy.io] Falha na IA Gemini, caindo para motor local:', err?.message || err);
          const fallback = generateGuidedRoutine(inputs);
          setGeneratedPlan(fallback);
          setActiveSessionIndex(0);
        })
        .finally(() => {
          setIsGeneratingPlan(false);
        });
    } else if (nextIndex < stepsOrder.length) {
      setCurrentStepIndex(nextIndex);
    }
  };

  const handleRegenerateWithAi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    const parsedAge = parseInt(age, 10) || profile?.age || 26;
    const parsedWeight = parseFloat(weight.replace(',', '.')) || profile?.bodyWeightKg || 78;
    const parsedHeight = parseFloat(height.replace(',', '.')) || profile?.heightCm || 176;

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

    setIsGeneratingPlan(true);
    setGenerationStage('Formulando nova combinação biomecânica com IA...');

    const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    generateAiGuidedRoutine(inputs, { apiKey: geminiKey, timeoutMs: 45000 })
      .then((plan) => {
        setGeneratedPlan(plan);
        setActiveSessionIndex(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      })
      .catch((err) => {
        console.error('[heavy.io] Falha ao regerar com IA:', err?.message || err);
        Alert.alert('Erro ao regerar treino', 'Não foi possível obter resposta da IA Gemini. Tente novamente em instantes.');
      })
      .finally(() => {
        setIsGeneratingPlan(false);
      });
  };

  const handlePrevStep = () => {
    Haptics.selectionAsync().catch(() => { });
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      router.back();
    }
  };

  // Gerenciamento de restrições (multi-select inteligente)
  const toggleRestriction = (res: PhysicalRestriction) => {
    Haptics.selectionAsync().catch(() => { });
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
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

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
  };

  // Persistência no SQLite e conclusão/ativação da ficha
  const handleConfirmPlan = () => {
    if (!generatedPlan) return;

    try {
      const parsedAge = parseInt(age, 10) || profile?.age || 26;
      const parsedWeight = parseFloat(weight.replace(',', '.')) || profile?.bodyWeightKg || 78;
      const parsedHeight = parseFloat(height.replace(',', '.')) || profile?.heightCm || 176;

      // 1. Cria a ficha completa vinculada ao WorkoutProgram e a marca como ativa
      const createdProg = createProgram(
        generatedPlan.planName,
        generatedPlan.description,
        generatedPlan.sessions.map((sess) => ({
          name: sess.name,
          description: `${sess.focus} • ${sess.dayOfWeek}`,
          exercises: sess.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets,
            targetRepsMin: ex.targetRepsMin,
            targetRepsMax: ex.targetRepsMax,
            restSeconds: ex.restSeconds,
          })),
        }))
      );
      setActiveProgram(createdProg.id);

      // 2. Atualiza a store global com as métricas fisiológicas
      const expMap: Record<ExperienceLevel, 'iniciante' | 'intermediario' | 'avancado'> = {
        beginner: 'iniciante',
        intermediate: 'intermediario',
        advanced: 'avancado',
        returning: 'iniciante',
      };

      const goalMap: Record<PrimaryGoal, 'forca_pura' | 'hipertrofia' | 'recomposicao'> = {
        strength: 'forca_pura',
        hypertrophy: 'hipertrofia',
        conditioning: 'recomposicao',
      };

      completeOnboarding({
        onboardingTrack: 'guided',
        experienceLevel: expMap[experience],
        biologicalSex,
        age: parsedAge,
        musclePriority,
        heightCm: parsedHeight,
        bodyWeightKg: parsedWeight,
        primaryGoal: goalMap[goal],
        preferredDaysPerWeek: frequency,
        equipmentEnvironment: equipment,
        physicalRestrictions: restrictions as any,
        metricsManuallyEdited: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

      // 3. Redirecionamento DIRETO para a tela principal (tabs) sem bloqueio de alert
      router.replace('/(tabs)' as any);
    } catch (err) {
      console.error('Erro ao persistir ficha guiada:', err);
      Alert.alert('Erro', 'Houve uma falha ao salvar a ficha no banco local.');
    }
  };

  const getStepTitle = (key: StepKey, stepNum: number) => {
    switch (key) {
      case 'biometrics':
        return `Passo ${stepNum}: Biometria & Alavancas`;
      case 'priority':
        return `Passo ${stepNum}: Foco Muscular Prioritário`;
      case 'frequency':
        return `Passo ${stepNum}: Frequência Semanal`;
      case 'duration':
        return `Passo ${stepNum}: Tempo por Sessão`;
      case 'goal':
        return `Passo ${stepNum}: Objetivo do Treino`;
      case 'experience':
        return `Passo ${stepNum}: Nível de Treino & Histórico`;
      case 'equipment':
        return `Passo ${stepNum}: Local & Equipamento`;
      case 'restrictions':
        return `Passo ${stepNum}: Restrições & Desconfortos`;
      case 'result':
        return `Passo ${stepNum}: Prescrição Científica do Treino`;
      default:
        return `Passo ${stepNum}`;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header & Progress */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handlePrevStep} activeOpacity={0.8}>
          <ArrowLeft size={20} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.progressPills}>
          {stepsOrder.map((stepKey, idx) => (
            <View
              key={stepKey}
              style={[
                styles.pill,
                idx <= currentStepIndex && styles.pillActive,
                idx === currentStepIndex && styles.pillCurrent,
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepNumber}>
          {currentStepIndex + 1}/{stepsOrder.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isExistingProfile && currentStepKey !== 'result' && (
          <View style={styles.profileBadgeBanner}>
            <View style={styles.profileBadgeLeft}>
              <Activity size={13} color="#A1A1AA" />
              <Text style={styles.profileBadgeText}>
                Perfil Salvo: {biologicalSex === 'male' ? 'Masc' : 'Fem'} • {age} anos • {weight}kg • {height}cm • {experience === 'beginner' ? 'Iniciante' : experience === 'advanced' ? 'Avançado' : 'Intermediário'}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.stepTitle}>
          {getStepTitle(currentStepKey, currentStepIndex + 1)}
        </Text>

        {/* ========================================================= */}
        {/* PASSO 1: BIOMETRIA & FISIOLOGIA                           */}
        {/* ========================================================= */}
        {currentStepKey === 'biometrics' && (
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
                    Haptics.selectionAsync().catch(() => { });
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
                    Haptics.selectionAsync().catch(() => { });
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
        {currentStepKey === 'priority' && (
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
        {currentStepKey === 'frequency' && (
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
        {currentStepKey === 'duration' && (
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
        {currentStepKey === 'goal' && (
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
        {currentStepKey === 'experience' && (
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
        {currentStepKey === 'equipment' && (
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
        {currentStepKey === 'restrictions' && (
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
        {currentStepKey === 'result' && isGeneratingPlan && (
          <View style={styles.aiLoadingContainer}>
            <View style={styles.aiLoadingHeader}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.aiLoadingTitle}>PRESCRIÇÃO CIENTÍFICA INDIVIDUAL</Text>
            </View>
            <Text style={styles.aiLoadingStageText}>{generationStage}</Text>

            <View style={styles.aiLoadingMetricsBox}>
              <View style={styles.aiLoadingMetricRow}>
                <Text style={styles.aiLoadingMetricLabel}>Atleta</Text>
                <Text style={styles.aiLoadingMetricValue}>
                  {biologicalSex === 'female' ? 'Feminino' : 'Masculino'} • {age}a • {weight}kg • {height}cm
                </Text>
              </View>
              <View style={styles.aiLoadingMetricRow}>
                <Text style={styles.aiLoadingMetricLabel}>Foco Muscular</Text>
                <Text style={styles.aiLoadingMetricValue}>
                  {musclePriority === 'balanced' ? 'Equilíbrio Fisiológico' :
                    musclePriority === 'chest' ? 'Peitoral' :
                      musclePriority === 'back' ? 'Costas & Dorsais' :
                        musclePriority === 'legs_glutes' ? 'Pernas & Glúteos' :
                          musclePriority === 'shoulders' ? 'Deltoides' : 'Braços'}
                </Text>
              </View>
              <View style={styles.aiLoadingMetricRow}>
                <Text style={styles.aiLoadingMetricLabel}>Estrutura</Text>
                <Text style={styles.aiLoadingMetricValue}>
                  {frequency} dias/sem • {duration} min/sessão
                </Text>
              </View>
              <View style={styles.aiLoadingMetricRow}>
                <Text style={styles.aiLoadingMetricLabel}>Parâmetros</Text>
                <Text style={styles.aiLoadingMetricValue}>
                  SFR • Alongamento Passivo • Simão et al.
                </Text>
              </View>
            </View>

            <Text style={styles.aiLoadingHint}>
              Consultando catálogo de +120 exercícios...
            </Text>
          </View>
        )}

        {currentStepKey === 'result' && !isGeneratingPlan && generatedPlan && (
          <View>
            {/* Header do Plano Gerado */}
            <View style={styles.planHeaderCard}>
              <View style={styles.planHeaderTop}>
                <View style={styles.planBadgeGroup}>
                  <View style={styles.splitBadge}>
                    <Text style={styles.splitBadgeText}>{generatedPlan.splitType.toUpperCase()}</Text>
                  </View>
                  <View style={styles.aiPlanBadge}>
                    <Sparkles size={10} color="#FFFFFF" />
                    <Text style={styles.aiPlanBadgeText}>
                      {generatedPlan.isAiGenerated ? 'IA GEMINI 3.6 FLASH' : 'MOTOR LOCAL'}
                    </Text>
                  </View>
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

            {/* Card de Auditoria Biomecânica e Vetores com IA */}
            <View style={styles.aiAuditBannerCard}>
              <View style={styles.aiAuditBannerTop}>
                <View style={styles.aiAuditIconRow}>
                  <Activity size={14} color={Theme.colors.primary} />
                  <Text style={styles.aiAuditBannerTitle}>AUDITORIA BIOMECÂNICA IA</Text>
                </View>
                <View style={styles.aiAuditScoreBadge}>
                  <Text style={styles.aiAuditScoreText}>VALIDADO CIENTIFICAMENTE</Text>
                </View>
              </View>
              <Text style={styles.aiAuditBannerDesc}>
                Distribuição validada quanto ao estresse lombo-pélvico, equilíbrio Push/Pull e marcos MAV de hipertrofia muscular.
              </Text>
              <View style={styles.aiAuditBtnRow}>
                <TouchableOpacity
                  style={styles.aiAuditOpenBtn}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => { });
                    setIsAuditModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Sparkles size={13} color={Theme.colors.textInverse} />
                  <Text style={styles.aiAuditOpenBtnText}>Diagnóstico Biomecânico</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.aiAuditRegenBtn}
                  onPress={handleRegenerateWithAi}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={12} color="#FFFFFF" />
                  <Text style={styles.aiAuditRegenBtnText}>Regerar com IA</Text>
                </TouchableOpacity>
              </View>
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
                      Haptics.selectionAsync().catch(() => { });
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

        {/* Botão de Avanço nos Passos Anteriores ao Resultado */}
        {currentStepIndex < stepsOrder.length - 1 && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextStep}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {currentStepIndex === stepsOrder.length - 2
                ? 'Calcular Nova Periodização Fisiológica'
                : 'Próximo Passo'}
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
          age: parseInt(age, 10) || profile?.age || 26,
          weightKg: parseFloat(weight.replace(',', '.')) || profile?.bodyWeightKg || 78,
          heightCm: parseFloat(height.replace(',', '.')) || profile?.heightCm || 176,
          musclePriority,
        }}
        onSelectSubstitute={handleApplySwap}
      />

      {/* Modal de Auditoria Biomecânica e Vetores */}
      <WorkoutAuditModal
        visible={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        program={programForAudit}
      />
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  profileBadgeBanner: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  profileBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
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
  planBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  aiPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  aiPlanBadgeText: {
    color: '#E4E4E7',
    fontSize: 9,
    fontWeight: '800',
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
  aiAuditBannerCard: {
    backgroundColor: '#121215',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginBottom: 18,
    gap: 8,
  },
  aiAuditBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiAuditIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAuditBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  aiAuditScoreBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  aiAuditScoreText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  aiAuditBannerDesc: {
    fontSize: 11,
    color: '#A1A1AA',
    lineHeight: 16,
  },
  aiAuditBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  aiAuditOpenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  aiAuditOpenBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.3,
  },
  aiAuditRegenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  aiAuditRegenBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D4D4D8',
    letterSpacing: 0.3,
  },
  aiLoadingContainer: {
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    marginTop: 12,
  },
  aiLoadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  aiLoadingTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aiLoadingStageText: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  aiLoadingMetricsBox: {
    width: '100%',
    backgroundColor: '#18181B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  aiLoadingMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiLoadingMetricLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  aiLoadingMetricValue: {
    color: '#E4E4E7',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  aiLoadingHint: {
    color: '#71717A',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
