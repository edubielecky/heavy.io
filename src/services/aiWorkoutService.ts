import { 
  WorkoutProgram, 
  Routine, 
  RoutineExerciseItem, 
  MuscleGroup, 
  MovementPattern,
  Exercise 
} from '../types/workout';
import { getExercises, getExerciseById } from '../database/database';
import { SEED_EXERCISES } from '../database/seedData';

export type AuditSeverity = 'critical' | 'warning' | 'optimization' | 'positive';

export interface AuditAction {
  type: 'swap' | 'adjust_sets' | 'reorder';
  targetRoutineId?: string;
  fromExerciseId?: string;
  toExerciseId?: string;
  toExerciseName?: string;
  targetSets?: number;
  reason: string;
}

export interface BiomechanicFinding {
  id: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  recommendation?: string;
  suggestedAction?: AuditAction;
}

export interface MuscleVolumeAudit {
  muscle: MuscleGroup;
  muscleLabel: string;
  weeklySets: number;
  landmark: 'INSUFFICIENT' | 'MEV' | 'MAV' | 'MRV' | 'EXCESSIVE';
  landmarkLabel: string;
  targetRange: string;
}

export interface WorkoutAuditResult {
  overallScore: number; // 0 a 100
  programName: string;
  totalWeeklySets: number;
  summary: string;
  isAiGenerated: boolean;
  analyzedAt: string;
  axialFatigue: {
    level: 'low' | 'moderate' | 'high' | 'critical';
    score: number; // 0 a 100 (quanto maior, maior a carga na coluna)
    description: string;
    highLoadExercises: string[];
  };
  pushPullBalance: {
    ratio: number; // Sets de Push / Sets de Pull
    pushSets: number;
    pullSets: number;
    status: 'balanced' | 'push_dominant' | 'pull_dominant';
    comment: string;
  };
  lowerChainBalance: {
    ratio: number; // Quads / Posteriores
    quadSets: number;
    hamstringSets: number;
    status: 'balanced' | 'quad_dominant' | 'hamstring_dominant';
    comment: string;
  };
  stretchCoverage: {
    percentage: number;
    coveredMuscles: string[];
    missingMuscles: string[];
    comment: string;
  };
  volumeBreakdown: MuscleVolumeAudit[];
  findings: BiomechanicFinding[];
}

/**
 * Mapeamento dos nomes em português para grupos musculares
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
 * Marcos de Volume de Hipertrofia (Dr. Mike Israetel / Schoenfeld)
 * MEV: Mínimo Volume Efetivo
 * MAV: Volume Adaptativo Ótimo
 * MRV: Máximo Volume Recuperável
 */
const VOLUME_LANDMARKS: Record<MuscleGroup, { mev: number; mavMin: number; mavMax: number; mrv: number }> = {
  peito: { mev: 8, mavMin: 12, mavMax: 18, mrv: 22 },
  costas: { mev: 10, mavMin: 14, mavMax: 20, mrv: 24 },
  quadriceps: { mev: 8, mavMin: 12, mavMax: 18, mrv: 20 },
  isquiotibiais: { mev: 6, mavMin: 10, mavMax: 16, mrv: 18 },
  gluteos: { mev: 4, mavMin: 8, mavMax: 14, mrv: 18 },
  ombros: { mev: 8, mavMin: 12, mavMax: 20, mrv: 24 },
  biceps: { mev: 6, mavMin: 10, mavMax: 16, mrv: 20 },
  triceps: { mev: 6, mavMin: 10, mavMax: 16, mrv: 18 },
  antibraco: { mev: 2, mavMin: 4, mavMax: 8, mrv: 12 },
  panturrilhas: { mev: 6, mavMin: 10, mavMax: 16, mrv: 20 },
  abdomen: { mev: 4, mavMin: 8, mavMax: 14, mrv: 18 },
  lombar: { mev: 2, mavMin: 4, mavMax: 8, mrv: 12 },
  trapezio: { mev: 4, mavMin: 8, mavMax: 14, mrv: 18 },
};

/**
 * Exercícios de alta sobrecarga axial (compressão lombo-pélvica)
 */
const HIGH_AXIAL_EXERCISE_IDS = new Set<string>([
  'deadlift_conventional',
  'deadlift_sumo',
  'barbell_back_squat_high_bar',
  'barbell_back_squat_low_bar',
  'barbell_front_squat',
  'good_morning_barbell',
  'barbell_bent_over_row',
  'pendlay_row',
  't_bar_row_unsupported',
  'overhead_press_barbell_standing',
  'romanian_deadlift_barbell',
  'stiff_leg_deadlift_barbell',
]);

/**
 * Exercícios com estímulo sob alongamento comprovado (Stretch-Mediated Hypertrophy)
 * NOTA: triceps_kickback_dumbbell foi REMOVIDO — o coice tem tensão máxima no encurtamento,
 * NÃO no alongamento (Maeo et al., 2021). Para hipertrofia sob alongamento no tríceps,
 * usar overhead_cable_triceps_extension_rope ou overhead_dumbbell_triceps_extension_seated.
 */
const STRETCH_EXERCISE_IDS = new Set<string>([
  'seated_leg_curl_machine',
  'romanian_deadlift_barbell',
  'stiff_leg_deadlift_barbell',
  'dumbbell_romanian_deadlift',
  'overhead_cable_triceps_extension_rope',
  'overhead_dumbbell_triceps_extension_seated',
  'skull_crushers_ez_bar_incline',
  'incline_dumbbell_curl',
  'standing_calf_raise_machine',
  'seated_calf_raise_machine',  // sóleo: tensão máxima com joelho flexionado
  'leg_press_calf_raise',
  'dumbbell_bench_press',
  'incline_dumbbell_bench_press',
  'cable_fly_mid_pulley',
  'cable_fly_low_to_high',
  'leg_press_45_degree',
  'hack_squat_machine',
  'dumbbell_bulgarian_split_squat',
  'cable_lat_pulldown_wide',
  'lat_pulldown_close_grip_v_bar',
]);

/**
 * Recupera o exercício completo a partir do banco de dados ou do catálogo seed
 */
function resolveExercise(exerciseId: string): Exercise | null {
  try {
    const fromDb = getExerciseById(exerciseId);
    if (fromDb) return fromDb;
  } catch {
    // fallback
  }
  const seed = SEED_EXERCISES.find(e => e.id === exerciseId);
  if (seed) return { ...seed, isCustom: false };
  return null;
}

/**
 * Executa a Análise Cinemática e Biomecânica Local (Offline-First)
 * Baseada em princípios de fisiologia esportiva e biomecânica ortopédica.
 */
export function runLocalKinematicAudit(program: WorkoutProgram): WorkoutAuditResult {
  const allExercises: { item: RoutineExerciseItem; ex: Exercise | null; routine: Routine }[] = [];
  
  program.routines.forEach(routine => {
    routine.exercises.forEach(item => {
      allExercises.push({
        item,
        ex: resolveExercise(item.exerciseId),
        routine,
      });
    });
  });

  // 1. Cálculo de Volume Semanal por Grupo Muscular
  const muscleSets: Partial<Record<MuscleGroup, number>> = {};
  allExercises.forEach(({ item, ex }) => {
    const target = ex?.targetMuscle || item.targetMuscle;
    muscleSets[target] = (muscleSets[target] || 0) + item.targetSets;
  });

  let totalWeeklySets = 0;
  const volumeBreakdown: MuscleVolumeAudit[] = Object.keys(VOLUME_LANDMARKS).map(k => {
    const muscle = k as MuscleGroup;
    const sets = muscleSets[muscle] || 0;
    totalWeeklySets += sets;
    const lm = VOLUME_LANDMARKS[muscle];

    let landmark: 'INSUFFICIENT' | 'MEV' | 'MAV' | 'MRV' | 'EXCESSIVE' = 'MAV';
    let landmarkLabel = 'Ótimo (MAV)';

    if (sets === 0) {
      landmark = 'INSUFFICIENT';
      landmarkLabel = 'Zero Estímulo';
    } else if (sets < lm.mev) {
      landmark = 'INSUFFICIENT';
      landmarkLabel = 'Abaixo do MEV';
    } else if (sets >= lm.mev && sets < lm.mavMin) {
      landmark = 'MEV';
      landmarkLabel = 'Manutenção (MEV)';
    } else if (sets >= lm.mavMin && sets <= lm.mavMax) {
      landmark = 'MAV';
      landmarkLabel = 'Hipertrofia Ótima (MAV)';
    } else if (sets > lm.mavMax && sets <= lm.mrv) {
      landmark = 'MRV';
      landmarkLabel = 'Pico de Volume (MRV)';
    } else {
      landmark = 'EXCESSIVE';
      landmarkLabel = 'Sobrecarga Excessiva (>MRV)';
    }

    return {
      muscle,
      muscleLabel: MUSCLE_NAMES_PT[muscle],
      weeklySets: sets,
      landmark,
      landmarkLabel,
      targetRange: `${lm.mavMin}–${lm.mavMax} séries`,
    };
  }).filter(v => v.weeklySets > 0 || ['peito', 'costas', 'quadriceps', 'isquiotibiais', 'ombros', 'biceps', 'triceps'].includes(v.muscle))
    .sort((a, b) => b.weeklySets - a.weeklySets);

  // 2. Análise de Sobrecarga Axial e Compressão Lombo-Pélvica
  const highAxialFound: { name: string; routineName: string; id: string }[] = [];
  allExercises.forEach(({ item, ex, routine }) => {
    if (HIGH_AXIAL_EXERCISE_IDS.has(item.exerciseId)) {
      highAxialFound.push({
        id: item.exerciseId,
        name: ex?.name || item.exerciseName,
        routineName: routine.name,
      });
    }
  });

  const axialCount = highAxialFound.length;
  let axialLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let axialScore = 20;
  let axialDesc = 'Estresse axial lombo-pélvico bem controlado e seguro.';

  if (axialCount >= 5) {
    axialLevel = 'critical';
    axialScore = 95;
    axialDesc = 'Compressão axial perigosa. Risco de fadiga cumulativa nos eretores da espinha e lombar.';
  } else if (axialCount >= 3) {
    axialLevel = 'high';
    axialScore = 75;
    axialDesc = 'Carga axial elevada. Exige atenção ao tempo de recuperação entre compostos pesados.';
  } else if (axialCount >= 2) {
    axialLevel = 'moderate';
    axialScore = 50;
    axialDesc = 'Sobrecarga axial equilibrada com exercícios com suporte torácico/aparelhos.';
  }

  // 3. Balanço Agonista / Antagonista (Push vs Pull)
  let pushSets = 0;
  let pullSets = 0;
  allExercises.forEach(({ item, ex }) => {
    const pattern = ex?.movementPattern;
    if (pattern === 'horizontal_push' || pattern === 'vertical_push') {
      pushSets += item.targetSets;
    } else if (pattern === 'horizontal_pull' || pattern === 'vertical_pull') {
      pullSets += item.targetSets;
    }
  });

  const pushPullRatio = pullSets > 0 ? Number((pushSets / pullSets).toFixed(2)) : (pushSets > 0 ? 3 : 1);
  let pushPullStatus: 'balanced' | 'push_dominant' | 'pull_dominant' = 'balanced';
  let pushPullComment = 'Relação empurrar/puxar anatomicamente equilibrada (1:1 a 1:1.2).';

  if (pushPullRatio > 1.4) {
    pushPullStatus = 'push_dominant';
    pushPullComment = `Desbalanço anterior: ${pushSets} séries de empurrar vs ${pullSets} de puxar. Risco de rotação interna dos ombros.`;
  } else if (pushPullRatio < 0.7) {
    pushPullStatus = 'pull_dominant';
    pushPullComment = `Predomínio de tração dorsal (${pullSets} puxar vs ${pushSets} empurrar).`;
  }

  // 4. Balanço Membros Inferiores (Quadríceps vs Isquiotibiais)
  const quadSets = muscleSets['quadriceps'] || 0;
  const hamSets = muscleSets['isquiotibiais'] || 0;
  const lowerRatio = hamSets > 0 ? Number((quadSets / hamSets).toFixed(2)) : 2;
  let lowerStatus: 'balanced' | 'quad_dominant' | 'hamstring_dominant' = 'balanced';
  let lowerComment = 'Proporção cadeia anterior/posterior de coxas equilibrada.';

  if (lowerRatio > 1.6 && quadSets >= 6) {
    lowerStatus = 'quad_dominant';
    lowerComment = `Dominância de quadríceps (${quadSets} séries quads vs ${hamSets} isquiotibiais). Risco de tensão patelar.`;
  } else if (lowerRatio < 0.6 && hamSets >= 6) {
    lowerStatus = 'hamstring_dominant';
    lowerComment = `Ênfase superior na cadeia posterior (${hamSets} posteriores vs ${quadSets} quadríceps).`;
  }

  // 5. Cobertura de Hipertrofia sob Alongamento (Stretch-Mediated)
  const stretchMusclesCovered = new Set<string>();
  allExercises.forEach(({ item }) => {
    if (STRETCH_EXERCISE_IDS.has(item.exerciseId)) {
      const ex = resolveExercise(item.exerciseId);
      if (ex) stretchMusclesCovered.add(MUSCLE_NAMES_PT[ex.targetMuscle] || ex.targetMuscle);
    }
  });

  const keyMusclesToCheck = ['Peitoral', 'Posteriores de Coxa', 'Quadríceps', 'Tríceps', 'Dorsais & Costas'];
  const missingStretch = keyMusclesToCheck.filter(m => !stretchMusclesCovered.has(m));
  const stretchPct = Math.round((stretchMusclesCovered.size / Math.max(1, keyMusclesToCheck.length)) * 100);

  // 6. Construção de Achados e Recomendações
  const findings: BiomechanicFinding[] = [];

  // Finding Carga Axial
  if (axialLevel === 'critical' || axialLevel === 'high') {
    const exampleEx = highAxialFound[0];
    findings.push({
      id: 'axial_overload',
      severity: axialLevel === 'critical' ? 'critical' : 'warning',
      title: 'Sobrecarga Axial Lombo-Pélvica Elevada',
      description: `Identificados ${axialCount} exercícios com alta compressão axial (${highAxialFound.map(e => e.name).slice(0, 3).join(', ')}). Isso gera fadiga de estabilização neural precoce.`,
      recommendation: 'Substitua um dos compostos livres por uma variante apoiada no peito (ex: Remada Apoiada ou Hack Squat) para aliviar a coluna.',
      suggestedAction: {
        type: 'swap',
        fromExerciseId: exampleEx?.id,
        toExerciseId: 'chest_supported_dumbbell_row',
        toExerciseName: 'Remada com Halteres com Apoio no Peito',
        reason: 'Elimina torque de cisalhamento na lombar e isola as dorsais.',
      },
    });
  }

  // Finding Push vs Pull
  if (pushPullStatus === 'push_dominant') {
    findings.push({
      id: 'push_pull_imbalance',
      severity: 'warning',
      title: 'Desbalanço na Cintura Escapular (Dominância de Empurrar)',
      description: `Volume de empurrar (${pushSets} séries) excede significativamente o volume de puxar (${pullSets} séries). Essa assimetria favorece encurtamento do peitoral e anteriorização dos ombros.`,
      recommendation: 'Adicione 3–4 séries semanais de Puxada Alta ou Face Pull para fortalecer os depressores e retratores escapulares.',
    });
  }

  // Finding Flexão de Joelho / Isquiotibiais
  const hasSeatedLegCurl = allExercises.some(e => e.item.exerciseId === 'seated_leg_curl_machine');
  if (!hasSeatedLegCurl && (muscleSets['isquiotibiais'] || 0) > 0) {
    findings.push({
      id: 'seated_leg_curl_missing',
      severity: 'optimization',
      title: 'Oportunidade de Hipertrofia Mediada pelo Alongamento',
      description: 'A literatura biomecânica (Maeo et al., 2021) comprova que a Cadeira Flexora Sentada produz hipertrofia superior à Flexora Deitada devido ao alongamento prévio do bíceps femoral na flexão de quadril.',
      recommendation: 'Adicione ou substitua uma flexora tradicional pela Cadeira Flexora Sentada.',
      suggestedAction: {
        type: 'swap',
        fromExerciseId: 'lying_leg_curl_machine',
        toExerciseId: 'seated_leg_curl_machine',
        toExerciseName: 'Cadeira Flexora Sentada',
        reason: 'Maior tensão mecânica passiva na posição alongada dos isquiotibiais.',
      },
    });
  }

  // Finding Volume Insuficiente ou Excessivo
  volumeBreakdown.forEach(vb => {
    if (vb.landmark === 'EXCESSIVE') {
      findings.push({
        id: `excessive_vol_${vb.muscle}`,
        severity: 'warning',
        title: `Volume Excessivo em ${vb.muscleLabel} (${vb.weeklySets} séries)`,
        description: `O volume ultrapassa o MRV estimado (~${VOLUME_LANDMARKS[vb.muscle].mrv} séries). Séries adicionais tendem a gerar apenas dano muscular sem hipertrofia adicional ("junk volume").`,
        recommendation: `Reduza o volume deste grupo para ${VOLUME_LANDMARKS[vb.muscle].mavMax} séries de maior intensidade de esforço (RIR 1–2).`,
      });
    }
  });

  // Finding Positivo se bem estruturado
  if (findings.length === 0 || (axialLevel === 'low' && pushPullStatus === 'balanced')) {
    findings.push({
      id: 'solid_foundations',
      severity: 'positive',
      title: 'Estrutura Biomecânica Sólida e Harmoniosa',
      description: 'Excelente equilíbrio entre planos motores horizontais e verticais, com gestão segura de estresse articular e distribuição de volume alinhada aos marcos de hipertrofia.',
    });
  }

  // 7. Cálculo do Score Biomecânico Geral (0 a 100)
  let score = 92;
  if (axialLevel === 'critical') score -= 25;
  else if (axialLevel === 'high') score -= 12;

  if (pushPullStatus === 'push_dominant') score -= 10;
  if (lowerStatus === 'quad_dominant') score -= 8;

  const excessiveCount = volumeBreakdown.filter(v => v.landmark === 'EXCESSIVE').length;
  score -= excessiveCount * 6;

  if (stretchPct < 40) score -= 6;
  score = Math.max(35, Math.min(99, score));

  return {
    overallScore: score,
    programName: program.name,
    totalWeeklySets,
    summary: `Rotina avaliada com ${totalWeeklySets} séries semanais totais. Carga axial em nível ${axialLevel.toUpperCase()} e relação Push/Pull de ${pushPullRatio}:1.`,
    isAiGenerated: false,
    analyzedAt: new Date().toISOString(),
    axialFatigue: {
      level: axialLevel,
      score: axialScore,
      description: axialDesc,
      highLoadExercises: highAxialFound.map(e => `${e.name} (${e.routineName})`),
    },
    pushPullBalance: {
      ratio: pushPullRatio,
      pushSets,
      pullSets,
      status: pushPullStatus,
      comment: pushPullComment,
    },
    lowerChainBalance: {
      ratio: lowerRatio,
      quadSets,
      hamstringSets: hamSets,
      status: lowerStatus,
      comment: lowerComment,
    },
    stretchCoverage: {
      percentage: stretchPct,
      coveredMuscles: Array.from(stretchMusclesCovered),
      missingMuscles: missingStretch,
      comment: stretchPct >= 70 
        ? 'Excelente cobertura de estímulos em posição de alongamento muscular.'
        : `Faltam exercícios sob tensão alongada para: ${missingStretch.join(', ')}.`,
    },
    volumeBreakdown,
    findings,
  };
}

/**
 * Invoca a API Gemini (gemini-3.6-flash) para síntese e auditoria biomecânica de alta fidelidade
 */
async function callGeminiAudit(
  program: WorkoutProgram,
  localAudit: WorkoutAuditResult,
  apiKey: string,
  userNotes?: string
): Promise<WorkoutAuditResult> {
  const routinesSummary = program.routines.map(r => ({
    name: r.name,
    dayOrder: r.orderIndex,
    exercises: r.exercises.map(e => ({
      name: e.exerciseName,
      id: e.exerciseId,
      muscle: e.targetMuscle,
      sets: e.targetSets,
      reps: `${e.targetRepsMin}-${e.targetRepsMax}`,
    })),
  }));

  const systemInstruction = `Você é o Auditor Biomecânico de Alta Performance do heavy.io.
O heavy.io é um app minimalista, sério e de precisão mecânica para atletas de força e hipertrofia baseada em evidências científicas.
Suas respostas devem ser rigorosas, técnicas, sem jargões de autoajuda e sem emojis.
Analise a ficha de treino fornecida, cruze os dados com os cálculos locais já computados e gere um diagnóstico biomecânico em JSON puro.`;

  const prompt = `Analise a seguinte ficha de treino do heavy.io:
Programa: "${program.name}"
${userNotes ? `Observações do Atleta: "${userNotes}"` : ''}

Estrutura das Rotinas:
${JSON.stringify(routinesSummary, null, 2)}

Dados calculados pelo motor cinemático:
- Total Séries Semanais: ${localAudit.totalWeeklySets}
- Carga Axial: Nível ${localAudit.axialFatigue.level} (${localAudit.axialFatigue.score}/100)
- Push/Pull Ratio: ${localAudit.pushPullBalance.ratio} (${localAudit.pushPullBalance.pushSets} empurrar vs ${localAudit.pushPullBalance.pullSets} puxar)
- Quads/Isquiotibiais Ratio: ${localAudit.lowerChainBalance.ratio}
- Cobertura de Hipertrofia sob Alongamento: ${localAudit.stretchCoverage.percentage}%

Retorne ESTRITAMENTE um objeto JSON válido (sem tags de código markdown, sem chaves extras) com o seguinte formato:
{
  "overallScore": number (0 a 100),
  "summary": string (síntese técnica concisa em 2 a 3 frases em PT-BR),
  "findings": [
    {
      "id": string,
      "severity": "critical" | "warning" | "optimization" | "positive",
      "title": string (título sóbrio),
      "description": string (explicação mecânica detalhada),
      "recommendation": string (orientação cirúrgica)
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini retornou resposta vazia.');
  }

  const parsed = JSON.parse(rawText);

  // Mescla a inteligência do LLM com os dados cinemáticos exatos do motor local
  return {
    ...localAudit,
    overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : localAudit.overallScore,
    summary: parsed.summary || localAudit.summary,
    isAiGenerated: true,
    findings: Array.isArray(parsed.findings) && parsed.findings.length > 0
      ? parsed.findings.map((f: any, idx: number) => ({
          id: f.id || `ai_finding_${idx}`,
          severity: ['critical', 'warning', 'optimization', 'positive'].includes(f.severity) ? f.severity : 'optimization',
          title: f.title || 'Observação Biomecânica',
          description: f.description || '',
          recommendation: f.recommendation || '',
        }))
      : localAudit.findings,
  };
}

/**
 * Função principal de Auditoria Biomecânica do Treino.
 * Combina o motor local (0ms, offline-first) com o LLM (Gemini 3.6 Flash) quando disponível.
 */
export async function auditWorkoutProgram(
  program: WorkoutProgram,
  options?: { userNotes?: string; apiKey?: string }
): Promise<WorkoutAuditResult> {
  // 1. Sempre executa a auditoria cinemática local de alta precisão
  const localResult = runLocalKinematicAudit(program);

  // 2. Se houver chave API disponível, enriquece com a síntese do Gemini
  const apiKey = options?.apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      // Timeout de 8 segundos para garantir que o app não trave em redes lentas
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de requisição')), 8000)
      );
      
      const aiResult = await Promise.race([
        callGeminiAudit(program, localResult, apiKey.trim(), options?.userNotes),
        timeoutPromise
      ]);

      return aiResult;
    } catch (err) {
      console.warn('Falha na requisição Gemini, recorrendo ao diagnóstico cinemático local:', err);
      return localResult;
    }
  }

  return localResult;
}

/**
 * Converte uma rotina isolada em um mini-programa temporário para permitir auditoria de um dia específico
 */
export async function auditSingleRoutine(
  routine: Routine,
  options?: { userNotes?: string; apiKey?: string }
): Promise<WorkoutAuditResult> {
  const dummyProgram: WorkoutProgram = {
    id: 'single_routine_eval',
    name: routine.name,
    description: routine.description,
    isActive: true,
    routines: [routine],
    createdAt: routine.createdAt,
  };

  return auditWorkoutProgram(dummyProgram, options);
}
