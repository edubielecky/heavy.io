import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  TextInput,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Calendar,
  Layers,
  ChevronRight,
  ListPlus,
  Sparkles
} from 'lucide-react-native';
import Theme from '../src/theme/theme';
import { Exercise } from '../src/types/workout';
import { saveRoutine } from '../src/database/database';
import { useUserStore } from '../src/store/userStore';
import { BatchExerciseModal } from '../src/components/BatchExerciseModal';

// Interfaces de apoio para o assistente de montagem da Trilha A
interface ConfiguredExercise {
  exerciseId: string;
  exerciseName: string;
  targetMuscle: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  initialWeightKg?: number;
  restSeconds: number;
}

interface ConfiguredSession {
  id: string;
  name: string;
  dayOfWeek?: string;
  exercises: ConfiguredExercise[];
}

type SplitPresetType = 'ppl' | 'upper_lower' | 'full_body' | 'traditional' | 'custom';

const SPLIT_PRESETS = [
  {
    id: 'ppl' as SplitPresetType,
    title: 'Push / Pull / Legs (PPL)',
    badge: '3 a 6 DIAS',
    desc: 'Empurrar (Peito/Ombro/Tríceps), Puxar (Costas/Bíceps) e Pernas completas.',
    defaultSessions: [
      { id: 's_push', name: 'Treino A - Push (Peito, Ombros & Tríceps)', dayOfWeek: 'Segunda-feira', exercises: [] },
      { id: 's_pull', name: 'Treino B - Pull (Costas, Trapézio & Bíceps)', dayOfWeek: 'Terça-feira', exercises: [] },
      { id: 's_legs', name: 'Treino C - Legs (Quadríceps, Posterior & Panturrilha)', dayOfWeek: 'Quarta-feira', exercises: [] },
    ],
  },
  {
    id: 'upper_lower' as SplitPresetType,
    title: 'Upper / Lower',
    badge: '4 DIAS',
    desc: 'Divisão clássica e altamente eficiente entre Membros Superiores e Inferiores.',
    defaultSessions: [
      { id: 's_upper_1', name: 'Treino A - Upper (Superiores Força)', dayOfWeek: 'Segunda-feira', exercises: [] },
      { id: 's_lower_1', name: 'Treino B - Lower (Inferiores Força)', dayOfWeek: 'Terça-feira', exercises: [] },
      { id: 's_upper_2', name: 'Treino C - Upper (Superiores Hipertrofia)', dayOfWeek: 'Quinta-feira', exercises: [] },
      { id: 's_lower_2', name: 'Treino D - Lower (Inferiores Hipertrofia)', dayOfWeek: 'Sexta-feira', exercises: [] },
    ],
  },
  {
    id: 'full_body' as SplitPresetType,
    title: 'Full Body (3x ou 4x)',
    badge: '3 a 4 DIAS',
    desc: 'Corpo inteiro por sessão, máxima frequência de estímulo em compostos pesados.',
    defaultSessions: [
      { id: 's_fb_1', name: 'Treino A - Full Body Foco Agachamento', dayOfWeek: 'Segunda-feira', exercises: [] },
      { id: 's_fb_2', name: 'Treino B - Full Body Foco Supino & Terra', dayOfWeek: 'Quarta-feira', exercises: [] },
      { id: 's_fb_3', name: 'Treino C - Full Body Acessórios & Volume', dayOfWeek: 'Sexta-feira', exercises: [] },
    ],
  },
  {
    id: 'traditional' as SplitPresetType,
    title: 'Split Tradicional (ABCDE / ABCD)',
    badge: '4 a 5 DIAS',
    desc: 'Foco em um a dois grupos musculares específicos por dia com alto volume de isolamento.',
    defaultSessions: [
      { id: 's_trad_a', name: 'Treino A - Peitoral & Abdômen', dayOfWeek: 'Segunda-feira', exercises: [] },
      { id: 's_trad_b', name: 'Treino B - Costas & Lombar', dayOfWeek: 'Terça-feira', exercises: [] },
      { id: 's_trad_c', name: 'Treino C - Pernas Completas', dayOfWeek: 'Quarta-feira', exercises: [] },
      { id: 's_trad_d', name: 'Treino D - Ombros & Trapézio', dayOfWeek: 'Quinta-feira', exercises: [] },
      { id: 's_trad_e', name: 'Treino E - Braços (Bíceps & Tríceps)', dayOfWeek: 'Sexta-feira', exercises: [] },
    ],
  },
  {
    id: 'custom' as SplitPresetType,
    title: 'Criar do Zero (Totalmente Livre)',
    badge: 'PERSONALIZADO',
    desc: 'Sem amarras. Crie quantas sessões desejar com nomes e configurações personalizadas.',
    defaultSessions: [
      { id: 's_cust_1', name: 'Treino 1', dayOfWeek: '', exercises: [] },
      { id: 's_cust_2', name: 'Treino 2', dayOfWeek: '', exercises: [] },
    ],
  },
];

const DAYS_OPTIONS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
  'Livre / Flexível',
];

export default function OnboardingAdvancedScreen() {
  const router = useRouter();
  const { completeOnboarding } = useUserStore();

  // Etapa atual do wizard: 1, 2, 3 ou 4
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Estado da divisão e sessões
  const [selectedPreset, setSelectedPreset] = useState<SplitPresetType>('ppl');
  const [sessions, setSessions] = useState<ConfiguredSession[]>(SPLIT_PRESETS[0].defaultSessions);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);

  // Modal de busca em lote
  const [modalBatchVisible, setModalBatchVisible] = useState(false);

  // ==========================================
  // PASSO A1: SELEÇÃO DE PRESET DE SPLIT
  // ==========================================
  const handleSelectPreset = (presetId: SplitPresetType) => {
    setSelectedPreset(presetId);
    const found = SPLIT_PRESETS.find(p => p.id === presetId);
    if (found) {
      setSessions(JSON.parse(JSON.stringify(found.defaultSessions)));
      setActiveSessionIndex(0);
    }
    Haptics.selectionAsync().catch(() => {});
  };

  // ==========================================
  // PASSO A2: CONFIGURAÇÃO DOS DIAS / SESSÕES
  // ==========================================
  const handleUpdateSessionName = (index: number, name: string) => {
    setSessions(prev => {
      const copy = [...prev];
      copy[index].name = name;
      return copy;
    });
  };

  const handleUpdateSessionDay = (index: number, day: string) => {
    setSessions(prev => {
      const copy = [...prev];
      copy[index].dayOfWeek = day;
      return copy;
    });
    Haptics.selectionAsync().catch(() => {});
  };

  const handleAddSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const letter = String.fromCharCode(65 + sessions.length); // A, B, C, D...
    const newSession: ConfiguredSession = {
      id: `s_custom_${Date.now()}`,
      name: `Treino ${letter}`,
      dayOfWeek: '',
      exercises: [],
    };
    setSessions(prev => [...prev, newSession]);
  };

  const handleRemoveSession = (index: number) => {
    if (sessions.length <= 1) {
      Alert.alert('Atenção', 'A rotina precisa de pelo menos uma sessão.');
      return;
    }
    setSessions(prev => prev.filter((_, i) => i !== index));
    if (activeSessionIndex >= sessions.length - 1) {
      setActiveSessionIndex(Math.max(0, sessions.length - 2));
    }
  };

  // ==========================================
  // PASSO A3: INSERÇÃO RÁPIDA EM LOTE
  // ==========================================
  const handleAddBatchExercises = (exercises: Exercise[]) => {
    const active = sessions[activeSessionIndex];
    if (!active) return;

    const newConfigured = exercises.map(ex => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetMuscle: ex.targetMuscle,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: ex.defaultRestSeconds || 90,
      initialWeightKg: undefined,
    }));

    setSessions(prev => {
      const copy = [...prev];
      copy[activeSessionIndex].exercises = [
        ...copy[activeSessionIndex].exercises,
        ...newConfigured,
      ];
      return copy;
    });
  };

  const handleUpdateExerciseParam = (
    sessionIdx: number,
    exIdx: number,
    field: keyof ConfiguredExercise,
    val: any
  ) => {
    setSessions(prev => {
      const copy = [...prev];
      const target = { ...copy[sessionIdx].exercises[exIdx], [field]: val };
      copy[sessionIdx].exercises[exIdx] = target;
      return copy;
    });
  };

  const handleRemoveExerciseFromSession = (sessionIdx: number, exIdx: number) => {
    setSessions(prev => {
      const copy = [...prev];
      copy[sessionIdx].exercises = copy[sessionIdx].exercises.filter((_, i) => i !== exIdx);
      return copy;
    });
  };

  // ==========================================
  // PASSO A4: CONCLUSÃO & SALVAMENTO NO SQLITE
  // ==========================================
  const handleSaveAndGoToHub = () => {
    // 1. Grava cada sessão como uma rotina no SQLite
    try {
      sessions.forEach((sess, sIdx) => {
        saveRoutine({
          id: `routine_${Date.now()}_${sIdx}`,
          name: sess.name,
          description: sess.dayOfWeek ? `Dia sugerido: ${sess.dayOfWeek}` : undefined,
          isSystem: false,
          exercises: sess.exercises.map((ex, exIdx) => ({
            id: `re_${Date.now()}_${sIdx}_${exIdx}`,
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            targetMuscle: ex.targetMuscle as any,
            orderIndex: exIdx,
            targetSets: ex.targetSets,
            targetRepsMin: ex.targetRepsMin,
            targetRepsMax: ex.targetRepsMax,
            restSeconds: ex.restSeconds,
          })),
        });
      });

      // 2. Marca onboarding como concluído na store
      completeOnboarding({
        onboardingTrack: 'advanced',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        'Rotinas Salvas!',
        'Sua estrutura de treinos foi gravada com sucesso no SQLite local do heavy.io.',
        [
          { text: 'Acessar Hub', onPress: () => router.replace('/(tabs)' as any) }
        ]
      );
    } catch (err) {
      console.error('Erro ao salvar rotinas da Trilha A:', err);
      Alert.alert('Erro', 'Houve uma falha ao salvar as rotinas no banco local.');
    }
  };

  // Helper para títulos das etapas
  const stepTitles = {
    1: 'Passo A1: Estrutura de Divisão (Split)',
    2: 'Passo A2: Configuração dos Dias',
    3: 'Passo A3: Inserção de Exercícios',
    4: 'Passo A4: Resumo & Conclusão',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topNav}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => {
            if (currentStep > 1) {
              setCurrentStep((currentStep - 1) as any);
            } else {
              router.back();
            }
          }}
        >
          <ArrowLeft size={20} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.stepProgressContainer}>
          {[1, 2, 3, 4].map(st => (
            <View 
              key={st}
              style={[
                styles.stepProgressPill,
                st <= currentStep && styles.stepProgressPillActive,
              ]} 
            />
          ))}
        </View>

        <Text style={styles.stepIndicatorText}>{currentStep}/4</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{stepTitles[currentStep]}</Text>

        {/* ========================================================= */}
        {/* RENDER PASSO 1: PRESETS DE SPLIT                          */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepDesc}>
              Selecione uma base pronta para economizar digitação ou opte por começar totalmente livre.
            </Text>

            <View style={styles.presetsList}>
              {SPLIT_PRESETS.map(preset => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetCard, isSelected && styles.presetCardActive]}
                    onPress={() => handleSelectPreset(preset.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.presetHeader}>
                      <Text style={[styles.presetTitle, isSelected && styles.presetTitleActive]}>
                        {preset.title}
                      </Text>
                      <View style={[styles.presetBadge, isSelected && styles.presetBadgeActive]}>
                        <Text style={[styles.presetBadgeText, isSelected && styles.presetBadgeTextActive]}>
                          {preset.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.presetDesc}>{preset.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setCurrentStep(2);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>Avançar para Configuração dos Dias</Text>
              <ArrowRight size={18} color={Theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* RENDER PASSO 2: NOMES DAS SESSÕES & DIAS                  */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepDesc}>
              Personalize o nome de cada sessão e, se desejar, vincule ao dia da semana sugerido.
            </Text>

            <View style={styles.sessionsList}>
              {sessions.map((sess, idx) => (
                <View key={sess.id} style={styles.sessionCard}>
                  <View style={styles.sessionCardHeader}>
                    <Text style={styles.sessionIndexText}>Sessão {idx + 1}</Text>
                    <TouchableOpacity 
                      onPress={() => handleRemoveSession(idx)}
                      style={styles.removeSessionBtn}
                    >
                      <Trash2 size={16} color={Theme.colors.danger} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputFieldLabel}>Nome da Sessão</Text>
                  <TextInput
                    style={styles.sessionTextInput}
                    value={sess.name}
                    onChangeText={text => handleUpdateSessionName(idx, text)}
                    placeholder="Ex: Treino A - Peitoral Pesado"
                    placeholderTextColor={Theme.colors.textMuted}
                  />

                  <Text style={[styles.inputFieldLabel, { marginTop: 10 }]}>Dia da Semana (Opcional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                    {DAYS_OPTIONS.map(day => {
                      const isDaySelected = sess.dayOfWeek === day;
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayChip, isDaySelected && styles.dayChipActive]}
                          onPress={() => handleUpdateSessionDay(idx, isDaySelected ? '' : day)}
                        >
                          <Text style={[styles.dayChipText, isDaySelected && styles.dayChipTextActive]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.addDayBtn}
              onPress={handleAddSession}
              activeOpacity={0.8}
            >
              <Plus size={16} color={Theme.colors.primary} />
              <Text style={styles.addDayBtnText}>Adicionar Outra Sessão</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { marginTop: 20 }]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setCurrentStep(3);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>Avançar para Exercícios da Rotina</Text>
              <ArrowRight size={18} color={Theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* RENDER PASSO 3: INSERÇÃO RÁPIDA DE EXERCÍCIOS             */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepDesc}>
              Selecione a sessão ativa e adicione exercícios em lote filtrando por grupo e equipamento.
            </Text>

            {/* Abas das Sessões */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionTabsScroll}>
              {sessions.map((s, sIdx) => {
                const isTabActive = activeSessionIndex === sIdx;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sessionTab, isTabActive && styles.sessionTabActive]}
                    onPress={() => {
                      setActiveSessionIndex(sIdx);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                  >
                    <Text style={[styles.sessionTabText, isTabActive && styles.sessionTabTextActive]}>
                      {s.name.split(' - ')[0] || `Sessão ${sIdx + 1}`}
                    </Text>
                    <View style={styles.sessionCountBadge}>
                      <Text style={styles.sessionCountText}>{s.exercises.length}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Card da Sessão Ativa */}
            {sessions[activeSessionIndex] && (
              <View style={styles.activeSessionContainer}>
                <View style={styles.activeSessionTitleRow}>
                  <Text style={styles.activeSessionTitle} numberOfLines={1}>
                    {sessions[activeSessionIndex].name}
                  </Text>
                  <TouchableOpacity
                    style={styles.addBatchBtn}
                    onPress={() => setModalBatchVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color={Theme.colors.textInverse} />
                    <Text style={styles.addBatchBtnText}>Buscar em Lote</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Exercícios Adicionados */}
                {sessions[activeSessionIndex].exercises.length === 0 ? (
                  <View style={styles.emptySessionBox}>
                    <ListPlus size={32} color={Theme.colors.borderLight} />
                    <Text style={styles.emptySessionText}>
                      Nenhum exercício adicionado nesta sessão ainda.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyAddBtn}
                      onPress={() => setModalBatchVisible(true)}
                    >
                      <Text style={styles.emptyAddBtnText}>Abrir Catálogo em Lote</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.configuredExercisesList}>
                    {sessions[activeSessionIndex].exercises.map((ex, exIdx) => (
                      <View key={`${ex.exerciseId}_${exIdx}`} style={styles.exConfigCard}>
                        <View style={styles.exConfigHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exConfigName}>{ex.exerciseName}</Text>
                            <Text style={styles.exConfigMuscle}>{ex.targetMuscle.toUpperCase()}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveExerciseFromSession(activeSessionIndex, exIdx)}
                            style={styles.removeExBtn}
                          >
                            <Trash2 size={16} color={Theme.colors.danger} />
                          </TouchableOpacity>
                        </View>

                        {/* Configuração de Séries, Reps, Carga e Descanso */}
                        <View style={styles.exParamsGrid}>
                          <View style={styles.paramBox}>
                            <Text style={styles.paramLabel}>Séries</Text>
                            <TextInput
                              style={styles.paramInput}
                              keyboardType="numeric"
                              value={ex.targetSets.toString()}
                              onChangeText={val => handleUpdateExerciseParam(activeSessionIndex, exIdx, 'targetSets', parseInt(val, 10) || 1)}
                            />
                          </View>

                          <View style={styles.paramBox}>
                            <Text style={styles.paramLabel}>Reps Min-Max</Text>
                            <View style={styles.repsRow}>
                              <TextInput
                                style={[styles.paramInput, { flex: 1 }]}
                                keyboardType="numeric"
                                value={ex.targetRepsMin.toString()}
                                onChangeText={val => handleUpdateExerciseParam(activeSessionIndex, exIdx, 'targetRepsMin', parseInt(val, 10) || 1)}
                              />
                              <Text style={styles.paramDivider}>-</Text>
                              <TextInput
                                style={[styles.paramInput, { flex: 1 }]}
                                keyboardType="numeric"
                                value={ex.targetRepsMax.toString()}
                                onChangeText={val => handleUpdateExerciseParam(activeSessionIndex, exIdx, 'targetRepsMax', parseInt(val, 10) || 1)}
                              />
                            </View>
                          </View>

                          <View style={styles.paramBox}>
                            <Text style={styles.paramLabel}>Descanso</Text>
                            <TextInput
                              style={styles.paramInput}
                              keyboardType="numeric"
                              value={ex.restSeconds.toString()}
                              onChangeText={val => handleUpdateExerciseParam(activeSessionIndex, exIdx, 'restSeconds', parseInt(val, 10) || 60)}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.actionBtn, { marginTop: 24 }]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setCurrentStep(4);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>Revisar e Finalizar</Text>
              <ArrowRight size={18} color={Theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* RENDER PASSO 4: RESUMO & SALVAR NO HUB                   */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepDesc}>
              Confira a estrutura final das suas rotinas antes de sincronizar com o banco local.
            </Text>

            <View style={styles.summaryContainer}>
              {sessions.map((sess, idx) => (
                <View key={sess.id} style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>{sess.name}</Text>
                    {sess.dayOfWeek ? (
                      <View style={styles.summaryBadge}>
                        <Text style={styles.summaryBadgeText}>{sess.dayOfWeek}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.summaryCount}>
                    {sess.exercises.length} exercício{sess.exercises.length === 1 ? '' : 's'} configurado{sess.exercises.length === 1 ? '' : 's'}:
                  </Text>

                  {sess.exercises.map(ex => (
                    <Text key={ex.exerciseId} style={styles.summaryExItem}>
                      • {ex.exerciseName} ({ex.targetSets} séries de {ex.targetRepsMin}-{ex.targetRepsMax} reps)
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={handleSaveAndGoToHub}
              activeOpacity={0.85}
            >
              <Check size={18} color={Theme.colors.textInverse} />
              <Text style={styles.actionBtnText}>Salvar e Ir para o Hub de Treinos</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de Busca e Inserção em Lote */}
      <BatchExerciseModal
        visible={modalBatchVisible}
        onClose={() => setModalBatchVisible(false)}
        onConfirmBatch={handleAddBatchExercises}
        alreadySelectedIds={sessions[activeSessionIndex]?.exercises.map(e => e.exerciseId) || []}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    padding: 6,
  },
  stepProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepProgressPill: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  stepProgressPillActive: {
    backgroundColor: Theme.colors.primary,
  },
  stepIndicatorText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 70,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  presetsList: {
    gap: 12,
    marginBottom: 26,
  },
  presetCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  presetCardActive: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  presetTitleActive: {
    color: Theme.colors.text,
  },
  presetBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  presetBadgeActive: {
    backgroundColor: Theme.colors.primary,
  },
  presetBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  presetBadgeTextActive: {
    color: Theme.colors.textInverse,
  },
  presetDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 50,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  actionBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sessionsList: {
    gap: 14,
    marginBottom: 14,
  },
  sessionCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionIndexText: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeSessionBtn: {
    padding: 4,
  },
  inputFieldLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  sessionTextInput: {
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 44,
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  daysScroll: {
    marginTop: 4,
  },
  dayChip: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dayChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  dayChipText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: Theme.colors.textInverse,
    fontWeight: '800',
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    borderStyle: 'dashed',
    gap: 6,
  },
  addDayBtnText: {
    color: Theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  sessionTabsScroll: {
    marginBottom: 16,
  },
  sessionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 6,
  },
  sessionTabActive: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderColor: Theme.colors.primary,
  },
  sessionTabText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sessionTabTextActive: {
    color: Theme.colors.text,
  },
  sessionCountBadge: {
    backgroundColor: '#09090B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  sessionCountText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activeSessionContainer: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
  },
  activeSessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  activeSessionTitle: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  addBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
  },
  addBatchBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  emptySessionBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  emptySessionText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  emptyAddBtn: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  emptyAddBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  configuredExercisesList: {
    gap: 12,
  },
  exConfigCard: {
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exConfigName: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  exConfigMuscle: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  removeExBtn: {
    padding: 4,
  },
  exParamsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  paramBox: {
    flex: 1,
  },
  paramLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  paramInput: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    height: 36,
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  repsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paramDivider: {
    color: Theme.colors.textMuted,
    fontWeight: '700',
  },
  summaryContainer: {
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryTitle: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryBadge: {
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  summaryBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  summaryCount: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  summaryExItem: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
