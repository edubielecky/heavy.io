import React, { useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dumbbell, ListPlus, History, Trophy } from 'lucide-react-native';
import Theme from '../../src/theme/theme';
import { auth, onAuthStateChanged } from '../../src/services/firebase';
import { useUserStore } from '../../src/store/userStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(8, insets.bottom);
  const barHeight = 54 + bottomPadding;

  const { isGuest, hasCompletedOnboarding } = useUserStore();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const isAuthenticated = Boolean(currentUser || (isGuest && hasCompletedOnboarding));

  // Bloqueio rigoroso de segurança: atleta deslogado não pode visualizar as tabs
  if (authInitialized && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: Theme.colors.surface,
          borderTopColor: Theme.colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Treino',
          tabBarIcon: ({ color, size }) => <Dumbbell size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercícios',
          tabBarIcon: ({ color, size }) => <ListPlus size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <History size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Estatísticas',
          tabBarIcon: ({ color, size }) => <Trophy size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
