import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { auth, onAuthStateChanged } from '../src/services/firebase';
import { useUserStore } from '../src/store/userStore';
import Theme from '../src/theme/theme';

export default function RootIndex() {
  const { hasCompletedOnboarding, isGuest } = useUserStore();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setIsAuthenticated(true);
      } else if (isGuest && hasCompletedOnboarding) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [isGuest, hasCompletedOnboarding]);

  if (!isAuthReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="small" color={Theme.colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
