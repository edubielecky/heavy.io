import { Platform } from 'react-native';
import { WorkoutSession } from '../types/workout';
import { 
  getHealthConnectStatus, 
  requestHealthConnectAccess, 
  importBiometricsFromHealthConnect, 
  exportWorkoutSessionToHealthConnect,
  fetchHeartRateMetricsFromHealthConnect
} from './healthConnectService';
import { 
  getAppleHealthStatus, 
  requestAppleHealthPermissions, 
  importBiometricsFromAppleHealth, 
  exportWorkoutSessionToAppleHealth,
  fetchHeartRateMetricsFromAppleHealth
} from './appleHealthService';

export interface UnifiedHealthStatus {
  platform: 'ios' | 'android' | 'other';
  providerName: string;
  isSupported: boolean;
  isAvailable: boolean;
  hasPermissions: boolean;
  message: string;
}

export interface SessionHeartRateResult {
  avgBpm?: number;
  peakBpm?: number;
  samplesCount: number;
}

/**
 * Retorna o status de conexão com o ecossistema de saúde nativo (Apple Health no iOS ou Health Connect no Android)
 */
export async function getUnifiedHealthStatus(): Promise<UnifiedHealthStatus> {
  if (Platform.OS === 'ios') {
    const iosStatus = await getAppleHealthStatus();
    return {
      platform: 'ios',
      providerName: 'Apple Health',
      ...iosStatus,
    };
  }

  if (Platform.OS === 'android') {
    const androidStatus = await getHealthConnectStatus();
    return {
      platform: 'android',
      providerName: 'Google Health Connect',
      ...androidStatus,
    };
  }

  return {
    platform: 'other',
    providerName: 'Health API',
    isSupported: false,
    isAvailable: false,
    hasPermissions: false,
    message: 'Ambiente não suporta sincronização de saúde nativa (apenas iOS ou Android).',
  };
}

/**
 * Solicita autorizações de leitura e escrita para o provedor nativo
 */
export async function requestUnifiedHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return requestAppleHealthPermissions();
  }
  if (Platform.OS === 'android') {
    return requestHealthConnectAccess();
  }
  return false;
}

/**
 * Importa dados biométricos (Peso e Altura) do ecossistema nativo
 */
export async function importUnifiedBiometrics(): Promise<{
  weightKg?: number;
  heightCm?: number;
  success: boolean;
  message: string;
}> {
  if (Platform.OS === 'ios') {
    return importBiometricsFromAppleHealth();
  }
  if (Platform.OS === 'android') {
    return importBiometricsFromHealthConnect();
  }
  return { success: false, message: 'Plataforma não suportada.' };
}

/**
 * Consulta batimentos cardíacos (BPM médio e pico) registrados pelo smartwatch durante o treino
 */
export async function fetchSessionHeartRateMetrics(
  startTime: string,
  endTime: string
): Promise<SessionHeartRateResult> {
  if (Platform.OS === 'ios') {
    return fetchHeartRateMetricsFromAppleHealth(startTime, endTime);
  }
  if (Platform.OS === 'android') {
    return fetchHeartRateMetricsFromHealthConnect(startTime, endTime);
  }
  return { samplesCount: 0 };
}

/**
 * Exporta a sessão de força completa para Apple Health ou Google Health Connect
 */
export async function syncWorkoutSessionToHealth(
  session: WorkoutSession
): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return exportWorkoutSessionToAppleHealth(session);
  }
  if (Platform.OS === 'android') {
    return exportWorkoutSessionToHealthConnect(session);
  }
  return false;
}
