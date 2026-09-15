import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Tela inicial de login (tela 0)
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { Platform, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../src/database/database';
import { 
  initNotificationService, 
  requestNotificationPermissions,
  REST_ACTION_ADD_30,
  REST_ACTION_SKIP 
} from '../src/services/notificationService';
import { initSyncQueue } from '../src/services/syncQueueService';
import { useWorkoutStore } from '../src/store/workoutStore';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      try {
        initDatabase();
        if (Platform.OS !== 'web') {
          initNotificationService();
          requestNotificationPermissions();
        }
        initSyncQueue();
      } catch (e) {
        console.warn('Failed to initialize SQLite, Notifications, or SyncQueue:', e);
      }
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Listener para ações disparadas na tela de bloqueio (+30s, Pular) e notificações recebidas
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data;

      if (actionId === REST_ACTION_ADD_30) {
        // Atleta tocou em "+30s" diretamente na tela de bloqueio
        try {
          useWorkoutStore.getState().addRestTimerSeconds(30);
        } catch (err) {
          console.warn('Erro ao processar +30s na lock screen:', err);
        }
      } else if (actionId === REST_ACTION_SKIP) {
        // Atleta tocou em "Pular" diretamente na tela de bloqueio
        try {
          useWorkoutStore.getState().stopRestTimer();
        } catch (err) {
          console.warn('Erro ao pular descanso na lock screen:', err);
        }
      } else if (data?.type === 'REST_TIMER_COMPLETED') {
        // Notificação de descanso concluído interagida pelo usuário
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

const isWeb = Platform.OS === 'web';

function RootLayoutNav() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <View style={isWeb ? styles.webOuter : styles.nativeOuter}>
          <View style={isWeb ? styles.mobileShell : styles.nativeShell}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090B' } }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding-advanced" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding-guided" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
            </Stack>
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  nativeOuter: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  nativeShell: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  webOuter: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    height: '100%',
    backgroundColor: '#09090B',
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
  },
});
