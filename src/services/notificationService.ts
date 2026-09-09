import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../store/userStore';

// ID único do canal do cronômetro de descanso para Android
export const REST_TIMER_CHANNEL_ID = 'rest_timer_channel';

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
 * Inicializa os canais de notificação no Android e solicita permissões se necessário.
 */
export async function initNotificationService(): Promise<void> {
  if (Platform.OS === 'web' || isInitialized) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
        name: 'Cronômetro de Descanso',
        description: 'Notificações de conclusão do intervalo de descanso entre séries',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FFFFFF',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: false,
      });
    }

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
 * Agenda a notificação local para disparar no término do descanso.
 * Cancela qualquer notificação anterior para manter sincronização estrita de 1 timer por vez.
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

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate,
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
    return id;
  } catch (error) {
    console.warn('Falha ao agendar notificação de descanso:', error);
    return null;
  }
}

/**
 * Cancela o agendamento da notificação de descanso em andamento.
 */
export async function cancelRestTimerNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (currentScheduledNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(currentScheduledNotificationId);
      currentScheduledNotificationId = null;
    }
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

