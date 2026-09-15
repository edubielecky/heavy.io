import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';
import Theme from '../theme/theme';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  asSafeArea?: boolean;
}

/**
 * Contêiner inteligente para telas e modais, otimizado para dispositivos dobráveis (Galaxy Z Fold 6, Pixel 9 Pro Fold).
 * Em telas compactas, preenche 100% da tela sem criar barras pretas desnecessárias.
 * Em telas dobráveis abertas (>= 600dp), centraliza o conteúdo com largura ergonômica elegante.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  contentStyle,
  asSafeArea = true,
}) => {
  const { isFoldable, maxContentWidth } = useResponsive();

  const ContainerComponent = asSafeArea ? SafeAreaView : View;

  return (
    <ContainerComponent style={[styles.outer, style]}>
      <View
        style={[
          styles.inner,
          isFoldable && {
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
