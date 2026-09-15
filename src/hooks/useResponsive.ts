import { useWindowDimensions } from 'react-native';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isLandscape: boolean;
  /** Dispositivo dobrável aberto (unfolded) ou tablet com tela ampla (>= 600dp) */
  isFoldable: boolean;
  /** Smartphone padrão ou dobrável fechado (< 600dp) */
  isCompact: boolean;
  /** Tela externa muito estreita, típica de Fold fechado (< 380dp) */
  isNarrowCover: boolean;
  /** Largura máxima sugerida para o contêiner de leitura e controle */
  maxContentWidth: number | undefined;
  /** Largura máxima sugerida para modais e cartões de ação */
  modalMaxWidth: number;
  /** Largura máxima para a barra inferior de navegação (ergonomia dos polegares) */
  tabBarMaxWidth: number | undefined;
  /** Número de colunas sugerido para catálogos, listas e dashboards */
  numColumns: number;
  /** Padding horizontal dinâmico */
  horizontalPadding: number;
}

/**
 * Hook reativo para suporte a dobráveis (Samsung Galaxy Z Fold 6, Google Pixel 9 Pro Fold, etc.)
 * Reage imediatamente à transição de dobra/desdobra sem recarregar a aplicação.
 */
export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  // Foldables abertos (Z Fold 6 ~768-800dp, Pixel 9 Pro Fold ~840dp) têm largura >= 600dp
  const isFoldable = width >= 600;
  const isCompact = width < 600;
  const isNarrowCover = width < 380;

  // Em telas dobradas ou smartphones padrão, aproveita 100% da largura com paddings seguros.
  // Em telas dobradas/abertas, centraliza com até 840dp para evitar linhas esticadas e desconfortáveis.
  const maxContentWidth = isFoldable ? Math.min(width - 32, 840) : undefined;

  // Modais elegantes centralizados em dobráveis
  const modalMaxWidth = isFoldable ? Math.min(width - 48, 600) : 480;

  // Ergonomia da barra de abas inferior: evita que os botões fiquem a 800px de distância nos cantos
  const tabBarMaxWidth = isFoldable ? 560 : undefined;

  const numColumns = isFoldable ? 2 : 1;

  const horizontalPadding = isNarrowCover ? 12 : isFoldable ? 24 : 16;

  return {
    width,
    height,
    isLandscape,
    isFoldable,
    isCompact,
    isNarrowCover,
    maxContentWidth,
    modalMaxWidth,
    tabBarMaxWidth,
    numColumns,
    horizontalPadding,
  };
}
