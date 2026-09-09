import { Platform } from 'react-native';
import { 
  initialize, 
  getSdkStatus, 
  requestPermission, 
  getGrantedPermissions, 
  readRecords, 
  insertRecords,
  openHealthConnectSettings
} from 'react-native-health-connect';
import { useUserStore } from '../store/userStore';
import { WorkoutSession } from '../types/workout';

// Constante do Health Connect para STRENGTH_TRAINING
export const EXERCISE_TYPE_STRENGTH_TRAINING = 70;

export interface HealthConnectStatus {
  isSupported: boolean;
  isAvailable: boolean;
  hasPermissions: boolean;
  message: string;
}

const REQUIRED_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Weight' as const },
  { accessType: 'read' as const, recordType: 'Height' as const },
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'write' as const, recordType: 'ExerciseSession' as const },
  { accessType: 'write' as const, recordType: 'TotalCaloriesBurned' as const },
];

/**
 * Verifica disponibilidade e status de permissões do Google Health Connect
 */
export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  if (Platform.OS !== 'android') {
    return {
      isSupported: false,
      isAvailable: false,
      hasPermissions: false,
      message: 'Health Connect é exclusivo para Android (no iOS utilize Apple Health).',
    };
  }

  try {
    const status = await getSdkStatus();
    // SdkAvailabilityStatus.SDK_AVAILABLE = 3
    if (status !== 3) {
      return {
        isSupported: true,
        isAvailable: false,
        hasPermissions: false,
        message: 'Aplicativo Health Connect precisa ser instalado ou atualizado.',
      };
    }

    const initialized = await initialize();
    if (!initialized) {
      return {
        isSupported: true,
        isAvailable: false,
        hasPermissions: false,
        message: 'Falha ao inicializar o Health Connect.',
      };
    }

    const granted = await getGrantedPermissions();
    const hasReadWeight = granted.some(p => 'recordType' in p && p.recordType === 'Weight' && p.accessType === 'read');
    const hasWriteExercise = granted.some(p => 'recordType' in p && p.recordType === 'ExerciseSession' && p.accessType === 'write');

    const hasAll = hasReadWeight && hasWriteExercise;

    return {
      isSupported: true,
      isAvailable: true,
      hasPermissions: hasAll,
      message: hasAll ? 'Conectado e sincronizado com Google Health Connect' : 'Permissões parciais ou pendentes',
    };
  } catch (error: any) {
    return {
      isSupported: true,
      isAvailable: false,
      hasPermissions: false,
      message: error?.message || 'Serviço do Health Connect indisponível neste dispositivo.',
    };
  }
}

/**
 * Solicita ao usuário as permissões de leitura e gravação no Health Connect
 */
export async function requestHealthConnectAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    await initialize();
    const granted = await requestPermission(REQUIRED_PERMISSIONS);
    return granted.length > 0;
  } catch (err) {
    console.warn('Erro ao solicitar permissões do Health Connect:', err);
    return false;
  }
}

/**
 * Abre as configurações do Health Connect do sistema
 */
export function openSettings(): void {
  if (Platform.OS === 'android') {
    try {
      openHealthConnectSettings();
    } catch {}
  }
}

/**
 * Puxa os dados biométricos mais recentes do Health Connect (Peso e Altura)
 * e atualiza o perfil do atleta localmente no userStore.
 */
export async function importBiometricsFromHealthConnect(): Promise<{
  success: boolean;
  weightKg?: number;
  heightCm?: number;
  message: string;
}> {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Disponível apenas em dispositivos Android.' };
  }

  try {
    await initialize();

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const now = new Date().toISOString();

    let importedWeight: number | undefined;
    let importedHeight: number | undefined;

    // 1. Busca peso corporal recente
    try {
      const weightResult = await readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: ninetyDaysAgo,
          endTime: now,
        },
      });

      if (weightResult.records && weightResult.records.length > 0) {
        // Ordena para pegar o registro mais recente
        const sorted = [...weightResult.records].sort((a, b) => 
          new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        importedWeight = Math.round(sorted[0].weight.inKilograms * 10) / 10;
      }
    } catch (e) {
      console.warn('Aviso: Não foi possível ler registros de peso:', e);
    }

    // 2. Busca estatura recente
    try {
      const heightResult = await readRecords('Height', {
        timeRangeFilter: {
          operator: 'between',
          startTime: new Date(Date.now() - 365 * 86400000).toISOString(),
          endTime: now,
        },
      });

      if (heightResult.records && heightResult.records.length > 0) {
        const sorted = [...heightResult.records].sort((a, b) => 
          new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        importedHeight = Math.round(sorted[0].height.inMeters * 100);
      }
    } catch (e) {
      console.warn('Aviso: Não foi possível ler registros de altura:', e);
    }

    if (importedWeight !== undefined || importedHeight !== undefined) {
      const updates: { bodyWeightKg?: number; heightCm?: number } = {};
      if (importedWeight !== undefined) updates.bodyWeightKg = importedWeight;
      if (importedHeight !== undefined) updates.heightCm = importedHeight;

      useUserStore.getState().updateMetrics(updates);

      return {
        success: true,
        weightKg: importedWeight,
        heightCm: importedHeight,
        message: `Métricas atualizadas: ${importedWeight ? `${importedWeight} kg` : ''} ${importedHeight ? `${importedHeight} cm` : ''}`.trim(),
      };
    }

    return {
      success: false,
      message: 'Nenhum registro recente de peso ou altura encontrado no Health Connect.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Falha ao importar dados do Health Connect.',
    };
  }
}

/**
 * Converte e exporta uma sessão de treino de força concluída para o Google Health Connect
 */
export async function exportWorkoutSessionToHealthConnect(
  session: WorkoutSession
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    await initialize();

    const startTime = session.startTime;
    const duration = Math.max(60, session.durationSeconds || 1800);
    const endTime = session.endTime || new Date(new Date(startTime).getTime() + duration * 1000).toISOString();

    const athleteWeight = useUserStore.getState().profile?.bodyWeightKg || 80;
    // Estimativa de queima calórica para treino de força (MET ~5.5)
    const durationMinutes = duration / 60;
    const estimatedCalories = Math.max(40, Math.round((durationMinutes * 5.5 * athleteWeight) / 60));

    const exercisesSummary = session.exercises
      .map(e => `${e.exerciseName} (${e.sets.filter(s => s.completed).length} séries)`)
      .join(', ');

    const notes = `heavy.io: ${Math.round(session.totalTonnageKg)} kg total levantado • ${session.totalSets} séries concluídas. ${exercisesSummary ? `[${exercisesSummary}]` : ''}`.trim();

    // 1. Registro de Sessão de Exercício (Tipo 70 = STRENGTH_TRAINING)
    const exerciseRecord: any = {
      recordType: 'ExerciseSession',
      exerciseType: EXERCISE_TYPE_STRENGTH_TRAINING,
      title: session.name || 'Treino de Força (heavy.io)',
      notes,
      startTime,
      endTime,
    };

    // 2. Registro de Calorias Ativas
    const caloriesRecord: any = {
      recordType: 'TotalCaloriesBurned',
      startTime,
      endTime,
      energy: {
        inKilocalories: estimatedCalories,
      },
    };

    await insertRecords([exerciseRecord, caloriesRecord]);
    return true;
  } catch (err) {
    console.warn('Erro ao exportar treino para o Health Connect:', err);
    return false;
  }
}

/**
 * Consulta amostras de frequência cardíaca (HeartRateRecord) registradas durante a sessão de treino
 * para calcular o BPM Médio e o Pico Máximo de BPM.
 */
export async function fetchHeartRateMetricsFromHealthConnect(
  startTime: string,
  endTime: string
): Promise<{ avgBpm?: number; peakBpm?: number; samplesCount: number }> {
  if (Platform.OS !== 'android') {
    return { samplesCount: 0 };
  }

  try {
    await initialize();

    const records: any = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    if (!records || !Array.isArray(records) || records.length === 0) {
      return { samplesCount: 0 };
    }

    let allSamples: number[] = [];

    // Cada HeartRateRecord possui um array `samples` com { time, beatsPerMinute }
    records.forEach((record: any) => {
      if (Array.isArray(record.samples)) {
        record.samples.forEach((sample: any) => {
          const bpm = Number(sample.beatsPerMinute);
          if (bpm > 30 && bpm < 250) {
            allSamples.push(bpm);
          }
        });
      }
    });

    if (allSamples.length === 0) {
      return { samplesCount: 0 };
    }

    const peakBpm = Math.max(...allSamples);
    const avgBpm = Math.round(allSamples.reduce((a, b) => a + b, 0) / allSamples.length);

    return {
      avgBpm,
      peakBpm,
      samplesCount: allSamples.length,
    };
  } catch (err) {
    console.warn('Erro ao consultar frequência cardíaca no Health Connect:', err);
    return { samplesCount: 0 };
  }
}

/**
 * Exporta em lote o histórico de treinos concluídos para o Google Health Connect
 */
export async function exportAllWorkoutsToHealthConnect(
  history: WorkoutSession[]
): Promise<{ total: number; exported: number }> {
  if (Platform.OS !== 'android') return { total: 0, exported: 0 };

  let exported = 0;
  const completedSessions = history.filter(s => s.isCompleted);

  for (const session of completedSessions) {
    const success = await exportWorkoutSessionToHealthConnect(session);
    if (success) exported++;
  }

  return { total: completedSessions.length, exported };
}
