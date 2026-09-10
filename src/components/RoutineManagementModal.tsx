import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  X,
  Plus,
  Check,
  Layers,
  ChevronRight,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Calendar,
  Dumbbell,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  Activity,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Theme from '../theme/theme';
import {
  WorkoutProgram,
  Routine,
  RoutineExerciseItem,
  Exercise,
} from '../types/workout';
import {
  getPrograms,
  getActiveProgram,
  setActiveProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  addDayToProgram,
  deleteDayFromProgram,
  saveRoutine,
  getExerciseById,
} from '../database/database';
import { SEED_EXERCISES } from '../database/seedData';
import { AddExerciseModal } from './AddExerciseModal';
import { WorkoutAuditModal } from './WorkoutAuditModal';
import { AuditAction } from '../services/aiWorkoutService';

interface RoutineManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onProgramsUpdated?: () => void;
}

export const RoutineManagementModal: React.FC<RoutineManagementModalProps> = ({
  visible,
  onClose,
  onProgramsUpdated,
}) => {
  // Estado das fichas carregadas
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  // Ficha selecionada para edição detalhada de dias/exercícios (null = tela inicial de listagem)
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  // Dia atualmente selecionado dentro da ficha em edição
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);

  // Submodais
  const [isNewProgramModalOpen, setIsNewProgramModalOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'empty' | 'ppl' | 'upper_lower' | 'fullbody'>('empty');

  // Modal para renomear ficha
  const [isRenameProgramModalOpen, setIsRenameProgramModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Modal para adicionar exercício ao dia selecionado
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);

  // Submodal de Diagnóstico Biomecânico (IA)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditTargetProgram, setAuditTargetProgram] = useState<WorkoutProgram | null>(null);

  const handleApplyAuditAction = (action: AuditAction) => {
    if (!auditTargetProgram) return;

    if (action.type === 'swap' && action.fromExerciseId && action.toExerciseId) {
      let modified = false;
      auditTargetProgram.routines.forEach(routine => {
        const exIndex = routine.exercises.findIndex(e => e.exerciseId === action.fromExerciseId);
        if (exIndex >= 0) {
          const toEx = getExerciseById(action.toExerciseId!) || SEED_EXERCISES.find(e => e.id === action.toExerciseId);
          if (toEx) {
            const updated = [...routine.exercises];
            updated[exIndex] = {
              ...updated[exIndex],
              exerciseId: toEx.id,
              exerciseName: toEx.name,
              targetMuscle: toEx.targetMuscle,
            };
            saveRoutine({
              ...routine,
              exercises: updated,
            });
            modified = true;
          }
        }
      });

      if (modified) {
        reloadPrograms();
        Alert.alert('Otimização Aplicada', `Exercício substituído por ${action.toExerciseName || 'novo exercício'}.`);
      }
    }
  };

  // Carrega programas do banco SQLite
  const reloadPrograms = () => {
    try {
      const all = getPrograms();
      setPrograms(all);
      if (onProgramsUpdated) onProgramsUpdated();
    } catch (e) {
      console.error('Erro ao carregar programas no modal:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      reloadPrograms();
      setEditingProgramId(null);
      setSelectedRoutineIndex(0);
    }
  }, [visible]);

  // Ficha atualmente em edição detalhada
  const currentEditingProgram = useMemo(() => {
    if (!editingProgramId) return null;
    return programs.find(p => p.id === editingProgramId) || null;
  }, [programs, editingProgramId]);

  // Dia atualmente selecionado na ficha em edição
  const currentSelectedRoutine = useMemo(() => {
    if (!currentEditingProgram || currentEditingProgram.routines.length === 0) return null;
    const index = Math.min(selectedRoutineIndex, currentEditingProgram.routines.length - 1);
    return currentEditingProgram.routines[index] || null;
  }, [currentEditingProgram, selectedRoutineIndex]);

  // Alternar ficha ativa
  const handleToggleActive = (programId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      setActiveProgram(programId);
      reloadPrograms();
    } catch (err) {
      console.error('Erro ao ativar programa:', err);
      Alert.alert('Erro', 'Não foi possível alternar a ficha ativa.');
    }
  };

  // Excluir ficha
  const handleDeleteProgram = (program: WorkoutProgram) => {
    if (programs.length <= 1) {
      Alert.alert('Ação Não Permitida', 'Você deve manter pelo menos uma ficha cadastrada no aplicativo.');
      return;
    }

    Alert.alert(
      'Excluir Ficha?',
      `Deseja realmente excluir "${program.name}" e todos os seus dias de treino? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            deleteProgram(program.id);
            if (editingProgramId === program.id) {
              setEditingProgramId(null);
            }
            reloadPrograms();
          },
        },
      ]
    );
  };

  // Criar nova ficha
  const handleCreateProgram = () => {
    const trimmed = newProgramName.trim();
    if (!trimmed) {
      Alert.alert('Nome Obrigatório', 'Informe um nome para a sua nova ficha de treino.');
      return;
    }

    let initialDays: Array<{ name: string; description?: string }> = [];
    if (selectedTemplate === 'ppl') {
      initialDays = [
        { name: 'Push (Peito, Ombros & Tríceps)', description: 'Foco em empurrar' },
        { name: 'Pull (Costas, Dorsal & Bíceps)', description: 'Foco em puxar' },
        { name: 'Legs (Quadríceps & Posterior)', description: 'Foco em pernas' },
      ];
    } else if (selectedTemplate === 'upper_lower') {
      initialDays = [
        { name: 'Superior (Upper)', description: 'Tronco e membros superiores' },
        { name: 'Inferior (Lower)', description: 'Membros inferiores e abdômen' },
      ];
    } else if (selectedTemplate === 'fullbody') {
      initialDays = [
        { name: 'Full Body A', description: 'Corpo inteiro com foco em compostos' },
        { name: 'Full Body B', description: 'Corpo inteiro variação hipertrófica' },
      ];
    } else {
      initialDays = [
        { name: 'Treino A', description: 'Primeira sessão da divisão' },
        { name: 'Treino B', description: 'Segunda sessão da divisão' },
      ];
    }

    try {
      const created = createProgram(trimmed, newProgramDesc.trim() || undefined, initialDays);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setIsNewProgramModalOpen(false);
      setNewProgramName('');
      setNewProgramDesc('');
      setSelectedTemplate('empty');
      reloadPrograms();
      // Abre imediatamente no modo de edição para personalizar os exercícios
      setEditingProgramId(created.id);
      setSelectedRoutineIndex(0);
    } catch (e) {
      console.error('Erro ao criar ficha:', e);
      Alert.alert('Erro', 'Não foi possível criar a nova ficha.');
    }
  };

  // Salvar renomeação de ficha
  const handleSaveRename = () => {
    if (!renameTargetId || !renameValue.trim()) return;
    try {
      updateProgram(renameTargetId, { name: renameValue.trim() });
      setIsRenameProgramModalOpen(false);
      setRenameTargetId(null);
      setRenameValue('');
      reloadPrograms();
    } catch (e) {
      console.error('Erro ao renomear ficha:', e);
      Alert.alert('Erro', 'Falha ao renomear a ficha.');
    }
  };

  // Adicionar novo dia à ficha em edição
  const handleAddDay = () => {
    if (!currentEditingProgram) return;
    const nextLetter = String.fromCharCode(65 + currentEditingProgram.routines.length);
    const dayName = `Treino ${nextLetter}`;
    
    try {
      addDayToProgram(currentEditingProgram.id, dayName);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      reloadPrograms();
      setSelectedRoutineIndex(currentEditingProgram.routines.length);
    } catch (e) {
      console.error('Erro ao adicionar dia:', e);
      Alert.alert('Erro', 'Não foi possível adicionar um novo dia à ficha.');
    }
  };

  // Excluir dia da ficha em edição
  const handleDeleteDay = (routine: Routine) => {
    if (!currentEditingProgram) return;
    if (currentEditingProgram.routines.length <= 1) {
      Alert.alert('Aviso', 'A ficha precisa conter ao menos um dia de treino.');
      return;
    }

    Alert.alert(
      'Remover Dia de Treino?',
      `Deseja remover "${routine.name}" e os exercícios programados para este dia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            deleteDayFromProgram(routine.id);
            setSelectedRoutineIndex(0);
            reloadPrograms();
          },
        },
      ]
    );
  };

  // Atualizar nome do dia
  const handleUpdateDayName = (newName: string) => {
    if (!currentSelectedRoutine) return;
    saveRoutine({
      ...currentSelectedRoutine,
      name: newName,
    });
    reloadPrograms();
  };

  // Reordenar exercício no dia atual (Subir ou Descer)
  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (!currentSelectedRoutine) return;
    const list = [...currentSelectedRoutine.exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Troca posições
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Atualiza orderIndex de cada item
    const updated = list.map((item, idx) => ({
      ...item,
      orderIndex: idx,
    }));

    saveRoutine({
      ...currentSelectedRoutine,
      exercises: updated,
    });
    reloadPrograms();
  };

  // Remover exercício do dia atual
  const handleDeleteExercise = (exIndex: number) => {
    if (!currentSelectedRoutine) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const updated = currentSelectedRoutine.exercises
      .filter((_, idx) => idx !== exIndex)
      .map((item, idx) => ({ ...item, orderIndex: idx }));

    saveRoutine({
      ...currentSelectedRoutine,
      exercises: updated,
    });
    reloadPrograms();
  };

  // Ajustar séries, reps ou descanso do exercício
  const handleUpdateExerciseParams = (
    exIndex: number,
    field: 'targetSets' | 'targetRepsMin' | 'targetRepsMax' | 'restSeconds',
    delta: number
  ) => {
    if (!currentSelectedRoutine) return;
    Haptics.selectionAsync().catch(() => {});

    const list = [...currentSelectedRoutine.exercises];
    const current = list[exIndex];
    if (!current) return;

    let newVal = (current[field] || 0) + delta;
    if (field === 'targetSets') newVal = Math.max(1, Math.min(10, newVal));
    if (field === 'targetRepsMin') newVal = Math.max(1, Math.min(current.targetRepsMax, newVal));
    if (field === 'targetRepsMax') newVal = Math.max(current.targetRepsMin, Math.min(50, newVal));
    if (field === 'restSeconds') newVal = Math.max(15, Math.min(300, newVal));

    list[exIndex] = {
      ...current,
      [field]: newVal,
    };

    saveRoutine({
      ...currentSelectedRoutine,
      exercises: list,
    });
    reloadPrograms();
  };

  // Adicionar exercício selecionado via AddExerciseModal
  const handleExerciseSelected = (exercise: Exercise) => {
    if (!currentSelectedRoutine) return;
    setIsAddExerciseModalOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const nextOrder = currentSelectedRoutine.exercises.length;
    const newExItem: RoutineExerciseItem = {
      id: `re_${currentSelectedRoutine.id}_${nextOrder}_${Date.now()}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetMuscle: exercise.targetMuscle,
      orderIndex: nextOrder,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: exercise.defaultRestSeconds || 90,
    };

    saveRoutine({
      ...currentSelectedRoutine,
      exercises: [...currentSelectedRoutine.exercises, newExItem],
    });
    reloadPrograms();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* ======================================================== */}
        {/* CABEÇALHO DO MODAL                                       */}
        {/* ======================================================== */}
        <View style={styles.header}>
          {editingProgramId ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setEditingProgramId(null)}
              activeOpacity={0.7}
            >
              <ChevronLeft size={20} color={Theme.colors.text} />
              <Text style={styles.backBtnText}>Fichas</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerLeft}>
              <Layers size={18} color={Theme.colors.primary} />
              <Text style={styles.headerTitle}>Gestão de Fichas</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* CORPO DO MODAL: VISÃO 1 (LISTA) OU VISÃO 2 (EDITOR)     */}
        {/* ======================================================== */}
        {!editingProgramId ? (
          /* ====================================================== */
          /* VISÃO 1: LISTAGEM DE TODAS AS FICHAS CADASTRADAS        */
          /* ====================================================== */
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.introBox}>
              <Text style={styles.introTitle}>Fichas & Divisões de Treino</Text>
              <Text style={styles.introDesc}>
                Crie variações de periodização (ex.: ciclos de força, treinos de férias) e alterne qual ficha orienta seu ciclo diário.
              </Text>
            </View>

            {/* Botão para criar nova ficha */}
            <TouchableOpacity
              style={styles.createProgramBtn}
              onPress={() => setIsNewProgramModalOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color={Theme.colors.textInverse} />
              <Text style={styles.createProgramBtnText}>Criar Nova Ficha</Text>
            </TouchableOpacity>

            {/* Listagem das Fichas */}
            <View style={styles.programsList}>
              {programs.map((program) => {
                const totalExercises = program.routines.reduce(
                  (acc, r) => acc + (r.exercises?.length || 0),
                  0
                );

                return (
                  <View
                    key={program.id}
                    style={[styles.programCard, program.isActive && styles.programCardActive]}
                  >
                    {/* Header do Card */}
                    <View style={styles.programCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.programTitleRow}>
                          <Text style={styles.programName}>{program.name}</Text>
                          {program.isActive && (
                            <View style={styles.activeBadge}>
                              <Check size={10} color={Theme.colors.textInverse} />
                              <Text style={styles.activeBadgeText}>ATIVA</Text>
                            </View>
                          )}
                        </View>
                        {program.description ? (
                          <Text style={styles.programDesc}>{program.description}</Text>
                        ) : null}
                      </View>

                      {/* Botão de Renomear */}
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => {
                          setRenameTargetId(program.id);
                          setRenameValue(program.name);
                          setIsRenameProgramModalOpen(true);
                        }}
                      >
                        <Edit2 size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Métricas da Ficha */}
                    <View style={styles.metricsRow}>
                      <View style={styles.metricItem}>
                        <Calendar size={12} color={Theme.colors.textMuted} />
                        <Text style={styles.metricText}>
                          {program.routines.length} {program.routines.length === 1 ? 'dia' : 'dias'} de treino
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Dumbbell size={12} color={Theme.colors.textMuted} />
                        <Text style={styles.metricText}>
                          {totalExercises} exercícios no total
                        </Text>
                      </View>
                    </View>

                    {/* Preview dos Dias da Ficha */}
                    <View style={styles.daysPreview}>
                      {program.routines.map((r, rIdx) => (
                        <View key={r.id || rIdx} style={styles.dayChip}>
                          <Text style={styles.dayChipTag}>{String.fromCharCode(65 + rIdx)}</Text>
                          <Text style={styles.dayChipName} numberOfLines={1}>
                            {r.name}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Barra de Ações */}
                    <View style={styles.cardActionsRow}>
                      {program.isActive ? (
                        <View style={styles.activeStatusIndicator}>
                          <CheckCircle2 size={13} color={Theme.colors.success} />
                          <Text style={styles.activeStatusText}>Ficha Ativa no Ciclo</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.makeActiveBtn}
                          onPress={() => handleToggleActive(program.id)}
                          activeOpacity={0.8}
                        >
                          <Check size={13} color={Theme.colors.text} />
                          <Text style={styles.makeActiveBtnText}>Tornar Ativa</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.cardRightBtns}>
                        <TouchableOpacity
                          style={styles.auditProgramBtn}
                          onPress={() => {
                            setAuditTargetProgram(program);
                            setIsAuditModalOpen(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Activity size={12} color={Theme.colors.primary} />
                          <Text style={styles.auditProgramBtnText}>Auditar IA</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.editProgramBtn}
                          onPress={() => {
                            setEditingProgramId(program.id);
                            setSelectedRoutineIndex(0);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.editProgramBtnText}>Editar Dias</Text>
                          <ChevronRight size={14} color={Theme.colors.text} />
                        </TouchableOpacity>

                        {programs.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteProgramBtn}
                            onPress={() => handleDeleteProgram(program)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={14} color={Theme.colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          /* ====================================================== */
          /* VISÃO 2: EDITOR DE DIAS & EXERCÍCIOS DA FICHA           */
          /* ====================================================== */
          <View style={{ flex: 1 }}>
            {currentEditingProgram && (
              <>
                {/* Cabeçalho da Ficha Selecionada */}
                <View style={styles.editorProgramHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editorProgramTitle}>{currentEditingProgram.name}</Text>
                    <Text style={styles.editorProgramSub}>
                      {currentEditingProgram.routines.length} dias cadastrados • Selecione um dia para editar
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.auditHeaderBtn}
                      onPress={() => {
                        setAuditTargetProgram(currentEditingProgram);
                        setIsAuditModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Activity size={13} color={Theme.colors.primary} />
                      <Text style={styles.auditHeaderBtnText}>Diagnóstico Biomecânico</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.addDayBtn}
                      onPress={handleAddDay}
                      activeOpacity={0.8}
                    >
                      <Plus size={13} color={Theme.colors.textInverse} />
                      <Text style={styles.addDayBtnText}>Novo Dia</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Seletor Horizontal de Dias */}
                <View style={styles.daysTabWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.daysTabScroll}
                  >
                    {currentEditingProgram.routines.map((routine, idx) => {
                      const isSelected = idx === selectedRoutineIndex;
                      return (
                        <TouchableOpacity
                          key={routine.id || idx}
                          style={[styles.dayTabChip, isSelected && styles.dayTabChipActive]}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setSelectedRoutineIndex(idx);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.dayTabChipTag,
                              isSelected && styles.dayTabChipTagActive,
                            ]}
                          >
                            {String.fromCharCode(65 + idx)}
                          </Text>
                          <Text
                            style={[
                              styles.dayTabChipText,
                              isSelected && styles.dayTabChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {routine.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Detalhes do Dia Selecionado */}
                {currentSelectedRoutine ? (
                  <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Linha de Edição do Nome do Dia & Botão de Excluir Dia */}
                    <View style={styles.dayConfigCard}>
                      <View style={styles.dayConfigHeader}>
                        <Text style={styles.dayConfigLabel}>NOME DA SESSÃO</Text>
                        {currentEditingProgram.routines.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteDayBtn}
                            onPress={() => handleDeleteDay(currentSelectedRoutine)}
                          >
                            <Trash2 size={13} color={Theme.colors.danger} />
                            <Text style={styles.deleteDayBtnText}>Excluir Dia</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TextInput
                        style={styles.dayNameInput}
                        value={currentSelectedRoutine.name}
                        onChangeText={handleUpdateDayName}
                        placeholder="Ex: Treino A (Peito e Tríceps)"
                        placeholderTextColor={Theme.colors.textMuted}
                      />
                    </View>

                    {/* Cabeçalho da Lista de Exercícios */}
                    <View style={styles.exerciseSectionHeader}>
                      <View>
                        <Text style={styles.exerciseSectionTitle}>Exercícios Escalados</Text>
                        <Text style={styles.exerciseSectionSub}>
                          {currentSelectedRoutine.exercises.length} movimentos programados para este dia
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.addExerciseBtn}
                        onPress={() => setIsAddExerciseModalOpen(true)}
                        activeOpacity={0.85}
                      >
                        <Plus size={14} color={Theme.colors.textInverse} />
                        <Text style={styles.addExerciseBtnText}>Adicionar</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Lista de Exercícios com Reordenação e Edição */}
                    {currentSelectedRoutine.exercises.length > 0 ? (
                      <View style={styles.exercisesList}>
                        {currentSelectedRoutine.exercises.map((ex, exIdx) => {
                          const isFirst = exIdx === 0;
                          const isLast = exIdx === currentSelectedRoutine.exercises.length - 1;

                          return (
                            <View key={ex.id || `${ex.exerciseId}_${exIdx}`} style={styles.exerciseCard}>
                              {/* Topo do Card de Exercício: Ordem, Nome e Ações */}
                              <View style={styles.exerciseCardTop}>
                                <View style={styles.exerciseOrderBadge}>
                                  <Text style={styles.exerciseOrderText}>{exIdx + 1}</Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Text style={styles.exerciseItemName}>{ex.exerciseName}</Text>
                                  <Text style={styles.exerciseItemMuscle}>
                                    {ex.targetMuscle.toUpperCase()}
                                  </Text>
                                </View>

                                {/* Controles de Reordenação ▲ / ▼ e Lixeira */}
                                <View style={styles.reorderControls}>
                                  <TouchableOpacity
                                    style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                                    disabled={isFirst}
                                    onPress={() => handleMoveExercise(exIdx, 'up')}
                                  >
                                    <ArrowUp
                                      size={14}
                                      color={isFirst ? Theme.colors.borderLight : Theme.colors.text}
                                    />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                                    disabled={isLast}
                                    onPress={() => handleMoveExercise(exIdx, 'down')}
                                  >
                                    <ArrowDown
                                      size={14}
                                      color={isLast ? Theme.colors.borderLight : Theme.colors.text}
                                    />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.deleteExBtn}
                                    onPress={() => handleDeleteExercise(exIdx)}
                                  >
                                    <Trash2 size={14} color={Theme.colors.danger} />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Parâmetros do Exercício: Séries, Faixa de Reps, Descanso */}
                              <View style={styles.exerciseParamsRow}>
                                {/* Ajuste de Séries */}
                                <View style={styles.paramBox}>
                                  <Text style={styles.paramLabel}>SÉRIES</Text>
                                  <View style={styles.stepperRow}>
                                    <TouchableOpacity
                                      style={styles.stepBtn}
                                      onPress={() => handleUpdateExerciseParams(exIdx, 'targetSets', -1)}
                                    >
                                      <Text style={styles.stepBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.stepValue}>{ex.targetSets}</Text>
                                    <TouchableOpacity
                                      style={styles.stepBtn}
                                      onPress={() => handleUpdateExerciseParams(exIdx, 'targetSets', 1)}
                                    >
                                      <Text style={styles.stepBtnText}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {/* Ajuste de Reps Min - Max */}
                                <View style={styles.paramBox}>
                                  <Text style={styles.paramLabel}>REPS ALVO</Text>
                                  <View style={styles.repsDisplayRow}>
                                    <TouchableOpacity
                                      style={styles.stepBtnSmall}
                                      onPress={() => handleUpdateExerciseParams(exIdx, 'targetRepsMin', -1)}
                                    >
                                      <Text style={styles.stepBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.stepValue}>
                                      {ex.targetRepsMin}-{ex.targetRepsMax}
                                    </Text>
                                    <TouchableOpacity
                                      style={styles.stepBtnSmall}
                                      onPress={() => handleUpdateExerciseParams(exIdx, 'targetRepsMax', 1)}
                                    >
                                      <Text style={styles.stepBtnText}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {/* Ajuste de Descanso */}
                                <View style={styles.paramBox}>
                                  <Text style={styles.paramLabel}>DESCANSO</Text>
                                  <View style={styles.stepperRow}>
                                    <TouchableOpacity
                                      style={styles.stepBtn}
                                      onPress={() => handleUpdateExerciseParams(exIdx, 'restSeconds', -15)}
                                    >
                                      <Text style={styles.stepBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.stepValue}>{ex.restSeconds}s</Text>
                                    <TouchableOpacity
                                      style={styles.stepBtn}
                                      onPress={() => handleUpdateExerciseParams(exIdx, 'restSeconds', 15)}
                                    >
                                      <Text style={styles.stepBtnText}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.emptyExercisesCard}>
                        <Dumbbell size={28} color={Theme.colors.textMuted} />
                        <Text style={styles.emptyExercisesTitle}>Nenhum exercício neste dia</Text>
                        <Text style={styles.emptyExercisesDesc}>
                          Toque em "+ Adicionar" acima para escalar exercícios do catálogo para este dia.
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                ) : null}
              </>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* SUBMODAL: CRIAÇÃO DE NOVA FICHA                          */}
        {/* ======================================================== */}
        <Modal
          visible={isNewProgramModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsNewProgramModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogBox}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Nova Ficha de Treino</Text>
                <TouchableOpacity onPress={() => setIsNewProgramModalOpen(false)}>
                  <X size={18} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.dialogSub}>
                Defina o nome da periodização e escolha uma estrutura inicial de dias.
              </Text>

              <Text style={styles.fieldLabel}>NOME DA FICHA</Text>
              <TextInput
                style={styles.dialogInput}
                value={newProgramName}
                onChangeText={setNewProgramName}
                placeholder="Ex: Ciclo de Força 3x, Treino de Férias"
                placeholderTextColor={Theme.colors.textMuted}
              />

              <Text style={styles.fieldLabel}>DESCRIÇÃO OU OBJETIVO (OPCIONAL)</Text>
              <TextInput
                style={styles.dialogInput}
                value={newProgramDesc}
                onChangeText={setNewProgramDesc}
                placeholder="Ex: Foco em supino e levantamento terra"
                placeholderTextColor={Theme.colors.textMuted}
              />

              <Text style={styles.fieldLabel}>ESTRUTURA INICIAL DE DIAS</Text>
              <View style={styles.templateOptions}>
                <TouchableOpacity
                  style={[styles.templateChip, selectedTemplate === 'empty' && styles.templateChipActive]}
                  onPress={() => setSelectedTemplate('empty')}
                >
                  <Text style={[styles.templateChipText, selectedTemplate === 'empty' && styles.templateChipTextActive]}>
                    2 Dias (Treino A & B)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.templateChip, selectedTemplate === 'ppl' && styles.templateChipActive]}
                  onPress={() => setSelectedTemplate('ppl')}
                >
                  <Text style={[styles.templateChipText, selectedTemplate === 'ppl' && styles.templateChipTextActive]}>
                    3 Dias (Push / Pull / Legs)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.templateChip, selectedTemplate === 'upper_lower' && styles.templateChipActive]}
                  onPress={() => setSelectedTemplate('upper_lower')}
                >
                  <Text style={[styles.templateChipText, selectedTemplate === 'upper_lower' && styles.templateChipTextActive]}>
                    2 Dias (Upper / Lower)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.templateChip, selectedTemplate === 'fullbody' && styles.templateChipActive]}
                  onPress={() => setSelectedTemplate('fullbody')}
                >
                  <Text style={[styles.templateChipText, selectedTemplate === 'fullbody' && styles.templateChipTextActive]}>
                    2 Dias (Full Body A & B)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsNewProgramModalOpen(false)}
                >
                  <Text style={styles.dialogCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogConfirmBtn}
                  onPress={handleCreateProgram}
                >
                  <Text style={styles.dialogConfirmBtnText}>Criar Ficha</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ======================================================== */}
        {/* SUBMODAL: RENOMEAR FICHA                                 */}
        {/* ======================================================== */}
        <Modal
          visible={isRenameProgramModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsRenameProgramModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogBox}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Renomear Ficha</Text>
                <TouchableOpacity onPress={() => setIsRenameProgramModalOpen(false)}>
                  <X size={18} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>NOVO NOME</Text>
              <TextInput
                style={styles.dialogInput}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Nome da ficha"
                placeholderTextColor={Theme.colors.textMuted}
                autoFocus
              />

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsRenameProgramModalOpen(false)}
                >
                  <Text style={styles.dialogCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogConfirmBtn}
                  onPress={handleSaveRename}
                >
                  <Text style={styles.dialogConfirmBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL DE ADICIONAR EXERCÍCIO AO DIA                     */}
        {/* ======================================================== */}
        <AddExerciseModal
          visible={isAddExerciseModalOpen}
          onClose={() => setIsAddExerciseModalOpen(false)}
          onSelectExercise={handleExerciseSelected}
        />

        {/* ======================================================== */}
        {/* MODAL DE DIAGNÓSTICO BIOMECÂNICO COM IA                  */}
        {/* ======================================================== */}
        <WorkoutAuditModal
          visible={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          program={auditTargetProgram}
          onApplyAction={handleApplyAuditAction}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introBox: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  introDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  createProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    marginBottom: 20,
  },
  createProgramBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
  programsList: {
    gap: 14,
  },
  programCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  programCardActive: {
    borderColor: Theme.colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  programCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  programTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  programName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.textInverse,
  },
  programDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  metricDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Theme.colors.textMuted,
  },
  daysPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dayChipTag: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  dayChipName: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    maxWidth: 120,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  activeStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeStatusText: {
    fontSize: 11,
    color: Theme.colors.success,
    fontWeight: '700',
  },
  makeActiveBtn: {
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
  makeActiveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  cardRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  auditProgramBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  editProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  editProgramBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  deleteProgramBtn: {
    padding: 6,
  },

  // Estilos da Visão 2 (Editor de Dias)
  editorProgramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  editorProgramTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  editorProgramSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  auditHeaderBtn: {
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
  auditHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  addDayBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
  daysTabWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  daysTabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dayTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dayTabChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  dayTabChipTag: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.textSecondary,
  },
  dayTabChipTagActive: {
    color: Theme.colors.textInverse,
  },
  dayTabChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    maxWidth: 130,
  },
  dayTabChipTextActive: {
    color: Theme.colors.textInverse,
  },
  dayConfigCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  dayConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayConfigLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  deleteDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteDayBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.danger,
  },
  dayNameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
    paddingVertical: 4,
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  exerciseSectionSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  addExerciseBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
  exercisesList: {
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exerciseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  exerciseOrderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  exerciseOrderText: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  exerciseItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  exerciseItemMuscle: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderBtn: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  deleteExBtn: {
    padding: 6,
    marginLeft: 4,
  },
  exerciseParamsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 10,
  },
  paramBox: {
    flex: 1,
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repsDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  stepBtnSmall: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  stepValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  emptyExercisesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 8,
  },
  emptyExercisesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  emptyExercisesDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },

  // Diálogos modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  dialogSub: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dialogInput: {
    height: 42,
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 12,
    color: Theme.colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
  },
  templateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  templateChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  templateChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  templateChipText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '700',
  },
  templateChipTextActive: {
    color: Theme.colors.textInverse,
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dialogCancelBtnText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: '700',
  },
  dialogConfirmBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Theme.borderRadius.sm,
  },
  dialogConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textInverse,
  },
});
