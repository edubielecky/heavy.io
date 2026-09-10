import { Exercise, MuscleGroup, Equipment, MovementPattern, ExerciseMechanic } from '../types/workout';
import { SEED_EXERCISES } from '../database/seedData';
import { getExercises, createCustomExercise } from '../database/database';

export type WeeklyFrequency = 2 | 3 | 4 | 5 | 6;
export type SessionDuration = '30-45' | '45-60' | '60-90';
export type PrimaryGoal = 'hypertrophy' | 'strength' | 'conditioning';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'returning' | 'advanced';
export type EquipmentEnvironment = 'commercial' | 'condo' | 'home_dumbbells';
export type PhysicalRestriction = 'shoulders' | 'lower_back' | 'knees' | 'none';
export type BiologicalSex = 'male' | 'female';
export type MusclePriority = 'balanced' | 'chest' | 'back' | 'legs_glutes' | 'shoulders' | 'arms';

export interface GuidedInputs {
  frequency: WeeklyFrequency;
  sessionDuration: SessionDuration;
  goal: PrimaryGoal;
  experienceLevel: ExperienceLevel;
  equipment: EquipmentEnvironment;
  restrictions: PhysicalRestriction[];
  // Novos campos antropométricos e de fisiologia esportiva:
  biologicalSex?: BiologicalSex;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  musclePriority?: MusclePriority;
}

export type ExerciseTier = 
  | 'primary_compound'       // SFR alto, sobrecarga mecânica axial ou multiarticular pesada
  | 'secondary_compound'     // Composto complementar em ângulo/plano diferente
  | 'stretch_isolation'      // Isolamento em posição alongada (titina / sarcomerogênese)
  | 'peak_contraction'       // Isolamento no encurtamento / cabos / tensão contínua
  | 'isolation'              // Isolamento geral
  | 'core';

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  targetMuscle: MuscleGroup;
  movementPattern: MovementPattern;
  tier: ExerciseTier;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRir: number; // Repetições em reserva alvo (RIR 1-2 para hipertrofia com segurança neural)
  restSeconds: number;
  physiologicalRole: string; // Ex: 'Tensão Mecânica Primária', 'Alongamento Máximo sob Tensão', etc.
}

export interface PlannedSession {
  id: string;
  name: string;
  focus: string;
  dayOfWeek: string;
  exercises: PlannedExercise[];
}

export interface MuscleVolumeBreakdown {
  muscle: MuscleGroup;
  muscleLabel: string;
  weeklySets: number;
  landmark: 'MEV' | 'MAV' | 'PRIORITÁRIO';
}

export interface GeneratedPlan {
  planName: string;
  splitType: 'full_body' | 'upper_lower' | 'ul_ppl_hybrid' | 'ppl';
  description: string;
  sessions: PlannedSession[];
  weeklyDirectSetsPerMuscle: number;
  volumeBreakdown: MuscleVolumeBreakdown[];
  scientificSummary: {
    primaryStimulus: string;
    weeklyVolumeProfile: string;
    anthropometricAdaptation: string;
    recoveryRecommendation: string;
  };
  isAiGenerated?: boolean;
  aiEngine?: string;
}

/**
 * Mapeamento de exercícios com alta sobrecarga na posição alongada (Stretch-Mediated Hypertrophy)
 * Fonte: Pedrosa et al. (2022), Maeo et al. (2021), Kassiano et al. (2023)
 */
const STRETCH_MEDIATED_EXERCISE_IDS = new Set<string>([
  'seated_leg_curl_machine',
  'romanian_deadlift_barbell',
  'stiff_leg_deadlift_barbell',
  'dumbbell_romanian_deadlift',
  'cable_overhead_triceps_extension_rope',
  'dumbbell_overhead_triceps_extension_seated',
  'skull_crushers_ez_bar_incline',
  'incline_dumbbell_curl',
  'standing_calf_raise_machine',
  'leg_press_calf_raise',
  'dumbbell_bench_press',
  'incline_dumbbell_bench_press',
  'cable_fly_mid_pulley',
  'barbell_front_squat',
  'leg_press_45_degree',
  'hack_squat_machine',
  'dumbbell_bulgarian_split_squat',
  'cable_lat_pulldown_wide',
  'lat_pulldown_close_grip_v_bar',
]);

/**
 * Mapeamento de exercícios contraindicados por restrições articulares
 */
const CONTRAINDICATED_EXERCISES: Record<string, string[]> = {
  lower_back: [
    'deadlift_conventional',
    'deadlift_sumo',
    'barbell_back_squat_high_bar',
    'barbell_back_squat_low_bar',
    'good_morning_barbell',
    'smith_good_morning',
    'barbell_bent_over_row',
    'pendlay_row',
    't_bar_row_unsupported',
  ],
  shoulders: [
    'overhead_press_barbell_standing',
    'overhead_press_barbell_seated',
    'dumbbell_upright_row',
    'barbell_upright_row',
    'chest_dips',
    'parallel_bar_dips_triceps',
    'behind_the_neck_press',
  ],
  knees: [
    'leg_extension_machine',
    'single_leg_extension',
    'sissy_squat',
    'pistol_squat',
    'barbell_front_squat',
    'jump_squat',
  ],
};

/**
 * Retorna todos os exercícios do catálogo que atendem aos filtros de equipamento e restrições
 */
export const getAvailableExercises = (inputs: GuidedInputs): Exercise[] => {
  let allExercises: Exercise[] = [];
  try {
    allExercises = getExercises();
  } catch {
    allExercises = SEED_EXERCISES as Exercise[];
  }

  if (!allExercises || allExercises.length === 0) {
    allExercises = SEED_EXERCISES as Exercise[];
  }

  const contraindicatedSet = new Set<string>();
  inputs.restrictions.forEach(r => {
    if (CONTRAINDICATED_EXERCISES[r]) {
      CONTRAINDICATED_EXERCISES[r].forEach(id => contraindicatedSet.add(id));
    }
  });

  return allExercises.filter(ex => {
    if (contraindicatedSet.has(ex.id)) {
      return false;
    }

    if (inputs.equipment === 'home_dumbbells') {
      return ex.equipment === 'dumbbell' || ex.equipment === 'bodyweight';
    }

    if (inputs.equipment === 'condo') {
      return (
        ex.equipment === 'dumbbell' ||
        ex.equipment === 'barbell' ||
        ex.equipment === 'cable' ||
        ex.equipment === 'smith' ||
        ex.equipment === 'bodyweight'
      );
    }

    return true;
  });
};

/**
 * Função de hash determinística para conferir variabilidade estocástica controlada.
 * Garante que pequenas variações de biometria, idade e sexo produzam treinos únicos.
 */
function getDeterministicProfileSeed(inputs: GuidedInputs): number {
  const sexFactor = inputs.biologicalSex === 'female' ? 71 : 37;
  const ageFactor = (inputs.age || 25) * 13;
  const weightFactor = Math.round((inputs.weightKg || 75) * 19);
  const heightFactor = (inputs.heightCm || 175) * 23;
  const priorityFactor = (inputs.musclePriority?.length || 5) * 41;
  const freqFactor = inputs.frequency * 17;

  return Math.abs(sexFactor + ageFactor + weightFactor + heightFactor + priorityFactor + freqFactor);
}

/**
 * Ajusta parâmetros fisiológicos (Séries, Repetições, RIR, Descanso)
 * com base na ciência de hipertrofia, sexo biológico e tempo disponível.
 */
function getPhysiologicalParameters(
  tier: ExerciseTier,
  inputs: GuidedInputs,
  isPriorityMuscle: boolean
): { sets: number; repsMin: number; repsMax: number; rir: number; rest: number; role: string } {
  const isFemale = inputs.biologicalSex === 'female';
  const isBeginner = inputs.experienceLevel === 'beginner' || inputs.experienceLevel === 'returning';
  const isAdvanced = inputs.experienceLevel === 'advanced';
  const isShortSession = inputs.sessionDuration === '30-45';
  const isLongSession = inputs.sessionDuration === '60-90';

  // Base de Séries por Exercício
  let baseSets = 3;
  if (isPriorityMuscle && !isShortSession) {
    baseSets = 4; // Volume adaptativo maior para o grupo prioritário
  } else if (tier === 'primary_compound' && (isAdvanced || isLongSession)) {
    baseSets = 4;
  } else if (isShortSession && tier === 'isolation') {
    baseSets = 2; // Economia de tempo para manter alta intensidade de esforço
  }

  // Descanso fisiológico: mulheres recuperam estoques de PCr mais rápido (Hunter, 2014)
  const restModifier = isFemale ? 0.8 : 1.0;

  if (tier === 'primary_compound') {
    if (inputs.goal === 'strength') {
      return {
        sets: baseSets,
        repsMin: 4,
        repsMax: 6,
        rir: 2,
        rest: Math.round(150 * restModifier),
        role: 'Tensão Mecânica Primária (Recrutamento de Unidades Motoras de Alto Limiar)',
      };
    }
    return {
      sets: baseSets,
      repsMin: 6,
      repsMax: 8,
      rir: 1.5,
      rest: Math.round(120 * restModifier),
      role: 'Sobrecarga Mecânica em Posição de Vantagem Biomecânica',
    };
  }

  if (tier === 'secondary_compound') {
    return {
      sets: baseSets,
      repsMin: 8,
      repsMax: 10,
      rir: 1.5,
      rest: Math.round(90 * restModifier),
      role: 'Sobrecarga em Ângulo Complementar de Fibras Musculares',
    };
  }

  if (tier === 'stretch_isolation') {
    return {
      sets: baseSets,
      repsMin: 10,
      repsMax: 12,
      rir: 1,
      rest: Math.round(75 * restModifier),
      role: 'Hipertrofia Mediada pelo Alongamento (Titina & Tensão Passiva Elevada)',
    };
  }

  if (tier === 'peak_contraction') {
    return {
      sets: baseSets,
      repsMin: 12,
      repsMax: 15,
      rir: 1,
      rest: Math.round(60 * restModifier),
      role: 'Tensão Contínua no Encurtamento & Estresse Metabólico Controlado',
    };
  }

  if (tier === 'core') {
    return {
      sets: 3,
      repsMin: 12,
      repsMax: 20,
      rir: 1,
      rest: Math.round(60 * restModifier),
      role: 'Estabilidade do Complexo Lombo-Pélvico & Transferência de Força',
    };
  }

  // isolation padrão
  return {
    sets: baseSets,
    repsMin: 10,
    repsMax: 15,
    rir: 1,
    rest: Math.round(60 * restModifier),
    role: 'Isolamento Seletivo com Baixo Custo Neural Sistêmico',
  };
}

/**
 * Algoritmo de Scoring Biomecânico para Seleção de Exercícios
 */
function scoreExerciseCandidate(
  ex: Exercise,
  criteria: {
    targetMuscle: MuscleGroup;
    tier: ExerciseTier;
    preferredPatterns?: MovementPattern[];
    avoidIds: Set<string>;
    inputs: GuidedInputs;
    seed: number;
  }
): number {
  if (criteria.avoidIds.has(ex.id)) return -9999;
  if (ex.targetMuscle !== criteria.targetMuscle) return -9999;

  let score = 100;

  // 1. Compatibilidade com o Padrão de Movimento
  if (criteria.preferredPatterns && criteria.preferredPatterns.length > 0) {
    if (criteria.preferredPatterns.includes(ex.movementPattern)) {
      score += 40;
    } else {
      score -= 25;
    }
  }

  // 2. Adequação ao Tier
  if (criteria.tier === 'primary_compound' || criteria.tier === 'secondary_compound') {
    if (ex.mechanic === 'compound') score += 30;
    else score -= 30;
  } else if (criteria.tier === 'stretch_isolation' || criteria.tier === 'peak_contraction' || criteria.tier === 'isolation') {
    if (ex.mechanic === 'isolation') score += 25;
  }

  // 3. Hipertrofia Mediada pelo Alongamento (Pedrosa, 2022)
  if (criteria.tier === 'stretch_isolation') {
    if (STRETCH_MEDIATED_EXERCISE_IDS.has(ex.id)) {
      score += 50;
    }
  }

  // 4. Pico de Contração e Tensão Contínua
  if (criteria.tier === 'peak_contraction') {
    if (ex.equipment === 'cable' || ex.equipment === 'machine') {
      score += 35;
    }
  }

  // 5. Preferência por Sobrecarga Real em Equipamento Comercial
  // Em academia comercial ou de condomínio, calistenia no chão (flexão de braço)
  // é estritamente evitada em favor de supinos com barra, halteres e máquinas.
  if (criteria.inputs.equipment === 'commercial' || criteria.inputs.equipment === 'condo') {
    if (ex.equipment === 'bodyweight') {
      if (ex.id.includes('pushup') || ex.id.includes('push_up')) {
        score -= 250; // Veto a flexões no solo quando há banco, barra e halteres
      } else {
        score -= 40;
      }
    } else if (ex.equipment === 'barbell' || ex.equipment === 'dumbbell' || ex.equipment === 'machine') {
      score += 25; // Prioridade para sobrecarga progressiva com peso livre e máquinas
    }
  }

  // 6. Padrões Ouro da Ciência de Força para Peitoral
  if (criteria.targetMuscle === 'peito' && (criteria.tier === 'primary_compound' || criteria.tier === 'secondary_compound')) {
    if (
      ex.id === 'barbell_bench_press' ||
      ex.id === 'dumbbell_bench_press' ||
      ex.id === 'incline_dumbbell_bench_press' ||
      ex.id === 'incline_barbell_bench_press' ||
      ex.id === 'machine_chest_press' ||
      ex.id === 'incline_machine_chest_press'
    ) {
      score += 55; // Garante que supinos reais com ferro liderem a seleção
    }
  }

  // 7. Padrões Ouro da Ciência de Hipertrofia para Posteriores de Coxa
  // Hamstrings têm 2 funções: Hinge (extensão quadril) e Knee Flexion (flexão joelho)
  if (criteria.targetMuscle === 'isquiotibiais') {
    if (ex.id === 'seated_leg_curl_machine') {
      score += 50; // Superior em hipertrofia por trabalhar em maior alongamento (Maeo et al., 2021)
    } else if (
      ex.id === 'romanian_deadlift_barbell' ||
      ex.id === 'romanian_deadlift_dumbbell' ||
      ex.id === 'stiff_leg_deadlift_barbell'
    ) {
      score += 45; // Máxima tensão mecânica sob alongamento proximal
    } else if (ex.id === 'lying_leg_curl_machine') {
      score += 35;
    }
  }

  // 8. Antropometria do Atleta (Altura e Alavancas)
  const height = criteria.inputs.heightCm || 178;
  const weight = criteria.inputs.weightKg || 80;

  // Atletas altos (>182cm): evitar back squat clássico se houver hack squat ou leg press profundo
  if (height > 182) {
    if (ex.id === 'hack_squat_machine' || ex.id === 'leg_press_45_degree' || ex.id === 'dumbbell_bulgarian_split_squat') {
      score += 25; // Menor torque de cisalhamento na coluna lombar para fêmures longos
    }
    if (ex.id === 'incline_dumbbell_bench_press' || ex.id === 'dumbbell_bench_press') {
      score += 15; // Halteres permitem rotação neutra confortável para braços longos
    }
  }

  // Atletas com peso elevado (>90kg): priorizar cabos na puxada vertical antes de pull-ups com peso do corpo
  if (weight > 92 && (ex.id === 'pull_up_pronated' || ex.id === 'chin_up_supinated')) {
    score -= 20; // Risco de sobrecarga excessiva prematura no ombro
  }

  // 9. Preferências por Sexo Biológico (ênfase anatômica e alinhamento articular)
  if (criteria.inputs.biologicalSex === 'female') {
    if (ex.targetMuscle === 'gluteos' || ex.id === 'barbell_hip_thrust' || ex.id === 'dumbbell_romanian_deadlift') {
      score += 20;
    }
    if (ex.id === 'cable_lateral_raise' || ex.id === 'dumbbell_lateral_raise_standing') {
      score += 15;
    }
  }

  // 10. Modificador Pseudo-Estocástico Determinístico (Garante treino 100% individualizado)
  // Cada exercício recebe um pequeno bônus baseado no hash do perfil do atleta
  const nameHash = ex.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variance = ((nameHash * 13 + criteria.seed) % 17) - 8; // Varia entre -8 e +8
  score += variance;

  return score;
}

/**
 * Seleciona o melhor exercício baseado no scoring biomecânico
 */
function pickScientificallyOptimalExercise(
  available: Exercise[],
  criteria: {
    targetMuscle: MuscleGroup;
    tier: ExerciseTier;
    preferredPatterns?: MovementPattern[];
    avoidIds: string[];
    inputs: GuidedInputs;
    seed: number;
  }
): Exercise {
  const avoidSet = new Set(criteria.avoidIds || []);

  const scored = available
    .map(ex => ({
      ex,
      score: scoreExerciseCandidate(ex, { ...criteria, avoidIds: avoidSet }),
    }))
    .filter(item => item.score > -1000)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored[0].ex;
  }

  // Fallback 1: mesmo músculo disponível
  const fallbackMuscle = available.filter(
    e => !avoidSet.has(e.id) && e.targetMuscle === criteria.targetMuscle
  );
  if (fallbackMuscle.length > 0) return fallbackMuscle[0];

  // Fallback 2: qualquer disponível não utilizado
  const fallbackAny = available.find(e => !avoidSet.has(e.id));
  if (fallbackAny) return fallbackAny;

  return available[0];
}

/**
 * Retorna os nomes dos músculos em português para os relatórios
 */
const MUSCLE_NAMES_PT: Record<MuscleGroup, string> = {
  peito: 'Peitoral',
  costas: 'Dorsais & Costas',
  quadriceps: 'Quadríceps',
  isquiotibiais: 'Posteriores de Coxa',
  gluteos: 'Glúteos',
  ombros: 'Deltoides',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antibraco: 'Antebraço',
  panturrilhas: 'Panturrilhas',
  abdomen: 'Abdômen / Core',
  lombar: 'Lombar & Eretor',
  trapezio: 'Trapézio',
};

/**
 * MOTOR DE RECOMENDAÇÃO CIENTÍFICA (Scientific Hypertrophy Recommendation Engine v2)
 */
export const generateGuidedRoutine = (inputs: GuidedInputs): GeneratedPlan => {
  const available = getAvailableExercises(inputs);
  const usedExerciseIds: string[] = [];
  const profileSeed = getDeterministicProfileSeed(inputs);

  // Normalização de inputs
  const effectiveInputs: GuidedInputs = {
    frequency: inputs.frequency || 4,
    sessionDuration: inputs.sessionDuration || '45-60',
    goal: inputs.goal || 'hypertrophy',
    experienceLevel: inputs.experienceLevel || 'intermediate',
    equipment: inputs.equipment || 'commercial',
    restrictions: inputs.restrictions || ['none'],
    biologicalSex: inputs.biologicalSex || 'male',
    age: inputs.age || 26,
    weightKg: inputs.weightKg || 78,
    heightCm: inputs.heightCm || 176,
    musclePriority: inputs.musclePriority || 'balanced',
  };

  // Quantidade de exercícios por sessão de acordo com a duração
  const exCount = 
    effectiveInputs.sessionDuration === '30-45' ? 4 : 
    effectiveInputs.sessionDuration === '45-60' ? 5 : 6;

  // Determinação se o grupo muscular é prioritário
  const isMusclePriority = (muscle: MuscleGroup): boolean => {
    if (effectiveInputs.musclePriority === 'chest') return muscle === 'peito';
    if (effectiveInputs.musclePriority === 'back') return muscle === 'costas';
    if (effectiveInputs.musclePriority === 'legs_glutes') return muscle === 'quadriceps' || muscle === 'isquiotibiais' || muscle === 'gluteos';
    if (effectiveInputs.musclePriority === 'shoulders') return muscle === 'ombros';
    if (effectiveInputs.musclePriority === 'arms') return muscle === 'biceps' || muscle === 'triceps';
    return false;
  };

  const createPlannedEx = (
    muscle: MuscleGroup,
    tier: ExerciseTier,
    preferredPatterns?: MovementPattern[]
  ): PlannedExercise => {
    const isPriority = isMusclePriority(muscle);
    const ex = pickScientificallyOptimalExercise(available, {
      targetMuscle: muscle,
      tier,
      preferredPatterns,
      avoidIds: usedExerciseIds,
      inputs: effectiveInputs,
      seed: profileSeed + usedExerciseIds.length * 7,
    });

    usedExerciseIds.push(ex.id);
    const params = getPhysiologicalParameters(tier, effectiveInputs, isPriority);

    return {
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetMuscle: ex.targetMuscle,
      movementPattern: ex.movementPattern,
      tier,
      targetSets: params.sets,
      targetRepsMin: params.repsMin,
      targetRepsMax: params.repsMax,
      targetRir: params.rir,
      restSeconds: params.rest,
      physiologicalRole: params.role,
    };
  };

  let splitType: 'full_body' | 'upper_lower' | 'ul_ppl_hybrid' | 'ppl';
  let planTitle = '';
  let sessions: PlannedSession[] = [];

  // =========================================================================
  // 1. FREQUÊNCIA 2 ou 3 DIAS: FULL BODY BIOMECÂNICO
  // =========================================================================
  if (effectiveInputs.frequency === 2 || effectiveInputs.frequency === 3) {
    splitType = 'full_body';
    planTitle = `Full Body Científico ${effectiveInputs.frequency}x: Alta Densidade de Tensão`;

    // Treino A (Foco Cadeia Anterior, Hinge & Empurrar)
    const exA: PlannedExercise[] = [];
    exA.push(createPlannedEx('quadriceps', 'primary_compound', ['squat', 'lunge']));
    exA.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push']));
    exA.push(createPlannedEx('costas', 'secondary_compound', ['horizontal_pull', 'vertical_pull']));
    exA.push(createPlannedEx('isquiotibiais', 'primary_compound', ['hinge'])); // Extensão de quadril (RDL/Stiff)
    if (exCount >= 5) exA.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Flexão de joelho (Cadeira Flexora)
    if (exCount >= 6) exA.push(createPlannedEx('ombros', 'peak_contraction', ['isolation']));

    // Treino B (Foco Cadeia Posterior, Flexão de Joelho & Puxar)
    const exB: PlannedExercise[] = [];
    exB.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Flexão de joelho isolada
    exB.push(createPlannedEx('peito', 'secondary_compound', ['horizontal_push'])); // Supino Inclinado com Halteres
    exB.push(createPlannedEx('costas', 'primary_compound', ['vertical_pull', 'horizontal_pull']));
    exB.push(createPlannedEx('quadriceps', 'stretch_isolation', ['squat', 'lunge', 'isolation']));
    if (exCount >= 5) exB.push(createPlannedEx('isquiotibiais', 'secondary_compound', ['hinge'])); // Stiff ou RDL
    if (exCount >= 6) exB.push(createPlannedEx('triceps', 'stretch_isolation', ['isolation']));

    sessions = [
      {
        id: 'guided_fb_a',
        name: 'Treino A - Full Body (Tensão Mecânica & Cadeia Anterior)',
        focus: 'Quadríceps, Peitoral, Dorsais & Isquiotibiais',
        dayOfWeek: 'Segunda-feira',
        exercises: exA,
      },
      {
        id: 'guided_fb_b',
        name: 'Treino B - Full Body (Alongamento & Cadeia Posterior)',
        focus: 'Isquiotibiais, Peito Inclinado, Costas & Ombros',
        dayOfWeek: effectiveInputs.frequency === 2 ? 'Quinta-feira' : 'Quarta-feira',
        exercises: exB,
      },
    ];

    if (effectiveInputs.frequency === 3) {
      // Treino C (Foco Equilíbrio Hipertrófico & Acessórios)
      const exC: PlannedExercise[] = [];
      exC.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push']));
      exC.push(createPlannedEx('costas', 'secondary_compound', ['horizontal_pull']));
      exC.push(createPlannedEx('quadriceps', 'primary_compound', ['squat', 'lunge']));
      exC.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora Sentada
      if (exCount >= 5) exC.push(createPlannedEx('ombros', 'stretch_isolation', ['isolation']));
      if (exCount >= 6) exC.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));

      sessions.push({
        id: 'guided_fb_c',
        name: 'Treino C - Full Body (Volume Efetivo & Sinergistas)',
        focus: 'Peito, Dorsais, Pernas & Posteriores',
        dayOfWeek: 'Sexta-feira',
        exercises: exC,
      });
    }
  }

  // =========================================================================
  // 2. FREQUÊNCIA 4 DIAS: UPPER / LOWER (2x na semana - Frequência Ótima)
  // =========================================================================
  else if (effectiveInputs.frequency === 4) {
    splitType = 'upper_lower';
    planTitle = 'Upper / Lower 4x: Frequência Ótima & Estímulo-Fadiga Calibrado';

    // Upper A (Força Mecânica Primária)
    const exUA: PlannedExercise[] = [];
    exUA.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push'])); // Supino Reto com Barra/Halteres
    exUA.push(createPlannedEx('costas', 'primary_compound', ['horizontal_pull'])); // Remada Pesada
    exUA.push(createPlannedEx('ombros', 'secondary_compound', ['vertical_push'])); // Desenvolvimento
    exUA.push(createPlannedEx('costas', 'secondary_compound', ['vertical_pull'])); // Puxada Alta
    if (exCount >= 5) exUA.push(createPlannedEx('peito', 'secondary_compound', ['horizontal_push'])); // Supino Inclinado Halteres
    if (exCount >= 6) exUA.push(createPlannedEx('triceps', 'stretch_isolation', ['isolation']));

    // Lower A (Sobrecarga de Joelho & Hinge de Quadril)
    const exLA: PlannedExercise[] = [];
    exLA.push(createPlannedEx('quadriceps', 'primary_compound', ['squat'])); // Agachamento / Leg Press
    exLA.push(createPlannedEx('isquiotibiais', 'primary_compound', ['hinge'])); // RDL com Barra / Halteres
    exLA.push(createPlannedEx('quadriceps', 'secondary_compound', ['lunge', 'squat'])); // Búlgaro / Passada
    exLA.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora Sentada (Maeo 2021)
    if (exCount >= 5) exLA.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));
    if (exCount >= 6) exLA.push(createPlannedEx('abdomen', 'core', ['core_anti_extension', 'core_rotation']));

    // Upper B (Alongamento & Volume Hipertrófico)
    const exUB: PlannedExercise[] = [];
    exUB.push(createPlannedEx('costas', 'primary_compound', ['vertical_pull'])); // Puxada Articulada
    exUB.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push'])); // Supino Inclinado com Barra/Halteres
    exUB.push(createPlannedEx('costas', 'secondary_compound', ['horizontal_pull'])); // Remada Baixa
    exUB.push(createPlannedEx('peito', 'peak_contraction', ['isolation'])); // Crossover na Polia / Crucifixo
    if (exCount >= 5) exUB.push(createPlannedEx('ombros', 'peak_contraction', ['isolation'])); // Elevação Lateral
    if (exCount >= 6) exUB.push(createPlannedEx('biceps', 'stretch_isolation', ['isolation']));

    // Lower B (Alongamento Muscular & Flexão de Joelho)
    const exLB: PlannedExercise[] = [];
    exLB.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora Sentada
    exLB.push(createPlannedEx('quadriceps', 'stretch_isolation', ['squat', 'lunge'])); // Hack Squat / Leg Press 45
    exLB.push(createPlannedEx('isquiotibiais', 'secondary_compound', ['hinge'])); // Stiff com Barra / Halteres
    exLB.push(createPlannedEx('quadriceps', 'peak_contraction', ['isolation'])); // Cadeira Extensora
    if (exCount >= 5) exLB.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));
    if (exCount >= 6) exLB.push(createPlannedEx('gluteos', 'stretch_isolation', ['hinge'])); // Elevação Pélvica

    sessions = [
      { id: 'guided_ul_ua', name: 'Treino A - Superiores (Tensão Mecânica Primária)', focus: 'Peitoral, Dorsais & Deltóides', dayOfWeek: 'Segunda-feira', exercises: exUA },
      { id: 'guided_ul_la', name: 'Treino B - Inferiores (Força & Sobrecarga de Quadril)', focus: 'Quadríceps, Isquiotibiais (RDL + Flexora) & Panturrilhas', dayOfWeek: 'Terça-feira', exercises: exLA },
      { id: 'guided_ul_ub', name: 'Treino C - Superiores (Hipertrofia & Posição Alongada)', focus: 'Peito Inclinado, Dorsais & Crossover', dayOfWeek: 'Quinta-feira', exercises: exUB },
      { id: 'guided_ul_lb', name: 'Treino D - Inferiores (Alongamento Muscular & Glúteos)', focus: 'Isquiotibiais (Flexora + Stiff), Quadríceps & Glúteos', dayOfWeek: 'Sexta-feira', exercises: exLB },
    ];
  }

  // =========================================================================
  // 3. FREQUÊNCIA 5 DIAS: UPPER / LOWER + PPL HÍBRIDO (Periodização Alta)
  // =========================================================================
  else if (effectiveInputs.frequency === 5) {
    splitType = 'ul_ppl_hybrid';
    planTitle = 'Estrutura Híbrida 5x: Alta Frequência & Máximo Volume Recuperável';

    // Dia 1: Upper Força
    const s1: PlannedExercise[] = [];
    s1.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push']));
    s1.push(createPlannedEx('costas', 'primary_compound', ['horizontal_pull']));
    s1.push(createPlannedEx('ombros', 'secondary_compound', ['vertical_push']));
    s1.push(createPlannedEx('peito', 'secondary_compound', ['horizontal_push']));
    if (exCount >= 5) s1.push(createPlannedEx('costas', 'secondary_compound', ['vertical_pull']));
    if (exCount >= 6) s1.push(createPlannedEx('triceps', 'stretch_isolation', ['isolation']));

    // Dia 2: Lower Força
    const s2: PlannedExercise[] = [];
    s2.push(createPlannedEx('quadriceps', 'primary_compound', ['squat']));
    s2.push(createPlannedEx('isquiotibiais', 'primary_compound', ['hinge'])); // RDL
    s2.push(createPlannedEx('quadriceps', 'secondary_compound', ['lunge', 'squat']));
    s2.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora
    if (exCount >= 5) s2.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));
    if (exCount >= 6) s2.push(createPlannedEx('abdomen', 'core', ['core_anti_extension']));

    // Dia 3: Push Hipertrofia (Alongamento & Feixes)
    const s3: PlannedExercise[] = [];
    s3.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push'])); // Supino Inclinado com Halteres
    s3.push(createPlannedEx('ombros', 'secondary_compound', ['vertical_push']));
    s3.push(createPlannedEx('peito', 'peak_contraction', ['isolation'])); // Crossover Polia
    s3.push(createPlannedEx('ombros', 'stretch_isolation', ['isolation']));
    if (exCount >= 5) s3.push(createPlannedEx('triceps', 'stretch_isolation', ['isolation']));
    if (exCount >= 6) s3.push(createPlannedEx('triceps', 'peak_contraction', ['isolation']));

    // Dia 4: Pull Hipertrofia
    const s4: PlannedExercise[] = [];
    s4.push(createPlannedEx('costas', 'primary_compound', ['vertical_pull']));
    s4.push(createPlannedEx('costas', 'secondary_compound', ['horizontal_pull']));
    s4.push(createPlannedEx('trapezio', 'stretch_isolation', ['isolation']));
    s4.push(createPlannedEx('biceps', 'stretch_isolation', ['isolation']));
    if (exCount >= 5) s4.push(createPlannedEx('costas', 'peak_contraction', ['isolation']));
    if (exCount >= 6) s4.push(createPlannedEx('biceps', 'peak_contraction', ['isolation']));

    // Dia 5: Legs Hipertrofia & Detalhe
    const s5: PlannedExercise[] = [];
    s5.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora
    s5.push(createPlannedEx('quadriceps', 'stretch_isolation', ['squat', 'lunge'])); // Hack / Leg Press
    s5.push(createPlannedEx('isquiotibiais', 'secondary_compound', ['hinge'])); // Stiff
    s5.push(createPlannedEx('quadriceps', 'peak_contraction', ['isolation'])); // Cadeira Extensora
    if (exCount >= 5) s5.push(createPlannedEx('gluteos', 'stretch_isolation', ['hinge']));
    if (exCount >= 6) s5.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));

    sessions = [
      { id: 'guided_h5_u', name: 'Treino A - Superiores (Foco Força & Tensão)', focus: 'Peitoral, Costas & Ombros', dayOfWeek: 'Segunda-feira', exercises: s1 },
      { id: 'guided_h5_l', name: 'Treino B - Inferiores (Força de Agachamento & Hinge)', focus: 'Quadríceps & Isquiotibiais (RDL + Flexora)', dayOfWeek: 'Terça-feira', exercises: s2 },
      { id: 'guided_h5_push', name: 'Treino C - Push (Hipertrofia em Posição Alongada)', focus: 'Peitoral Inclinado, Deltoides & Tríceps', dayOfWeek: 'Quinta-feira', exercises: s3 },
      { id: 'guided_h5_pull', name: 'Treino D - Pull (Hipertrofia de Dorsais & Trapézio)', focus: 'Dorsais, Trapézio & Bíceps', dayOfWeek: 'Sexta-feira', exercises: s4 },
      { id: 'guided_h5_legs', name: 'Treino E - Legs (Estresse Metabólico & Volume)', focus: 'Isquiotibiais (Flexora + Stiff), Quads & Panturrilhas', dayOfWeek: 'Sábado', exercises: s5 },
    ];
  }

  // =========================================================================
  // 4. FREQUÊNCIA 6 DIAS: PUSH / PULL / LEGS 2x (Alta Especificidade)
  // =========================================================================
  else {
    splitType = 'ppl';
    planTitle = 'Push / Pull / Legs (2x) 6 Dias: Periodização Avançada por Fibras';

    const makePush = (letter: string, day: string, isA: boolean): PlannedSession => {
      const exList: PlannedExercise[] = [];
      if (isA) {
        exList.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push'])); // Supino Reto Barra/Halteres
        exList.push(createPlannedEx('ombros', 'secondary_compound', ['vertical_push'])); // Desenvolvimento
        exList.push(createPlannedEx('peito', 'secondary_compound', ['horizontal_push'])); // Supino Inclinado
        exList.push(createPlannedEx('triceps', 'stretch_isolation', ['isolation']));
        if (exCount >= 5) exList.push(createPlannedEx('ombros', 'stretch_isolation', ['isolation']));
        if (exCount >= 6) exList.push(createPlannedEx('triceps', 'peak_contraction', ['isolation']));
      } else {
        exList.push(createPlannedEx('peito', 'primary_compound', ['horizontal_push'])); // Supino Inclinado com Halteres
        exList.push(createPlannedEx('peito', 'peak_contraction', ['isolation'])); // Crossover na Polia
        exList.push(createPlannedEx('ombros', 'stretch_isolation', ['isolation'])); // Elevação Lateral
        exList.push(createPlannedEx('triceps', 'peak_contraction', ['isolation']));
        if (exCount >= 5) exList.push(createPlannedEx('ombros', 'secondary_compound', ['vertical_push']));
        if (exCount >= 6) exList.push(createPlannedEx('triceps', 'stretch_isolation', ['isolation']));
      }

      return {
        id: `guided_ppl_push_${letter.toLowerCase()}`,
        name: `Treino ${letter} - Push (${isA ? 'Força & Tensão' : 'Alongamento & Volume'})`,
        focus: 'Peitoral, Deltoide Anterior/Lateral & Tríceps',
        dayOfWeek: day,
        exercises: exList,
      };
    };

    const makePull = (letter: string, day: string, isA: boolean): PlannedSession => {
      const exList: PlannedExercise[] = [];
      if (isA) {
        exList.push(createPlannedEx('costas', 'primary_compound', ['vertical_pull']));
        exList.push(createPlannedEx('costas', 'secondary_compound', ['horizontal_pull']));
        exList.push(createPlannedEx('trapezio', 'stretch_isolation', ['isolation']));
        exList.push(createPlannedEx('biceps', 'stretch_isolation', ['isolation']));
        if (exCount >= 5) exList.push(createPlannedEx('costas', 'peak_contraction', ['isolation']));
        if (exCount >= 6) exList.push(createPlannedEx('biceps', 'peak_contraction', ['isolation']));
      } else {
        exList.push(createPlannedEx('costas', 'primary_compound', ['horizontal_pull']));
        exList.push(createPlannedEx('costas', 'secondary_compound', ['vertical_pull']));
        exList.push(createPlannedEx('ombros', 'peak_contraction', ['isolation']));
        exList.push(createPlannedEx('biceps', 'stretch_isolation', ['isolation']));
        if (exCount >= 5) exList.push(createPlannedEx('trapezio', 'peak_contraction', ['isolation']));
        if (exCount >= 6) exList.push(createPlannedEx('biceps', 'stretch_isolation', ['isolation']));
      }

      return {
        id: `guided_ppl_pull_${letter.toLowerCase()}`,
        name: `Treino ${letter} - Pull (${isA ? 'Dorsais & Densidade' : 'Remadas & Posição Alongada'})`,
        focus: 'Grande Dorsal, Rombóides, Trapézio & Bíceps',
        dayOfWeek: day,
        exercises: exList,
      };
    };

    const makeLegs = (letter: string, day: string, isA: boolean): PlannedSession => {
      const exList: PlannedExercise[] = [];
      if (isA) {
        exList.push(createPlannedEx('quadriceps', 'primary_compound', ['squat', 'lunge'])); // Agachamento / Leg Press
        exList.push(createPlannedEx('isquiotibiais', 'primary_compound', ['hinge'])); // RDL
        exList.push(createPlannedEx('quadriceps', 'secondary_compound', ['lunge', 'squat'])); // Búlgaro
        exList.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora Sentada
        if (exCount >= 5) exList.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));
        if (exCount >= 6) exList.push(createPlannedEx('abdomen', 'core', ['core_anti_extension']));
      } else {
        exList.push(createPlannedEx('isquiotibiais', 'stretch_isolation', ['isolation'])); // Cadeira Flexora
        exList.push(createPlannedEx('quadriceps', 'stretch_isolation', ['squat', 'lunge'])); // Hack Squat
        exList.push(createPlannedEx('isquiotibiais', 'secondary_compound', ['hinge'])); // Stiff com Barra/Halteres
        exList.push(createPlannedEx('quadriceps', 'peak_contraction', ['isolation'])); // Cadeira Extensora
        if (exCount >= 5) exList.push(createPlannedEx('panturrilhas', 'stretch_isolation', ['calf_raise']));
        if (exCount >= 6) exList.push(createPlannedEx('gluteos', 'stretch_isolation', ['hinge']));
      }

      return {
        id: `guided_ppl_legs_${letter.toLowerCase()}`,
        name: `Treino ${letter} - Legs (${isA ? 'Foco Joelho/Quadríceps' : 'Foco Quadril/Posterior'})`,
        focus: 'Quadríceps, Isquiotibiais (RDL + Flexora), Glúteos & Panturrilhas',
        dayOfWeek: day,
        exercises: exList,
      };
    };

    sessions = [
      makePush('A', 'Segunda-feira', true),
      makePull('B', 'Terça-feira', true),
      makeLegs('C', 'Quarta-feira', true),
      makePush('D', 'Quinta-feira', false),
      makePull('E', 'Sexta-feira', false),
      makeLegs('F', 'Sábado', false),
    ];
  }

  // =========================================================================
  // CÁLCULO DE MARCOS DE VOLUME SEMANAL POR GRUPO MUSCULAR (MEV / MAV / MRV)
  // =========================================================================
  const muscleSetTotals: Partial<Record<MuscleGroup, number>> = {};
  sessions.forEach(sess => {
    sess.exercises.forEach(ex => {
      muscleSetTotals[ex.targetMuscle] = (muscleSetTotals[ex.targetMuscle] || 0) + ex.targetSets;
    });
  });

  const volumeBreakdown: MuscleVolumeBreakdown[] = Object.entries(muscleSetTotals)
    .filter(([_, sets]) => sets && sets > 0)
    .map(([muscleKey, sets]) => {
      const muscle = muscleKey as MuscleGroup;
      const isPriority = isMusclePriority(muscle);
      let landmark: 'MEV' | 'MAV' | 'PRIORITÁRIO' = 'MAV';

      if (isPriority) {
        landmark = 'PRIORITÁRIO';
      } else if (sets! < 10) {
        landmark = 'MEV';
      } else {
        landmark = 'MAV';
      }

      return {
        muscle,
        muscleLabel: MUSCLE_NAMES_PT[muscle] || muscle,
        weeklySets: sets!,
        landmark,
      };
    })
    .sort((a, b) => b.weeklySets - a.weeklySets);

  const totalWeeklySets = Object.values(muscleSetTotals).reduce((acc, curr) => (acc || 0) + (curr || 0), 0) || 0;
  const avgDirectSets = Math.round(totalWeeklySets / Math.max(1, volumeBreakdown.length));

  // Síntese Científica Personalizada
  const sexLabel = effectiveInputs.biologicalSex === 'female' ? 'Feminino' : 'Masculino';
  const priorityName = effectiveInputs.musclePriority === 'balanced' ? 'Equilibrado' :
    effectiveInputs.musclePriority === 'chest' ? 'Peitoral' :
    effectiveInputs.musclePriority === 'back' ? 'Costas/Dorsais' :
    effectiveInputs.musclePriority === 'legs_glutes' ? 'Pernas & Glúteos' :
    effectiveInputs.musclePriority === 'shoulders' ? 'Deltoides' : 'Braços';

  const scientificSummary = {
    primaryStimulus: `Tensão Mecânica Primária (RIR 1–2) com ênfase em Hipertrofia Mediada pelo Alongamento (Stretch-Mediated)`,
    weeklyVolumeProfile: `Volume Real Efetivo: ~${totalWeeklySets} séries semanais totais calibradas para MAV (Volume Máximo Adaptativo) e foco em ${priorityName}`,
    anthropometricAdaptation: `Calibrado para ${sexLabel}, ${effectiveInputs.heightCm}cm, ${effectiveInputs.weightKg}kg e alavancas biomecânicas personalizadas`,
    recoveryRecommendation: `Frequência de 2x/semana por agrupamento com descanso inter-série otimizado para restauração neural e de fosfocreatina`,
  };

  const description = `Periodização científica para ${effectiveInputs.frequency} dias/semana (${effectiveInputs.sessionDuration} min/sessão). ${scientificSummary.weeklyVolumeProfile}. Biomecânica calibrada para ${sexLabel}, ${effectiveInputs.age} anos.`;

  return {
    planName: planTitle,
    splitType,
    description,
    sessions,
    weeklyDirectSetsPerMuscle: avgDirectSets,
    volumeBreakdown,
    scientificSummary,
    isAiGenerated: false,
    aiEngine: 'motor_cinematico_local',
  };
};

/**
 * Prescrição de Treinos Baseada em Inteligência Artificial (Gemini 3.6 Flash)
 * e Fisiologia do Exercício de Alta Performance.
 * 
 * Envia o perfil antropométrico detalhado do atleta e o catálogo completo de exercícios
 * disponíveis (filtrados por restrições e equipamentos), instruindo o modelo a prescrever
 * uma periodização personalizada fundamentada em:
 * 1. Simão et al. (2012) - Ordem de exercícios com prioridade no primeiro terço da sessão;
 * 2. Maeo et al. (2021) / Pedrosa et al. (2022) - Hipertrofia sob alongamento mecânico;
 * 3. Alavancas articulares e braço de momento antropométrico individual;
 * 4. Recuperação e tolerância volumétrica por sexo biológico (Hunter, 2014);
 * 5. Gestão de estresse axial e marcos MAV de volume.
 * 
 * Caso ocorra falha de rede, timeout ou ausência de chave, recorre transparentemente
 * ao motor cinemático local (offline-first).
 */
/**
 * Helper para geração de slugs seguros para IDs de exercícios criados dinamicamente
 */
function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Resolve o exercício do catálogo correspondente ao retorno do LLM com tolerância a abreviações.
 * Retorna null caso o exercício seja uma variação nova que deva ser registrada.
 */
function resolveAiExerciseMatch(
  rawId: string | undefined,
  rawName: string | undefined,
  targetMuscle: MuscleGroup | undefined,
  available: Exercise[],
  exerciseMap: Map<string, Exercise>
): Exercise | null {
  if (rawId && exerciseMap.has(rawId)) {
    return exerciseMap.get(rawId)!;
  }

  const cleanRawId = String(rawId || '').toLowerCase().replace(/[^a-z0-9]/g, '_');

  // 1. Busca exata case-insensitive por ID
  if (cleanRawId.length > 2) {
    const exactCase = available.find(e => e.id.toLowerCase() === cleanRawId);
    if (exactCase) return exactCase;
  }

  // 2. Busca por nome (PT ou EN)
  if (rawName && rawName.trim().length > 2) {
    const cleanName = rawName.toLowerCase().trim();
    const byName = available.find(
      e => e.name.toLowerCase() === cleanName ||
           (e.nameEn && e.nameEn.toLowerCase() === cleanName)
    );
    if (byName) return byName;
  }

  // 3. Busca por tokens inteligentes
  const searchString = `${cleanRawId} ${String(rawName || '').toLowerCase()}`;
  const tokens = searchString.split(/[\s_]+/).filter(t => t.length > 2);
  const normalizedTokens = tokens.map(t => {
    if (t === 'db') return 'dumbbell';
    if (t === 'bb') return 'barbell';
    if (t === 'ohp') return 'overhead_press';
    if (t === 'rdl') return 'romanian_deadlift';
    return t;
  });

  let bestMatch: Exercise | null = null;
  let maxScore = -1;

  for (const ex of available) {
    let score = 0;
    const exId = ex.id.toLowerCase();
    const exName = ex.name.toLowerCase();

    normalizedTokens.forEach(t => {
      if (exId.includes(t)) score += 2;
      else if (exName.includes(t)) score += 1;
    });

    if (targetMuscle && ex.targetMuscle === targetMuscle) {
      score += 2;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = ex;
    }
  }

  if (bestMatch && maxScore >= 4) {
    return bestMatch;
  }

  return null;
}

export async function generateAiGuidedRoutine(
  inputs: GuidedInputs,
  options?: { apiKey?: string; timeoutMs?: number }
): Promise<GeneratedPlan> {
  const available = getAvailableExercises(inputs);
  const apiKey = options?.apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0 || !available || available.length === 0) {
    return generateGuidedRoutine(inputs);
  }

  const effectiveInputs: GuidedInputs = {
    frequency: inputs.frequency || 4,
    sessionDuration: inputs.sessionDuration || '45-60',
    goal: inputs.goal || 'hypertrophy',
    experienceLevel: inputs.experienceLevel || 'intermediate',
    equipment: inputs.equipment || 'commercial',
    restrictions: inputs.restrictions || ['none'],
    biologicalSex: inputs.biologicalSex || 'male',
    age: inputs.age || 26,
    weightKg: inputs.weightKg || 78,
    heightCm: inputs.heightCm || 176,
    musclePriority: inputs.musclePriority || 'balanced',
  };

  const athleteWeight = effectiveInputs.weightKg || 78;
  const athleteHeight = effectiveInputs.heightCm || 176;
  const bmi = (athleteWeight / Math.pow(athleteHeight / 100, 2)).toFixed(1);

  // Análise de Alavancas Biomecânicas
  const isTall = (effectiveInputs.heightCm || 176) > 182;
  const isCompact = (effectiveInputs.heightCm || 176) < 172;

  const leverAnalysis = isTall
    ? 'Membros longos com maiores braços de momento no fêmur e na coluna. Alto torque de cisalhamento lombo-pélvico em agachamento livre e levantamentos terra convencionais; priorizar variações com apoio torácico, Hack Squat/Leg Press e supinos com halteres com liberdade glenoumeral.'
    : isCompact
    ? 'Estatura compacta com braços de momento curtos e vantagem mecânica na coluna. Excelente alinhamento para agachamentos livres com barra e movimentos multiarticulares pesados de alta tensão mecânica.'
    : 'Antropometria proporcional com alavancas neutras e boa distribuição de torque articular.';

  const sexPhysiology = effectiveInputs.biologicalSex === 'female'
    ? 'Sexo Biológico Feminino: maior percentual relativo de fibras musculares Tipo I, regeneração acelerada de fosfocreatina (PCr) permitindo descansos ligeiramente mais curtos, maior tolerância volumétrica para membros inferiores (glúteos/isquiotibiais) e deltoides.'
    : 'Sexo Biológico Masculino: maior predomínio de fibras Tipo II e maior capacidade de recrutamento de unidades motoras de alto limiar, exigindo intervalos de descanso completos (120-180s) em compostos pesados para restauração do sistema ATP-CP.';

  const agePhysiology = (effectiveInputs.age || 26) >= 35
    ? `Idade: ${effectiveInputs.age} anos. Taxa de remodelamento de colágeno e tendões requer maior foco na relação estímulo-fadiga (SFR) e aquecimento progressivo, evitando múltiplos compostos de alta compressão axial na mesma sessão.`
    : `Idade: ${effectiveInputs.age} anos. Pico de capacidade regenerativa tecidual e tolerância adaptativa a volume.`;

  const priorityLabel = 
    effectiveInputs.musclePriority === 'chest' ? 'Peitoral (Foco em Porção Clavicular & Esternal)' :
    effectiveInputs.musclePriority === 'back' ? 'Costas & Dorsais (Foco em Largura de Latíssimo e Densidade Escapular)' :
    effectiveInputs.musclePriority === 'legs_glutes' ? 'Pernas & Glúteos (Foco em Cadeia Posterior, Isquiotibiais e Glúteo Máximo)' :
    effectiveInputs.musclePriority === 'shoulders' ? 'Deltoides (Foco em Cabeça Lateral e Posterior para silhueta em V)' :
    effectiveInputs.musclePriority === 'arms' ? 'Braços (Foco em Bíceps Braquial e Cabeça Longa do Tríceps)' : 'Equilíbrio Fisiológico Harmonioso (Sem viés de especialização)';

  const equipmentDesc = effectiveInputs.equipment === 'commercial'
    ? 'Academia Comercial Completa (Acesso a barras olímpicas, halteres de até 50kg, bancos ajustáveis, polias e crossover articulados, máquinas guiadas, Smith, Hack Squat, Leg Press e flexoras/extensoras).'
    : effectiveInputs.equipment === 'condo'
    ? 'Academia de Condomínio (Halteres até 24kg, banco regulável, polia multifuncional/cabo, Smith machine e barra fixa).'
    : 'Halteres em Casa (Apenas halteres com peso ajustável e peso corporal).';

  const restrictionsDesc = effectiveInputs.restrictions.includes('none')
    ? 'Nenhuma lesão ou restrição ortopédica ativa.'
    : `Restrições ativas: ${effectiveInputs.restrictions.map(r => 
        r === 'lower_back' ? 'Coluna Lombar (Proibido sobrecarga de cisalhamento: sem levantamento terra convencional pesado, bom-dia ou remadas curvadas livres sem suporte)' :
        r === 'shoulders' ? 'Ombros / Manguito Rotador (Proibido desenvolvimento atrás da nuca, remada alta fechada e paralelas com amplitude excessiva)' :
        r === 'knees' ? 'Joelhos / Tendão Patelar (Evitar cadeira extensora pesada na angulação final ou agachamentos com avanço brusco do joelho sem apoio)' : r
      ).join('; ')}`;

  // Mapeamento de busca rápida dos exercícios disponíveis
  const exerciseMap = new Map<string, Exercise>();
  available.forEach(ex => exerciseMap.set(ex.id, ex));

  const systemInstruction = `Você é o Diretor Técnico e Doutor em Fisiologia do Exercício, Biomecânica Ortopédica e Treinamento de Força de Alta Performance do heavy.io.
O heavy.io é um aplicativo minimalista, sério e de precisão mecânica para atletas de força e hipertrofia que valorizam a ciência e a individualidade biológica.
Sua missão é conceber uma periodização 100% individualizada e cirúrgica para o atleta descrito.
Você tem acesso e conhecimento irrestrito sobre a biomecânica mundial e cinesiologia aplicada.
NÃO prescreva divisões genéricas pré-concebidas: com base na frequência semanal fornecida, você mesmo deve determinar a divisão ótima (split) para este atleta.
Responda ESTRITAMENTE em formato JSON válido, sem qualquer texto fora do JSON e sem tags markdown.`;

  const prompt = `Prescreva uma periodização científica de alta performance para o seguinte atleta do heavy.io:

DADOS BIOLÓGICOS E ANTROPOMÉTRICOS COMPLETOS:
- Sexo Biológico: ${effectiveInputs.biologicalSex === 'female' ? 'Feminino' : 'Masculino'}
- Nuance Fisiológica de Gênero: ${sexPhysiology}
- Idade: ${effectiveInputs.age} anos (${agePhysiology})
- Estatura: ${effectiveInputs.heightCm} cm
- Peso Corporal: ${effectiveInputs.weightKg} kg
- Índice de Massa Corporal (IMC): ${bmi} kg/m²
- Análise de Alavancas e Momentos Articulares: ${leverAnalysis}
- Nível de Treinamento: ${effectiveInputs.experienceLevel === 'beginner' ? 'Iniciante (Pouco histórico, foco em aprendizado motor e adaptação neural)' : effectiveInputs.experienceLevel === 'returning' ? 'Retornando (Memória muscular ativa, reconstrução de capacidade de trabalho)' : effectiveInputs.experienceLevel === 'advanced' ? 'Avançado (Mais de 4 anos de treino pesado contínuo, exige sobrecarga cirúrgica no topo do MAV)' : 'Intermediário (1 a 3 anos de consistência, coordenação motora sólida)'}
- Objetivo Primário: ${effectiveInputs.goal === 'strength' ? 'Força Pura / 1RM (Aumento de recrutamento de unidades motoras e rigidez neuromuscular)' : effectiveInputs.goal === 'conditioning' ? 'Recomposição Corporal & Condicionamento' : 'Hipertrofia Muscular Máxima (Tensão mecânica progressiva e micro-lesão controlada)'}
- Grupamento Muscular Prioritário: ${priorityLabel}
- Restrições Articulares e Ortopédicas: ${restrictionsDesc}
- Ambiente de Treino e Equipamentos: ${equipmentDesc}
- Tempo Disponível por Sessão: ${effectiveInputs.sessionDuration} minutos (${effectiveInputs.sessionDuration === '30-45' ? '4 exercícios de alta densidade por treino' : effectiveInputs.sessionDuration === '45-60' ? '5 a 6 exercícios por treino' : '6 a 7 exercícios por treino'})
- Frequência Disponível: ${effectiveInputs.frequency} dias por semana.

SUA TAREFA DE FISIOLOGIA APLICADA:
1. DETERMINAÇÃO DA DIVISÃO (SPLIT): Com base na frequência de ${effectiveInputs.frequency} dias por semana, determine a divisão de treino ideal para este atleta (ex: Full Body, Upper/Lower, Torso/Limbs, Push/Pull/Legs, Híbrido, etc.). A divisão deve garantir frequência de estímulo de aproximadamente 2x/semana por agrupamento (respeitando a janela de 24-48h da MPS - Síntese Proteica Muscular) e tempo suficiente de recuperação central.
2. SELEÇÃO CINESIOLÓGICA AUTÔNOMA: Defina livremente os melhores exercícios da biomecânica moderna, incluindo obrigatoriamente estímulos sob tensão em posição de alongamento muscular (Stretch-Mediated Hypertrophy - Maeo et al. 2021, Pedrosa et al. 2022) e alto Stimulus-to-Fatigue Ratio (SFR).
3. ORDEM E PERIODIZAÇÃO DE PRIORIDADE: Conforme Simão et al. (2012), o grupo prioritário (${effectiveInputs.musclePriority}) DEVE ser posicionado no primeiro terço das sessões pertinentes.
4. PARÂMETROS CIRÚRGICOS: Para cada exercício, determine séries (targetSets de 2 a 4), repetições (targetRepsMin-Max), RIR (1 a 2) e descanso exato em segundos (restSeconds ajustado para compostos vs isoladores e sexo).
5. NOMENCLATURA PADRÃO EM PORTUGUÊS: Nomes de exercícios descritivos em português (ex: "Supino Inclinado com Halteres", "Cadeira Flexora Sentada", "Elevação Lateral na Polia").

Retorne ESTRITAMENTE o seguinte objeto JSON:
{
  "planName": string (título sóbrio e técnico),
  "splitType": "full_body" | "upper_lower" | "ul_ppl_hybrid" | "ppl",
  "description": string (síntese técnica e fundamentação em 2 a 3 frases),
  "sessions": [
    {
      "id": string,
      "name": string (ex: "Treino A - Superiores (Foco Peitoral Clavicular)"),
      "focus": string,
      "dayOfWeek": string,
      "exercises": [
        {
          "name": string,
          "targetMuscle": "peito" | "costas" | "quadriceps" | "isquiotibiais" | "gluteos" | "ombros" | "biceps" | "triceps" | "antibraco" | "panturrilhas" | "abdomen" | "lombar" | "trapezio",
          "movementPattern": "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull" | "squat" | "hinge" | "lunge" | "isolation" | "calf_raise" | "core_anti_extension" | "core_rotation",
          "equipment": "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "smith" | "kettlebell",
          "mechanic": "compound" | "isolation",
          "tier": "primary_compound" | "secondary_compound" | "stretch_isolation" | "peak_contraction" | "isolation" | "core",
          "targetSets": number,
          "targetRepsMin": number,
          "targetRepsMax": number,
          "targetRir": number,
          "restSeconds": number,
          "physiologicalRole": string
        }
      ]
    }
  ],
  "scientificSummary": {
    "primaryStimulus": string,
    "weeklyVolumeProfile": string,
    "anthropometricAdaptation": string,
    "recoveryRecommendation": string
  }
}`;

  try {
    const timeoutMs = options?.timeoutMs || 8000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini retornou resposta vazia.');
    }

    const parsed = JSON.parse(rawText);
    if (!parsed || !Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
      throw new Error('Sessões inválidas no retorno da IA.');
    }

    // Processamento e validação dos exercícios gerados
    const sessions: PlannedSession[] = [];
    const muscleSetTotals: Partial<Record<MuscleGroup, number>> = {};

    parsed.sessions.forEach((sess: any, sIdx: number) => {
      const validExercises: PlannedExercise[] = [];

      (sess.exercises || []).forEach((item: any) => {
        let matchedEx = resolveAiExerciseMatch(
          item.exerciseId || item.id,
          item.name || item.exerciseName,
          item.targetMuscle,
          available,
          exerciseMap
        );

        // Se o exercício não existia no catálogo base, cria dinamicamente para que tenha persistência completa
        if (!matchedEx) {
          const exName = item.name || item.exerciseName || 'Exercício Personalizado';
          const exId = `ai_${slugify(exName)}`;
          matchedEx = {
            id: exId,
            name: exName,
            targetMuscle: (item.targetMuscle as MuscleGroup) || 'peito',
            synergistMuscles: [],
            movementPattern: (item.movementPattern as MovementPattern) || 'isolation',
            mechanic: (item.mechanic as ExerciseMechanic) || 'compound',
            equipment: (item.equipment as Equipment) || 'machine',
            defaultRestSeconds: Math.max(30, Number(item.restSeconds) || 90),
            isCustom: true,
            instructions: item.physiologicalRole,
          };

          try {
            const created = createCustomExercise(matchedEx);
            if (created) matchedEx = created;
          } catch (e) {
            // fallback
          }

          exerciseMap.set(matchedEx.id, matchedEx);
          available.push(matchedEx);
        }

        if (matchedEx) {
          const sets = Math.max(1, Math.min(6, Number(item.targetSets) || 3));
          muscleSetTotals[matchedEx.targetMuscle] = (muscleSetTotals[matchedEx.targetMuscle] || 0) + sets;

          validExercises.push({
            exerciseId: matchedEx.id,
            exerciseName: matchedEx.name,
            targetMuscle: matchedEx.targetMuscle,
            movementPattern: matchedEx.movementPattern,
            tier: item.tier || (matchedEx.mechanic === 'compound' ? 'primary_compound' : 'isolation'),
            targetSets: sets,
            targetRepsMin: Math.max(1, Number(item.targetRepsMin) || 8),
            targetRepsMax: Math.max(Number(item.targetRepsMin) || 8, Number(item.targetRepsMax) || 12),
            targetRir: typeof item.targetRir === 'number' ? item.targetRir : 1.5,
            restSeconds: Math.max(30, Number(item.restSeconds) || matchedEx.defaultRestSeconds || 90),
            physiologicalRole: item.physiologicalRole || 'Estímulo Hipertrófico Calibrado',
          });
        }
      });

      sessions.push({
        id: sess.id || `ai_sess_${sIdx + 1}`,
        name: sess.name || `Treino ${String.fromCharCode(65 + sIdx)}`,
        focus: sess.focus || 'Hipertrofia & Força Muscular',
        dayOfWeek: sess.dayOfWeek || `Dia ${sIdx + 1}`,
        exercises: validExercises,
      });
    });

    // Volume landmarks fisiológicos dinâmicos
    const volumeBreakdown: MuscleVolumeBreakdown[] = Object.entries(muscleSetTotals)
      .filter(([_, sets]) => sets && sets > 0)
      .map(([muscleKey, sets]) => {
        const muscle = muscleKey as MuscleGroup;
        const isPriority = 
          effectiveInputs.musclePriority === 'chest' ? muscle === 'peito' :
          effectiveInputs.musclePriority === 'back' ? muscle === 'costas' :
          effectiveInputs.musclePriority === 'legs_glutes' ? ['quadriceps', 'isquiotibiais', 'gluteos'].includes(muscle) :
          effectiveInputs.musclePriority === 'shoulders' ? muscle === 'ombros' :
          effectiveInputs.musclePriority === 'arms' ? ['biceps', 'triceps'].includes(muscle) : false;

        let landmark: 'MEV' | 'MAV' | 'PRIORITÁRIO' = 'MAV';
        if (isPriority) landmark = 'PRIORITÁRIO';
        else if (sets! < 10) landmark = 'MEV';

        return {
          muscle,
          muscleLabel: MUSCLE_NAMES_PT[muscle] || muscle,
          weeklySets: sets!,
          landmark,
        };
      })
      .sort((a, b) => b.weeklySets - a.weeklySets);

    const totalWeeklySets = Object.values(muscleSetTotals).reduce((acc, curr) => (acc || 0) + (curr || 0), 0) || 0;
    const avgDirectSets = Math.round(totalWeeklySets / Math.max(1, volumeBreakdown.length));

    return {
      planName: parsed.planName || `Periodização Especializada com IA (${effectiveInputs.frequency}x)`,
      splitType: ['full_body', 'upper_lower', 'ul_ppl_hybrid', 'ppl'].includes(parsed.splitType)
        ? parsed.splitType
        : (effectiveInputs.frequency <= 3 ? 'full_body' : effectiveInputs.frequency === 4 ? 'upper_lower' : 'ppl'),
      description: parsed.description || 'Periodização formulada pelo Prescritor de Fisiologia Esportiva IA.',
      sessions,
      weeklyDirectSetsPerMuscle: avgDirectSets,
      volumeBreakdown,
      scientificSummary: parsed.scientificSummary || {
        primaryStimulus: 'Tensão Mecânica e Hipertrofia sob Alongamento',
        weeklyVolumeProfile: `Volume Total Efetivo: ~${totalWeeklySets} séries semanais`,
        anthropometricAdaptation: `Calibrado para ${effectiveInputs.biologicalSex === 'female' ? 'Feminino' : 'Masculino'}, ${effectiveInputs.heightCm}cm, ${effectiveInputs.weightKg}kg`,
        recoveryRecommendation: 'Descanso inter-série ajustado para regeneração de fosfagênios e controle de fadiga neural.',
      },
      isAiGenerated: true,
      aiEngine: 'gemini-3.6-flash',
    };
  } catch (err) {
    console.warn('Falha ou timeout na IA Gemini, recorrendo com segurança ao motor cinemático local:', err);
    return generateGuidedRoutine(inputs);
  }
}

/**
 * Busca substitutos biomecanicamente equivalentes para um exercício,
 * respeitando rigorosamente as restrições articulares, o ambiente de equipamento da academia
 * e opcionalmente um filtro específico de aparelho selecionado pelo usuário.
 */
export const getBiomechanicSubstitutes = (
  currentExerciseId: string,
  inputs?: Partial<GuidedInputs>,
  equipmentFilter?: Equipment | 'all'
): Exercise[] => {
  const effectiveInputs: GuidedInputs = {
    frequency: inputs?.frequency || 4,
    sessionDuration: inputs?.sessionDuration || '45-60',
    goal: inputs?.goal || 'hypertrophy',
    experienceLevel: inputs?.experienceLevel || 'intermediate',
    equipment: inputs?.equipment || 'commercial',
    restrictions: inputs?.restrictions || ['none'],
    biologicalSex: inputs?.biologicalSex || 'male',
    age: inputs?.age || 26,
    weightKg: inputs?.weightKg || 78,
    heightCm: inputs?.heightCm || 176,
    musclePriority: inputs?.musclePriority || 'balanced',
  };

  const available = getAvailableExercises(effectiveInputs);
  const current = available.find(e => e.id === currentExerciseId) ||
    SEED_EXERCISES.find(e => e.id === currentExerciseId);

  let candidates = available.filter(ex => {
    if (ex.id === currentExerciseId) return false;

    if (equipmentFilter && equipmentFilter !== 'all') {
      if (equipmentFilter === 'machine') {
        if (ex.equipment !== 'machine' && ex.equipment !== 'cable' && ex.equipment !== 'smith') {
          return false;
        }
      } else if (ex.equipment !== equipmentFilter) {
        return false;
      }
    }

    const isSameMuscle = current ? ex.targetMuscle === current.targetMuscle : true;
    const isSamePattern = current ? ex.movementPattern === current.movementPattern : false;

    return isSameMuscle || isSamePattern;
  });

  if (current?.mechanic === 'compound') {
    candidates.sort((a, b) => {
      if (a.mechanic === 'compound' && b.mechanic !== 'compound') return -1;
      if (a.mechanic !== 'compound' && b.mechanic === 'compound') return 1;
      return 0;
    });
  }

  return candidates;
};
