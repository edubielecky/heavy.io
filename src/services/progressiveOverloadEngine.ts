import { 
  Exercise, 
  ProgressiveOverloadRecommendation, 
  ExerciseSessionHistoryItem,
  OverloadDecisionType 
} from '../types/workout';
import { getExerciseById, getExerciseSessionHistory } from '../database/database';
import { SEED_EXERCISES } from '../database/seedData';

export interface OverloadAnalysisParams {
  exerciseId: string;
  targetRepsMin?: number;
  targetRepsMax?: number;
  currentWeightKg?: number;
}

/**
 * Determina o incremento seguro de peso baseado no padrão biomecânico do exercício.
 * - Membros inferiores compostos (Agachamento, Terra, Leg Press): +5.0 kg
 * - Membros superiores compostos com barra/smith (Supino, Overhead Press, Remada): +2.5 kg
 * - Halteres e compostos em máquinas/cabos: +2.0 kg
 * - Exercícios isolados e acessórios (Bíceps, Tríceps, Elevações): +1.0 kg a +2.0 kg
 */
export const getSafeIncrementKg = (exercise?: Exercise | null): number => {
  if (!exercise) return 2.5;

  const { targetMuscle, mechanic, equipment, movementPattern } = exercise;

  // 1. Membros Inferiores Compostos (Agachamentos, Terras, Leg Press, Avanços)
  const isLowerBody = ['quadriceps', 'posterior_coxa', 'gluteos'].includes(targetMuscle);
  const isCompound = mechanic === 'compound';
  const isHeavyLowerPattern = ['squat', 'hinge', 'lunge'].includes(movementPattern);

  if (isLowerBody && (isCompound || isHeavyLowerPattern)) {
    return 5.0;
  }

  // 2. Membros Superiores Compostos com Barra ou Smith (Supino Reto/Inclinado, OHP, Remada Curvada)
  const isUpperBody = ['peito', 'costas', 'ombros'].includes(targetMuscle);
  const isBarbellOrSmith = equipment === 'barbell' || equipment === 'smith';

  if (isUpperBody && isCompound && isBarbellOrSmith) {
    return 2.5;
  }

  // 3. Compostos com Halteres (ex: Supino com Halteres, Remada Serrote)
  if (isCompound && equipment === 'dumbbell') {
    return 2.0;
  }

  // 4. Isolados, Cabos e Braços/Ombros/Panturrilha
  const isIsolation = mechanic === 'isolation' || ['biceps', 'triceps', 'panturrilha', 'antebraco', 'abdomen', 'trapezio'].includes(targetMuscle);
  if (isIsolation) {
    return equipment === 'dumbbell' || equipment === 'cable' ? 2.0 : 2.5;
  }

  // Padrão de segurança
  return 2.5;
};

/**
 * Motor de Recomendação de Sobrecarga Progressiva e Consolidação:
 * Analisa as últimas 3 a 5 sessões finalizadas do exercício:
 * - Cruza volume total, repetições válidas concluídas e RIR (Repetições em Reserva)
 * - Se atingiu o teto estipulado de reps com RIR >= 2 -> Recomenda incremento seguro (+2.5kg / +5.0kg)
 * - Se o RIR foi 0 ou 1 -> Recomenda consolidação de repetições e velocidade da barra antes de adicionar carga
 */
export const calculateProgressiveOverload = (
  params: OverloadAnalysisParams
): ProgressiveOverloadRecommendation => {
  const { exerciseId, targetRepsMin, targetRepsMax } = params;

  // Busca dados do exercício (banco local ou seed)
  let exercise = getExerciseById(exerciseId);
  if (!exercise) {
    const seed = SEED_EXERCISES.find(e => e.id === exerciseId);
    if (seed) {
      exercise = { ...seed, isCustom: false };
    }
  }

  const exerciseName = exercise?.name || 'Exercício';
  const incrementKg = getSafeIncrementKg(exercise);
  const targetCeiling = targetRepsMax || 10;
  const targetFloor = targetRepsMin || 8;

  // Busca histórico das últimas 3 a 5 sessões concluídas
  const sessionHistory = getExerciseSessionHistory(exerciseId, 5);

  // Se não há sessões anteriores registradas
  if (!sessionHistory || sessionHistory.length === 0) {
    const fallbackWeight = params.currentWeightKg || 0;
    return {
      type: 'insufficient_data',
      exerciseId,
      exerciseName,
      currentWeightKg: fallbackWeight,
      incrementKg,
      suggestedWeightKg: fallbackWeight,
      targetRepsCeiling: targetCeiling,
      title: 'HISTÓRICO EM CONSTRUÇÃO',
      badgeLabel: 'CALIBRANDO',
      rationale: 'Registre o RIR (Repetições em Reserva) ao concluir suas séries para ativar as sugestões de sobrecarga progressiva.',
      sessionsAnalyzed: 0,
      recentValidSetsCount: 0,
      recentTotalVolumeKg: 0,
    };
  }

  // Analisa as sessões recentes (até 5 sessões)
  const sessionsCount = sessionHistory.length;
  const latestSession = sessionHistory[0];

  // Peso de referência da última sessão
  const latestBestWeight = latestSession.maxWeightKg || params.currentWeightKg || 0;
  const currentWeightKg = params.currentWeightKg && params.currentWeightKg > 0 
    ? params.currentWeightKg 
    : latestBestWeight;

  // Coleta dados de todas as sessões analisadas (janela de 3 a 5 sessões)
  let totalAnalyzedVolume = 0;
  let totalValidWorkingSets = 0;
  let rirValues: number[] = [];
  let reachedCeilingSetsCount = 0;

  sessionHistory.forEach(sess => {
    totalAnalyzedVolume += sess.totalVolumeKg;
    sess.sets.forEach(set => {
      if (set.completed && set.type !== 'warmup') {
        totalValidWorkingSets += 1;
        if (set.rir !== undefined && set.rir !== null) {
          rirValues.push(set.rir);
        }
        if (set.reps >= targetCeiling) {
          reachedCeilingSetsCount += 1;
        }
      }
    });
  });

  // RIR médio da última sessão e da janela como um todo
  const latestWorkingSets = latestSession.sets.filter(s => s.completed && s.type !== 'warmup');
  const latestRirValues = latestWorkingSets
    .map(s => s.rir)
    .filter((r): r is number => r !== undefined && r !== null);

  const latestAvgRir = latestRirValues.length > 0
    ? latestRirValues.reduce((a, b) => a + b, 0) / latestRirValues.length
    : undefined;

  const windowAvgRir = rirValues.length > 0
    ? rirValues.reduce((a, b) => a + b, 0) / rirValues.length
    : latestAvgRir;

  // Repetições das séries principais da última sessão
  const latestSetsReachedCeiling = latestWorkingSets.length > 0 && 
    latestWorkingSets.every(s => s.reps >= targetCeiling);

  const latestSetsReachedMin = latestWorkingSets.length > 0 &&
    latestWorkingSets.every(s => s.reps >= targetFloor);

  // RIR efetivo para tomada de decisão (prioriza última sessão com suporte da janela)
  const effectiveRir = latestAvgRir !== undefined ? latestAvgRir : windowAvgRir;

  // =========================================================================
  // TOMADA DE DECISÃO DO ALGORITMO
  // =========================================================================

  // 1. CONDIÇÃO DE PROGRESSÃO: Teto atingido com RIR >= 2
  // Atleta atinge o teto estipulado de reps com sobra técnica e velocidade (RIR >= 2)
  if (latestSetsReachedCeiling && effectiveRir !== undefined && effectiveRir >= 2.0) {
    const suggestedWeightKg = currentWeightKg + incrementKg;
    const sessionLabel = sessionsCount >= 3 
      ? `nas últimas ${sessionsCount} sessões` 
      : `na sessão mais recente`;

    return {
      type: 'increase',
      exerciseId,
      exerciseName,
      currentWeightKg,
      incrementKg,
      suggestedWeightKg,
      targetRepsCeiling: targetCeiling,
      title: 'PROGRESSÃO DE CARGA RECOMENDADA',
      badgeLabel: `+${incrementKg} KG`,
      rationale: `Teto de ${targetCeiling} reps concluído com RIR ${effectiveRir.toFixed(1)} (≥ 2) ${sessionLabel}. Reserva mecânica e velocidade comprovadas para avanço seguro de carga.`,
      actionLabel: `Progredir para ${suggestedWeightKg} kg`,
      sessionsAnalyzed: sessionsCount,
      recentAvgRir: effectiveRir,
      recentValidSetsCount: totalValidWorkingSets,
      recentTotalVolumeKg: Math.round(totalAnalyzedVolume * 10) / 10,
    };
  }

  // 2. CONDIÇÃO DE CONSOLIDAÇÃO: RIR 0 ou 1 (esforço máximo / fadiga alta)
  // Caso o RIR tenha sido 0 ou 1, o sistema recomenda a consolidação de repetições e velocidade antes de adicionar carga na barra
  if (effectiveRir !== undefined && effectiveRir <= 1.0) {
    return {
      type: 'consolidate',
      exerciseId,
      exerciseName,
      currentWeightKg,
      incrementKg,
      suggestedWeightKg: currentWeightKg,
      targetRepsCeiling: targetCeiling,
      title: 'CONSOLIDAÇÃO TÉCNICA RECOMENDADA',
      badgeLabel: 'CONSOLIDAÇÃO',
      rationale: `RIR médio recente de ${effectiveRir.toFixed(1)} indica esforço máximo (0 a 1 rep em reserva). Consolide o volume e a velocidade da barra antes de aumentar o peso.`,
      actionLabel: `Manter ${currentWeightKg} kg`,
      sessionsAnalyzed: sessionsCount,
      recentAvgRir: effectiveRir,
      recentValidSetsCount: totalValidWorkingSets,
      recentTotalVolumeKg: Math.round(totalAnalyzedVolume * 10) / 10,
    };
  }

  // 3. CONDIÇÃO DE MANUTENÇÃO: Reps ainda não atingiram o teto, mas RIR está controlado (entre 1 e 2)
  if (!latestSetsReachedCeiling) {
    const reasonText = !latestSetsReachedMin
      ? `Repetições abaixo da faixa mínima (${targetFloor} reps). Mantenha a carga de ${currentWeightKg} kg e foque na execução correta.`
      : `Na faixa intermediária (${targetFloor}-${targetCeiling} reps). Busque fechar todas as séries em ${targetCeiling} reps com RIR ≥ 2 para desbloquear a progressão.`;

    return {
      type: 'maintain',
      exerciseId,
      exerciseName,
      currentWeightKg,
      incrementKg,
      suggestedWeightKg: currentWeightKg,
      targetRepsCeiling: targetCeiling,
      title: 'MANTER CARGA E ACUMULAR REPETIÇÕES',
      badgeLabel: 'ESTABILIZAR',
      rationale: reasonText,
      actionLabel: `Manter ${currentWeightKg} kg`,
      sessionsAnalyzed: sessionsCount,
      recentAvgRir: effectiveRir,
      recentValidSetsCount: totalValidWorkingSets,
      recentTotalVolumeKg: Math.round(totalAnalyzedVolume * 10) / 10,
    };
  }

  // 4. Caso padrão / neutro (RIR não informado mas reps batidas)
  return {
    type: 'maintain',
    exerciseId,
    exerciseName,
    currentWeightKg,
    incrementKg,
    suggestedWeightKg: currentWeightKg,
    targetRepsCeiling: targetCeiling,
    title: 'MANTER E REGISTRAR RIR',
    badgeLabel: 'ESTABILIZAR',
    rationale: `Séries finalizadas em ${currentWeightKg} kg. Ao anotar o RIR das séries, o sistema calculará se você está pronto para subir +${incrementKg} kg.`,
    actionLabel: `Manter ${currentWeightKg} kg`,
    sessionsAnalyzed: sessionsCount,
    recentAvgRir: effectiveRir,
    recentValidSetsCount: totalValidWorkingSets,
    recentTotalVolumeKg: Math.round(totalAnalyzedVolume * 10) / 10,
  };
};
