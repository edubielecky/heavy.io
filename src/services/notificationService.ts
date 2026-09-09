import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../store/userStore';
import {
  startRestLiveActivity,
  updateRestLiveActivity,
  endRestLiveActivity,
} from './liveActivityService';

// IDs dos canais e categorias de notificação
export const REST_TIMER_CHANNEL_ID = 'rest_timer_channel';
export const REST_TIMER_CATEGORY = 'REST_TIMER_CATEGORY';
export const REST_ACTION_ADD_30 = 'ADD_30_SECONDS';
export const REST_ACTION_SKIP = 'SKIP_REST';
export const ONGOING_REST_NOTIFICATION_ID = 'heavy_ongoing_rest_timer';

let currentScheduledNotificationId: string | null = null;
let isInitialized = false;

/**
 * Configuração do handler para apresentação de notificações locais
 * Garante alerta na tela (banner/list), som e vibração mesmo com app em foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const prefs = useUserStore.getState().preferences;
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: prefs?.soundEnabled ?? true,
      shouldSetBadge: false,
    };
  },
});

/**
 * Inicializa os canais de notificação no Android, categorias de ação rápida (Lock Screen) e permissões.
 */
export async function initNotificationService(): Promise<void> {
  if (Platform.OS === 'web' || isInitialized) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
        name: 'Cronômetro de Descanso',
        description: 'Acompanhamento ao vivo do descanso entre séries na tela de bloqueio',
        importance: Notifications.AndroidImportance.MAX,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FFFFFF',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: false,
      });
    }

    // Configura botões de ação rápida para interagir na Lock Screen sem abrir o app
    await Notifications.setNotificationCategoryAsync(REST_TIMER_CATEGORY, [
      {
        identifier: REST_ACTION_ADD_30,
        buttonTitle: '+30s',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: REST_ACTION_SKIP,
        buttonTitle: 'Pular',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ]);

    isInitialized = true;
  } catch (error) {
    console.warn('Aviso: Falha ao inicializar canais de notificação:', error);
  }
}

/**
 * Solicita permissões de notificação ao usuário caso ainda não concedidas.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const existingStatus = await Notifications.getPermissionsAsync();
    if (
      existingStatus.granted ||
      existingStatus.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    const permissionResult = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return (
      permissionResult.granted ||
      permissionResult.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (err) {
    console.warn('Erro ao solicitar permissões de notificação:', err);
    return false;
  }
}

/**
 * Exibe ou atualiza a notificação persistente na tela de bloqueio (Ongoing no Android / Interativa no iOS).
 */
export async function presentOngoingRestTimerNotification(
  seconds: number,
  exerciseName?: string
): Promise<void> {
  if (Platform.OS === 'web' || seconds <= 0) return;

  try {
    if (!isInitialized) {
      await initNotificationService();
    }

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const name = exerciseName || 'Série Concluída';

    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_REST_NOTIFICATION_ID,
      content: {
        title: `Descanso • ${formatted}`,
        subtitle: name,
        body: `${name} — cronômetro ativo. Use as ações abaixo na tela de bloqueio:`,
        categoryIdentifier: REST_TIMER_CATEGORY,
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
        interruptionLevel: 'timeSensitive',
        data: {
          type: 'ONGOING_REST_TIMER',
          exerciseName: name,
          targetEndTime: Date.now() + seconds * 1000,
        },
      },
      trigger: null, // Imediato
    });
  } catch (error) {
    console.warn('Falha ao apresentar notificação contínua de descanso:', error);
  }
}

/**
 * Remove a notificação fixa da tela de bloqueio.
 */
export async function dismissOngoingRestTimerNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.dismissNotificationAsync(ONGOING_REST_NOTIFICATION_ID);
  } catch {
    // Silencia se já foi descartada
  }
}

/**
 * Agenda a notificação local para disparar no término do descanso e exibe notificação contínua na Lock Screen.
 *
 * @param seconds Tempo restante em segundos
 * @param exerciseName Nome do exercício correspondente
 */
export async function scheduleRestTimerNotification(
  seconds: number,
  exerciseName?: string
): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;

  try {
    // 1. Garante que os canais estão configurados
    if (!isInitialized) {
      await initNotificationService();
    }

    // 2. Cancela agendamento anterior para evitar duplicidade
    await cancelRestTimerNotification();

    const roundedSeconds = Math.max(1, Math.round(seconds));
    const title = 'Descanso Finalizado';
    const body = exerciseName
      ? `Hora da próxima série de ${exerciseName}!`
      : 'Hora da próxima série! Foco e sobrecarga.';

    const prefs = useUserStore.getState().preferences;
    const sound = prefs?.soundEnabled ?? true;
    const vibrate = prefs?.vibrationEnabled ? [0, 500, 200, 500] : undefined;

    // Agenda o alarme para quando o timer zerar
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate,
        interruptionLevel: 'timeSensitive',
        data: {
          type: 'REST_TIMER_COMPLETED',
          exerciseName: exerciseName || '',
          scheduledAt: Date.now(),
          targetEndTime: Date.now() + roundedSeconds * 1000,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: roundedSeconds,
        channelId: REST_TIMER_CHANNEL_ID,
        repeats: false,
      },
    });

    currentScheduledNotificationId = id;

    // 3. Apresenta notificação contínua na Lock Screen com botões de ação rápidos (+30s, Pular)
    await presentOngoingRestTimerNotification(seconds, exerciseName);

    // 4. Inicia ou atualiza Live Activity no iOS (ActivityKit)
    await startRestLiveActivity(seconds, exerciseName);

    return id;
  } catch (error) {
    console.warn('Falha ao agendar notificação de descanso:', error);
    return null;
  }
}

/**
 * Cancela o agendamento da notificação de descanso e remove notificações da Lock Screen e Live Activities.
 */
export async function cancelRestTimerNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (currentScheduledNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(currentScheduledNotificationId);
      currentScheduledNotificationId = null;
    }
    await dismissOngoingRestTimerNotification();
    await endRestLiveActivity();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Erro ao cancelar notificações de descanso:', error);
  }
}

/**
 * Feedback tátil cirúrgico e vigoroso para término do descanso (quando o app está em primeiro plano).
 */
export async function triggerRestFinishedHaptics(): Promise<void> {
  const prefs = useUserStore.getState().preferences;
  if (prefs?.vibrationEnabled === false) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 200);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 450);
  } catch {
    // Silencia em plataformas sem suporte
  }
}

