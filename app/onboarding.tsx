import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  Sliders, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  Circle,
  Dumbbell,
  Sparkles,
  Layers,
  Zap,
  Check
} from 'lucide-react-native';
import Theme from '../src/theme/theme';
import { useUserStore, OnboardingTrack } from '../src/store/userStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const { onboardingTrack, setOnboardingTrack } = useUserStore();

  const [selectedTrack, setSelectedTrack] = useState<OnboardingTrack>(
    onboardingTrack || 'advanced'
  );

  const handleSelectTrack = (track: OnboardingTrack) => {
    setSelectedTrack(track);
    setOnboardingTrack(track);
    Haptics.selectionAsync().catch(() => {});
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setOnboardingTrack(selectedTrack);
    
    if (selectedTrack === 'advanced') {
      router.push('/onboarding-advanced' as any);
    } else {
      Alert.alert(
        'Fluxo Guiado Selecionado',
        'Você escolheu "Montar para mim". A seguir iremos construir o questionário e algoritmo de montagem guiada.',
        [{ text: 'Entendido', style: 'default' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Superior */}
        <View style={styles.header}>
          <View style={styles.badgeStep}>
            <Layers size={13} color={Theme.colors.primary} />
            <Text style={styles.badgeStepText}>PRIMEIRO ACESSO • DEFINIÇÃO DE FLUXO</Text>
          </View>
          <Text style={styles.title}>Como deseja estruturar seu treino?</Text>
          <Text style={styles.subtitle}>
            Personalize sua experiência de acordo com seu grau de controle e autonomia no treino de força.
          </Text>
        </View>

        {/* Opções de Bifurcação do Fluxo */}
        <View style={styles.cardsContainer}>
          {/* 1. OPÇÃO AVANÇADO (JÁ TENHO A MINHA ROTINA) */}
          <TouchableOpacity
            style={[
              styles.trackCard,
              selectedTrack === 'advanced' && styles.trackCardActive
            ]}
            onPress={() => handleSelectTrack('advanced')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, selectedTrack === 'advanced' && styles.iconBoxActive]}>
                <Sliders size={20} color={selectedTrack === 'advanced' ? Theme.colors.textInverse : Theme.colors.primary} />
              </View>
              <View style={styles.cardTitleArea}>
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeTagText}>CONTROLE TOTAL</Text>
                </View>
                <Text style={styles.trackTitle}>Avançado</Text>
                <Text style={styles.trackSub}>Já tenho a minha rotina</Text>
              </View>
              <View style={styles.checkArea}>
                {selectedTrack === 'advanced' ? (
                  <CheckCircle2 size={22} color={Theme.colors.primary} />
                ) : (
                  <Circle size={22} color={Theme.colors.borderLight} />
                )}
              </View>
            </View>

            <Text style={styles.cardDescription}>
              Para atletas experientes que já possuem divisões consolidadas (Push/Pull/Legs, Upper/Lower, periodizações personalizadas).
            </Text>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Check size={14} color={Theme.colors.primary} />
                <Text style={styles.featureText}>Montagem manual de rotinas e fichas</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={14} color={Theme.colors.primary} />
                <Text style={styles.featureText}>Definição direta de cargas alvo e repetições</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={14} color={Theme.colors.primary} />
                <Text style={styles.featureText}>Acesso ágil ao diário de sobrecarga progressiva</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2. OPÇÃO GUIADO (MONTAR PARA MIM) */}
          <TouchableOpacity
            style={[
              styles.trackCard,
              selectedTrack === 'guided' && styles.trackCardActive
            ]}
            onPress={() => handleSelectTrack('guided')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, selectedTrack === 'guided' && styles.iconBoxActive]}>
                <Compass size={20} color={selectedTrack === 'guided' ? Theme.colors.textInverse : Theme.colors.primary} />
              </View>
              <View style={styles.cardTitleArea}>
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeTagText}>ASSISTIDO</Text>
                </View>
                <Text style={styles.trackTitle}>Guiado</Text>
                <Text style={styles.trackSub}>Montar para mim</Text>
              </View>
              <View style={styles.checkArea}>
                {selectedTrack === 'guided' ? (
                  <CheckCircle2 size={22} color={Theme.colors.primary} />
                ) : (
                  <Circle size={22} color={Theme.colors.borderLight} />
                )}
              </View>
            </View>

            <Text style={styles.cardDescription}>
              O heavy.io formula uma rotina técnica baseada nos seus objetivos, dias disponíveis e foco biomecânico ideal.
            </Text>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Check size={14} color={Theme.colors.primary} />
                <Text style={styles.featureText}>Divisão inteligente para seus dias na semana</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={14} color={Theme.colors.primary} />
                <Text style={styles.featureText}>Seleção balanceada de compostos e isoladores</Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={14} color={Theme.colors.primary} />
                <Text style={styles.featureText}>Recomendações técnicas de descanso e volume</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Botão de Confirmação da Escolha */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {selectedTrack === 'advanced' 
              ? 'Continuar com Fluxo Avançado' 
              : 'Continuar com Fluxo Guiado'}
          </Text>
          <ArrowRight size={18} color={Theme.colors.textInverse} />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Essa escolha define apenas o ponto de partida. Você sempre terá liberdade para criar ou editar qualquer ficha posteriormente.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 24,
  },
  badgeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeStepText: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 19,
    marginTop: 6,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  trackCard: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  trackCardActive: {
    backgroundColor: '#18181B',
    borderColor: Theme.colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: Theme.colors.primary,
  },
  cardTitleArea: {
    flex: 1,
  },
  badgeTag: {
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 4,
  },
  badgeTagText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  trackSub: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  checkArea: {
    paddingTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  featuresList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 50,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  continueButtonText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerNote: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },
});
