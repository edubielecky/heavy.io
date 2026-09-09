import { Exercise, MuscleGroup, Equipment, MovementPattern } from '../types/workout';
import { SEED_EXERCISES } from '../database/seedData';
import { getExercises } from '../database/database';

export type WeeklyFrequency = 2 | 3 | 4 | 5 | 6;
export type SessionDuration = '30-45' | '45-60' | '60-90';
export type PrimaryGoal = 'hypertrophy' | 'strength' | 'conditioning';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'returning';
export type EquipmentEnvironment = 'commercial' | 'condo' | 'home_dumbbells';
export type PhysicalRestriction = 'shoulders' | 'lower_back' | 'knees' | 'none';

export interface GuidedInputs {
  frequency: WeeklyFrequency;
  sessionDuration: SessionDuration;
  goal: PrimaryGoal;
  experienceLevel: ExperienceLevel;
  equipment: EquipmentEnvironment;
  restrictions: PhysicalRestriction[];
}

export type ExerciseTier = 'primary_compound' | 'secondary_compound' | 'isolation' | 'core';

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  targetMuscle: MuscleGroup;
  movementPattern: MovementPattern;
  tier: ExerciseTier;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
}

export interface PlannedSession {
  id: string;
  name: string;
  focus: string;
  dayOfWeek: string;
  exercises: PlannedExercise[];
}

export interface GeneratedPlan {
  planName: string;
  splitType: 'full_body' | 'upper_lower' | 'ul_ppl_hybrid' | 'ppl';
  description: string;
  sessions: PlannedSession[];
  weeklyDirectSetsPerMuscle: number;
}

/**
 * Lista de exercícios que devem ser evitados em caso de restrições articulares
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
  ],
  shoulders: [
    'overhead_press_barbell_standing',
    'overhead_press_barbell_seated',
    'dumbbell_upright_row',
    'chest_dips',
    'parallel_bar_dips_triceps',
  ],
  knees: [
    'leg_extension_machine',
    'single_leg_extension',
    'sissy_squat',
    'pistol_squat',
    'barbell_front_squat',
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
    // Fallback caso SQLite não esteja inicializado no ambiente de testes
    allExercises = SEED_EXERCISES as Exercise[];
  }

  if (!allExercises || allExercises.length === 0) {
    allExercises = SEED_EXERCISES as Exercise[];
  }

  // 1. Filtro de Restrições
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

    // 2. Filtro de Equipamento
    if (inputs.equipment === 'home_dumbbells') {
      return ex.equipment === 'dumbbell' || ex.equipment === 'bodyweight';
    }

    if (inputs.equipment === 'condo') {
      // Ignora máquinas complexas de alavanca tipo hack squat, isoladores de alavanca
      return (
        ex.equipment === 'dumbbell' ||
        ex.equipment === 'barbell' ||
        ex.equipment === 'cable' ||
        ex.equipment === 'smith' ||
        ex.equipment === 'bodyweight'
      );
    }

    // commercial: aceita qualquer equipamento
    return true;
  });
};

/**
 * Busca o melhor exercício para um determinado papel na sessão
 */
const pickBestExercise = (
  available: Exercise[],
  criteria: {
    targetMuscle: MuscleGroup;
    mechanic?: 'compound' | 'isolation';
    preferredPatterns?: MovementPattern[];
    avoidIds?: string[];
  }
): Exercise => {
  const avoidSet = new Set(criteria.avoidIds || []);

  const candidates = available.filter(ex => {
    if (avoidSet.has(ex.id)) return false;
    if (ex.targetMuscle !== criteria.targetMuscle) return false;
    if (criteria.mechanic && ex.mechanic !== criteria.mechanic) return false;
    if (criteria.preferredPatterns && criteria.preferredPatterns.length > 0) {
      return criteria.preferredPatterns.includes(ex.movementPattern);
    }
    return true;
  });

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Fallback 1: ignora o pattern
  const fallbackMuscle = available.filter(
    ex => !avoidSet.has(ex.id) && ex.targetMuscle === criteria.targetMuscle
  );
  if (fallbackMuscle.length > 0) return fallbackMuscle[0];

  // Fallback 2: primeiro disponível não evitado
  const fallbackAny = available.find(ex => !avoidSet.has(ex.id));
  if (fallbackAny) return fallbackAny;

  return available[0];
};

/**
 * Define séries, repetições e descanso por tier e objetivo
 */
const getExerciseParameters = (
  tier: ExerciseTier,
  goal: PrimaryGoal,
  experience: ExperienceLevel
): { sets: number; repsMin: number; repsMax: number; rest: number } => {
  const isBeginner = experience === 'beginner' || experience === 'returning';

  if (tier === 'primary_compound') {
    if (goal === 'strength') {
      return { sets: isBeginner ? 3 : 4, repsMin: 5, repsMax: 6, rest: 150 };
    }
    if (goal === 'hypertrophy') {
      return { sets: isBeginner ? 3 : 4, repsMin: 6, repsMax: 8, rest: 120 };
    }
    // conditioning
    return { sets: 3, repsMin: 8, repsMax: 10, rest: 90 };
  }

  if (tier === 'secondary_compound') {
    if (goal === 'strength') {
      return { sets: 3, repsMin: 6, repsMax: 8, rest: 120 };
    }
    if (goal === 'hypertrophy') {
      return { sets: 3, repsMin: 8, repsMax: 10, rest: 90 };
    }
    // conditioning
    return { sets: 3, repsMin: 10, repsMax: 12, rest: 75 };
  }

  if (tier === 'isolation') {
    if (goal === 'strength') {
      return { sets: 3, repsMin: 8, repsMax: 12, rest: 75 };
    }
    if (goal === 'hypertrophy') {
      return { sets: isBeginner ? 3 : 4, repsMin: 10, repsMax: 15, rest: 60 };
    }
    // conditioning
    return { sets: 3, repsMin: 12, repsMax: 15, rest: 60 };
  }

  // core
  return { sets: 3, repsMin: 12, repsMax: 20, rest: 60 };
};

/**
 * MOTOR DE RECOMENDAÇÃO LOCAL (Local Recommendation Engine)
 */
export const generateGuidedRoutine = (inputs: GuidedInputs): GeneratedPlan => {
  const available = getAvailableExercises(inputs);
  const usedExerciseIds: string[] = [];

  // Quantidade de exercícios por sessão de acordo com a duração
  const exCount = inputs.sessionDuration === '30-45' ? 4 : inputs.sessionDuration === '45-60' ? 5 : 6;

  // Determinação de volume por nível
  const weeklySetsPerMuscle = inputs.experienceLevel === 'intermediate' ? 16 : 11;

  let splitType: 'full_body' | 'upper_lower' | 'ul_ppl_hybrid' | 'ppl';
  let planTitle = '';
  let sessions: PlannedSession[] = [];

  const createPlannedEx = (
    muscle: MuscleGroup,
    tier: ExerciseTier,
    mechanic: 'compound' | 'isolation' = 'compound',
    preferredPatterns?: MovementPattern[]
  ): PlannedExercise => {
    const ex = pickBestExercise(available, {
      targetMuscle: muscle,
      mechanic,
      preferredPatterns,
      avoidIds: usedExerciseIds,
    });
    usedExerciseIds.push(ex.id);

    const params = getExerciseParameters(tier, inputs.goal, inputs.experienceLevel);

    return {
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetMuscle: ex.targetMuscle,
      movementPattern: ex.movementPattern,
      tier,
      targetSets: params.sets,
      targetRepsMin: params.repsMin,
      targetRepsMax: params.repsMax,
      restSeconds: params.rest,
    };
  };

  // =========================================================================
  // REGRA 1: SELEÇÃO DA DIVISÃO (SPLIT) PELA FREQUÊNCIA
  // =========================================================================

  // 1. FREQUÊNCIA 2 ou 3 DIAS: FULL BODY
  if (inputs.frequency === 2 || inputs.frequency === 3) {
    splitType = 'full_body';
    planTitle = `Full Body ${inputs.frequency} Dias: Foco Força & Eficiência`;

    // Treino A (Foco Agachamento & Supino)
    const exA: PlannedExercise[] = [];
    exA.push(createPlannedEx('quadriceps', 'primary_compound', 'compound', ['squat', 'lunge']));
    exA.push(createPlannedEx('peito', 'secondary_compound', 'compound', ['horizontal_push']));
    exA.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['horizontal_pull', 'vertical_pull']));
    exA.push(createPlannedEx('isquiotibiais', 'isolation', 'compound', ['hinge', 'isolation']));
    if (exCount >= 5) exA.push(createPlannedEx('ombros', 'isolation', 'isolation', ['isolation']));
    if (exCount >= 6) exA.push(createPlannedEx('abdomen', 'core', 'isolation', ['core_anti_extension', 'core_rotation']));

    // Treino B (Foco Hinge & Desenvolvimento)
    const exB: PlannedExercise[] = [];
    exB.push(createPlannedEx('isquiotibiais', 'primary_compound', 'compound', ['hinge']));
    exB.push(createPlannedEx('ombros', 'secondary_compound', 'compound', ['vertical_push']));
    exB.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['vertical_pull', 'horizontal_pull']));
    exB.push(createPlannedEx('quadriceps', 'secondary_compound', 'compound', ['squat', 'lunge']));
    if (exCount >= 5) exB.push(createPlannedEx('biceps', 'isolation', 'isolation'));
    if (exCount >= 6) exB.push(createPlannedEx('triceps', 'isolation', 'isolation'));

    sessions = [
      {
        id: 'guided_fb_a',
        name: 'Treino A - Full Body (Foco Anterior)',
        focus: 'Quadríceps, Peitoral & Costas',
        dayOfWeek: 'Segunda-feira',
        exercises: exA,
      },
      {
        id: 'guided_fb_b',
        name: 'Treino B - Full Body (Foco Posterior)',
        focus: 'Isquiotibiais, Ombros & Dorsal',
        dayOfWeek: inputs.frequency === 2 ? 'Quinta-feira' : 'Quarta-feira',
        exercises: exB,
      },
    ];

    if (inputs.frequency === 3) {
      // Treino C (Foco Densidade & Acessórios)
      const exC: PlannedExercise[] = [];
      exC.push(createPlannedEx('peito', 'primary_compound', 'compound', ['horizontal_push']));
      exC.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['horizontal_pull']));
      exC.push(createPlannedEx('quadriceps', 'secondary_compound', 'compound', ['squat', 'lunge']));
      exC.push(createPlannedEx('isquiotibiais', 'isolation', 'isolation'));
      if (exCount >= 5) exC.push(createPlannedEx('ombros', 'isolation', 'isolation'));
      if (exCount >= 6) exC.push(createPlannedEx('abdomen', 'core', 'isolation'));

      sessions.push({
        id: 'guided_fb_c',
        name: 'Treino C - Full Body (Foco Volume)',
        focus: 'Peitoral, Dorsais & Pernas',
        dayOfWeek: 'Sexta-feira',
        exercises: exC,
      });
    }
  }

  // 2. FREQUÊNCIA 4 DIAS: UPPER / LOWER (2x)
  else if (inputs.frequency === 4) {
    splitType = 'upper_lower';
    planTitle = 'Upper / Lower 4 Dias: Equilíbrio Biomecânico';

    // Upper A (Força)
    const exUA: PlannedExercise[] = [];
    exUA.push(createPlannedEx('peito', 'primary_compound', 'compound', ['horizontal_push']));
    exUA.push(createPlannedEx('costas', 'primary_compound', 'compound', ['horizontal_pull']));
    exUA.push(createPlannedEx('ombros', 'secondary_compound', 'compound', ['vertical_push']));
    exUA.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['vertical_pull']));
    if (exCount >= 5) exUA.push(createPlannedEx('triceps', 'isolation', 'isolation'));
    if (exCount >= 6) exUA.push(createPlannedEx('biceps', 'isolation', 'isolation'));

    // Lower A (Força)
    const exLA: PlannedExercise[] = [];
    exLA.push(createPlannedEx('quadriceps', 'primary_compound', 'compound', ['squat']));
    exLA.push(createPlannedEx('isquiotibiais', 'primary_compound', 'compound', ['hinge']));
    exLA.push(createPlannedEx('quadriceps', 'secondary_compound', 'compound', ['lunge', 'squat']));
    exLA.push(createPlannedEx('panturrilhas', 'isolation', 'isolation', ['calf_raise']));
    if (exCount >= 5) exLA.push(createPlannedEx('gluteos', 'secondary_compound', 'compound', ['hinge']));
    if (exCount >= 6) exLA.push(createPlannedEx('abdomen', 'core', 'isolation'));

    // Upper B (Hipertrofia)
    const exUB: PlannedExercise[] = [];
    exUB.push(createPlannedEx('costas', 'primary_compound', 'compound', ['vertical_pull']));
    exUB.push(createPlannedEx('peito', 'secondary_compound', 'compound', ['horizontal_push']));
    exUB.push(createPlannedEx('ombros', 'isolation', 'isolation', ['isolation']));
    exUB.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['horizontal_pull']));
    if (exCount >= 5) exUB.push(createPlannedEx('biceps', 'isolation', 'isolation'));
    if (exCount >= 6) exUB.push(createPlannedEx('triceps', 'isolation', 'isolation'));

    // Lower B (Hipertrofia)
    const exLB: PlannedExercise[] = [];
    exLB.push(createPlannedEx('isquiotibiais', 'primary_compound', 'compound', ['hinge', 'isolation']));
    exLB.push(createPlannedEx('quadriceps', 'primary_compound', 'compound', ['squat', 'lunge']));
    exLB.push(createPlannedEx('gluteos', 'secondary_compound', 'compound', ['hinge']));
    exLB.push(createPlannedEx('panturrilhas', 'isolation', 'isolation', ['calf_raise']));
    if (exCount >= 5) exLB.push(createPlannedEx('quadriceps', 'isolation', 'isolation'));
    if (exCount >= 6) exLB.push(createPlannedEx('abdomen', 'core', 'isolation'));

    sessions = [
      { id: 'guided_ul_ua', name: 'Treino A - Upper (Superiores Força)', focus: 'Peito, Costas & Ombros', dayOfWeek: 'Segunda-feira', exercises: exUA },
      { id: 'guided_ul_la', name: 'Treino B - Lower (Inferiores Força)', focus: 'Quadríceps & Posterior', dayOfWeek: 'Terça-feira', exercises: exLA },
      { id: 'guided_ul_ub', name: 'Treino C - Upper (Superiores Volume)', focus: 'Dorsal, Peito & Braços', dayOfWeek: 'Quinta-feira', exercises: exUB },
      { id: 'guided_ul_lb', name: 'Treino D - Lower (Inferiores Volume)', focus: 'Posterior, Glúteo & Perna', dayOfWeek: 'Sexta-feira', exercises: exLB },
    ];
  }

  // 3. FREQUÊNCIA 5 DIAS: UPPER / LOWER + PPL HÍBRIDO
  else if (inputs.frequency === 5) {
    splitType = 'ul_ppl_hybrid';
    planTitle = 'Estrutura Híbrida 5 Dias: Alta Frequência & Volume';

    // Dia 1: Upper Força
    const s1: PlannedExercise[] = [];
    s1.push(createPlannedEx('peito', 'primary_compound', 'compound', ['horizontal_push']));
    s1.push(createPlannedEx('costas', 'primary_compound', 'compound', ['horizontal_pull']));
    s1.push(createPlannedEx('ombros', 'secondary_compound', 'compound', ['vertical_push']));
    s1.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['vertical_pull']));
    if (exCount >= 5) s1.push(createPlannedEx('triceps', 'isolation', 'isolation'));
    if (exCount >= 6) s1.push(createPlannedEx('biceps', 'isolation', 'isolation'));

    // Dia 2: Lower Força
    const s2: PlannedExercise[] = [];
    s2.push(createPlannedEx('quadriceps', 'primary_compound', 'compound', ['squat']));
    s2.push(createPlannedEx('isquiotibiais', 'primary_compound', 'compound', ['hinge']));
    s2.push(createPlannedEx('quadriceps', 'secondary_compound', 'compound', ['lunge', 'squat']));
    s2.push(createPlannedEx('panturrilhas', 'isolation', 'isolation', ['calf_raise']));
    if (exCount >= 5) s2.push(createPlannedEx('gluteos', 'secondary_compound', 'compound', ['hinge']));
    if (exCount >= 6) s2.push(createPlannedEx('abdomen', 'core', 'isolation'));

    // Dia 3: Push Hipertrofia
    const s3: PlannedExercise[] = [];
    s3.push(createPlannedEx('peito', 'primary_compound', 'compound', ['horizontal_push']));
    s3.push(createPlannedEx('peito', 'secondary_compound', 'compound', ['horizontal_push']));
    s3.push(createPlannedEx('ombros', 'isolation', 'isolation', ['isolation']));
    s3.push(createPlannedEx('triceps', 'isolation', 'isolation'));
    if (exCount >= 5) s3.push(createPlannedEx('ombros', 'secondary_compound', 'compound', ['vertical_push']));
    if (exCount >= 6) s3.push(createPlannedEx('triceps', 'isolation', 'isolation'));

    // Dia 4: Pull Hipertrofia
    const s4: PlannedExercise[] = [];
    s4.push(createPlannedEx('costas', 'primary_compound', 'compound', ['vertical_pull']));
    s4.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['horizontal_pull']));
    s4.push(createPlannedEx('trapezio', 'isolation', 'isolation'));
    s4.push(createPlannedEx('biceps', 'isolation', 'isolation'));
    if (exCount >= 5) s4.push(createPlannedEx('costas', 'isolation', 'isolation'));
    if (exCount >= 6) s4.push(createPlannedEx('biceps', 'isolation', 'isolation'));

    // Dia 5: Legs Hipertrofia
    const s5: PlannedExercise[] = [];
    s5.push(createPlannedEx('quadriceps', 'primary_compound', 'compound', ['squat', 'lunge']));
    s5.push(createPlannedEx('isquiotibiais', 'primary_compound', 'compound', ['hinge', 'isolation']));
    s5.push(createPlannedEx('gluteos', 'secondary_compound', 'compound', ['hinge']));
    s5.push(createPlannedEx('panturrilhas', 'isolation', 'isolation', ['calf_raise']));
    if (exCount >= 5) s5.push(createPlannedEx('quadriceps', 'isolation', 'isolation'));
    if (exCount >= 6) s5.push(createPlannedEx('abdomen', 'core', 'isolation'));

    sessions = [
      { id: 'guided_h5_u', name: 'Treino A - Upper (Força)', focus: 'Peito, Costas & Ombros', dayOfWeek: 'Segunda-feira', exercises: s1 },
      { id: 'guided_h5_l', name: 'Treino B - Lower (Força)', focus: 'Quadríceps & Isquiotibiais', dayOfWeek: 'Terça-feira', exercises: s2 },
      { id: 'guided_h5_push', name: 'Treino C - Push (Hipertrofia)', focus: 'Peito, Ombros & Tríceps', dayOfWeek: 'Quinta-feira', exercises: s3 },
      { id: 'guided_h5_pull', name: 'Treino D - Pull (Hipertrofia)', focus: 'Costas, Trapézio & Bíceps', dayOfWeek: 'Sexta-feira', exercises: s4 },
      { id: 'guided_h5_legs', name: 'Treino E - Legs (Hipertrofia)', focus: 'Membros Inferiores Completos', dayOfWeek: 'Sábado', exercises: s5 },
    ];
  }

  // 4. FREQUÊNCIA 6 DIAS: PUSH / PULL / LEGS (2x)
  else {
    splitType = 'ppl';
    planTitle = 'Push / Pull / Legs (2x) 6 Dias: Foco Máximo em Sobrecarga';

    const makePush = (letter: string, day: string): PlannedSession => {
      const exList: PlannedExercise[] = [];
      exList.push(createPlannedEx('peito', 'primary_compound', 'compound', ['horizontal_push']));
      exList.push(createPlannedEx('ombros', 'secondary_compound', 'compound', ['vertical_push', 'isolation']));
      exList.push(createPlannedEx('peito', 'secondary_compound', 'compound', ['horizontal_push']));
      exList.push(createPlannedEx('triceps', 'isolation', 'isolation'));
      if (exCount >= 5) exList.push(createPlannedEx('ombros', 'isolation', 'isolation'));
      if (exCount >= 6) exList.push(createPlannedEx('triceps', 'isolation', 'isolation'));

      return {
        id: `guided_ppl_push_${letter.toLowerCase()}`,
        name: `Treino ${letter} - Push (Peito, Ombros & Tríceps)`,
        focus: 'Peitoral, Deltoides & Tríceps',
        dayOfWeek: day,
        exercises: exList,
      };
    };

    const makePull = (letter: string, day: string): PlannedSession => {
      const exList: PlannedExercise[] = [];
      exList.push(createPlannedEx('costas', 'primary_compound', 'compound', ['vertical_pull', 'horizontal_pull']));
      exList.push(createPlannedEx('costas', 'secondary_compound', 'compound', ['horizontal_pull']));
      exList.push(createPlannedEx('trapezio', 'isolation', 'isolation'));
      exList.push(createPlannedEx('biceps', 'isolation', 'isolation'));
      if (exCount >= 5) exList.push(createPlannedEx('costas', 'isolation', 'isolation'));
      if (exCount >= 6) exList.push(createPlannedEx('biceps', 'isolation', 'isolation'));

      return {
        id: `guided_ppl_pull_${letter.toLowerCase()}`,
        name: `Treino ${letter} - Pull (Costas, Trapézio & Bíceps)`,
        focus: 'Dorsais, Trapézio & Bíceps',
        dayOfWeek: day,
        exercises: exList,
      };
    };

    const makeLegs = (letter: string, day: string): PlannedSession => {
      const exList: PlannedExercise[] = [];
      exList.push(createPlannedEx('quadriceps', 'primary_compound', 'compound', ['squat', 'lunge']));
      exList.push(createPlannedEx('isquiotibiais', 'primary_compound', 'compound', ['hinge', 'isolation']));
      exList.push(createPlannedEx('gluteos', 'secondary_compound', 'compound', ['hinge']));
      exList.push(createPlannedEx('panturrilhas', 'isolation', 'isolation', ['calf_raise']));
      if (exCount >= 5) exList.push(createPlannedEx('quadriceps', 'isolation', 'isolation'));
      if (exCount >= 6) exList.push(createPlannedEx('abdomen', 'core', 'isolation'));

      return {
        id: `guided_ppl_legs_${letter.toLowerCase()}`,
        name: `Treino ${letter} - Legs (Membros Inferiores)`,
        focus: 'Quadríceps, Isquiotibiais & Panturrilha',
        dayOfWeek: day,
        exercises: exList,
      };
    };

    sessions = [
      makePush('A', 'Segunda-feira'),
      makePull('B', 'Terça-feira'),
      makeLegs('C', 'Quarta-feira'),
      makePush('D', 'Quinta-feira'),
      makePull('E', 'Sexta-feira'),
      makeLegs('F', 'Sábado'),
    ];
  }

  // Descrição resumida da estratégia gerada
  const goalLabelMap: Record<PrimaryGoal, string> = {
    hypertrophy: 'Hipertrofia Estética & Densidade Muscular',
    strength: 'Ganho de Força Base & Sobrecarga em Compostos',
    conditioning: 'Condicionamento Atlético & Resistência Muscular',
  };

  const expLabelMap: Record<ExperienceLevel, string> = {
    beginner: 'Iniciante (Curva de Aprendizagem Motora)',
    intermediate: 'Intermediário (Estresse Mecânico & Metabólico)',
    returning: 'Retomada Progressiva (Rampa de Reaclimatação)',
  };

  const description = `Plano customizado para ${inputs.frequency} dias/semana com sessões de ${inputs.sessionDuration} min. Foco em ${goalLabelMap[inputs.goal]} para nível ${expLabelMap[inputs.experienceLevel]}.`;

  return {
    planName: planTitle,
    splitType,
    description,
    sessions,
    weeklyDirectSetsPerMuscle: weeklySetsPerMuscle,
  };
};

/**
 * Busca substitutos biomecanicamente equivalentes para um exercício,
 * respeitando rigorosamente as restrições articulares, o ambiente de equipamento da academia
 * e opcionalmente um filtro específico de aparelho selecionado pelo usuário (ex: 'dumbbell', 'barbell', 'machine', 'cable').
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
    restrictions: inputs?.restrictions || [],
  };

  const available = getAvailableExercises(effectiveInputs);
  const current = available.find(e => e.id === currentExerciseId) ||
    SEED_EXERCISES.find(e => e.id === currentExerciseId);

  let candidates = available.filter(ex => {
    if (ex.id === currentExerciseId) return false;

    // Se o usuário filtrou por um aparelho específico no modal
    if (equipmentFilter && equipmentFilter !== 'all') {
      if (equipmentFilter === 'machine') {
        if (ex.equipment !== 'machine' && ex.equipment !== 'cable' && ex.equipment !== 'smith') {
          return false;
        }
      } else if (ex.equipment !== equipmentFilter) {
        return false;
      }
    }

    // 1. Mesmo grupamento muscular alvo
    const isSameMuscle = current ? ex.targetMuscle === current.targetMuscle : true;

    // 2. Ou mesmo padrão biomecânico de movimento
    const isSamePattern = current ? ex.movementPattern === current.movementPattern : false;

    return isSameMuscle || isSamePattern;
  });

  // Se o exercício atual for composto, prioriza outros compostos no topo da lista
  if (current?.mechanic === 'compound') {
    candidates.sort((a, b) => {
      if (a.mechanic === 'compound' && b.mechanic !== 'compound') return -1;
      if (a.mechanic !== 'compound' && b.mechanic === 'compound') return 1;
      return 0;
    });
  }

  return candidates;
};
