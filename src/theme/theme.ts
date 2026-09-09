export const Theme = {
  colors: {
    // Fundos (Preto profundo e Zinco escuro)
    background: '#09090B',
    surface: '#121215',
    surfaceElevated: '#18181B',
    surfaceCard: '#141417',
    
    // Bordas estruturais sutis
    border: '#27272A',
    borderLight: '#3F3F46',
    
    // Ação Primária: Branco / Titânio de alto contraste
    primary: '#FFFFFF',
    primaryDark: '#E4E4E7',
    primaryMuted: 'rgba(255, 255, 255, 0.08)',
    
    // Acentos Funcionais e Contidos (sem neons/glows)
    accentTitanium: '#D4D4D8',
    accentTitaniumMuted: 'rgba(212, 212, 216, 0.10)',

    accentFlame: '#F43F5E', // Destaque sóbrio
    accentFlameMuted: 'rgba(244, 63, 94, 0.12)',

    accentPurple: '#A855F7',
    
    // Status
    success: '#10B981', // Verde esmeralda técnico
    successMuted: 'rgba(16, 185, 129, 0.12)',
    warning: '#F59E0B',
    danger: '#EF4444',
    
    // Tipografia
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textInverse: '#09090B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },
};

export default Theme;
