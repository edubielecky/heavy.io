import { Platform, NativeModules } from 'react-native';

/**
 * Atributos imutáveis da Live Activity do Cronômetro de Descanso (ActivityKit / WidgetKit)
 */
export interface RestTimerActivityAttributes {
  exerciseName: string;
  totalDurationSeconds: number;
  startedAt: number;
}

/**
 * Estado dinâmico atualizável da Live Activity / Dynamic Island
 */
export interface RestTimerActivityContentState {
  targetEndTime: number; // Timestamp absoluto em ms
  remainingSeconds: number;
  isPaused: boolean;
}

/**
 * Interface da ponte nativa ActivityKit (se compilada com o módulo Swift do heavy.io)
 */
interface HeavyActivityKitNativeModule {
  isActivityKitSupported?: () => Promise<boolean>;
  startLiveActivity?: (attributes: RestTimerActivityAttributes, contentState: RestTimerActivityContentState) => Promise<string | null>;
  updateLiveActivity?: (activityId: string, contentState: RestTimerActivityContentState) => Promise<boolean>;
  endLiveActivity?: (activityId: string) => Promise<boolean>;
}

const NativeActivityKit: HeavyActivityKitNativeModule | null = 
  Platform.OS === 'ios' ? NativeModules.HeavyActivityKit || null : null;

let currentLiveActivityId: string | null = null;

/**
 * Verifica se Live Activities e ActivityKit estão suportados e disponíveis no dispositivo.
 */
export async function isLiveActivitySupported(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!NativeActivityKit?.isActivityKitSupported) return false;

  try {
    return await NativeActivityKit.isActivityKitSupported();
  } catch {
    return false;
  }
}

/**
 * Inicia a Live Activity na tela de bloqueio e na Dynamic Island no iOS.
 * Mantém um fallback gracioso se executado em ambiente Expo Go sem a extensão nativa Swift.
 */
export async function startRestLiveActivity(
  seconds: number,
  exerciseName?: string
): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;

  const now = Date.now();
  const targetEndTime = now + seconds * 1000;
  const name = exerciseName || 'Série Concluída';

  const attributes: RestTimerActivityAttributes = {
    exerciseName: name,
    totalDurationSeconds: seconds,
    startedAt: now,
  };

  const contentState: RestTimerActivityContentState = {
    targetEndTime,
    remainingSeconds: seconds,
    isPaused: false,
  };

  try {
    if (NativeActivityKit?.startLiveActivity) {
      const activityId = await NativeActivityKit.startLiveActivity(attributes, contentState);
      currentLiveActivityId = activityId;
      return activityId;
    }
  } catch (error) {
    console.warn('ActivityKit: Falha ao iniciar Live Activity nativa:', error);
  }

  return null;
}

/**
 * Atualiza o cronômetro na Live Activity / Dynamic Island (ex.: quando o usuário adiciona +30s).
 */
export async function updateRestLiveActivity(
  remainingSeconds: number,
  targetEndTime: number
): Promise<boolean> {
  if (Platform.OS !== 'ios' || !currentLiveActivityId) return false;

  const contentState: RestTimerActivityContentState = {
    targetEndTime,
    remainingSeconds,
    isPaused: false,
  };

  try {
    if (NativeActivityKit?.updateLiveActivity) {
      return await NativeActivityKit.updateLiveActivity(currentLiveActivityId, contentState);
    }
  } catch (error) {
    console.warn('ActivityKit: Falha ao atualizar Live Activity:', error);
  }

  return false;
}

/**
 * Finaliza a Live Activity ao término do descanso ou ao pular o timer.
 */
export async function endRestLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios' || !currentLiveActivityId) return;

  try {
    if (NativeActivityKit?.endLiveActivity) {
      await NativeActivityKit.endLiveActivity(currentLiveActivityId);
    }
  } catch (error) {
    console.warn('ActivityKit: Falha ao encerrar Live Activity:', error);
  } finally {
    currentLiveActivityId = null;
  }
}
