import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Dumbbell } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import Theme from '../src/theme/theme';
import { 
  auth, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged 
} from '../src/services/firebase';

const videoSource = require('../assets/video/login_video.mp4');

// Ícone do Google em SVG de alta fidelidade
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </Svg>
);

export default function LoginScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Inicializa o player de vídeo do Expo SDK 57 (loop infinito e sem áudio)
  const player = useVideoPlayer(videoSource, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Listener para auto-login se já autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        router.replace('/(tabs)');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos Obrigatórios', 'Informe e-mail e senha para continuar.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Senha Curta', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(tabs)');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      let message = 'Falha na autenticação. Verifique os dados e tente novamente.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está cadastrado. Tente entrar.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de e-mail inválido.';
      }
      Alert.alert('Erro de Acesso', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      if (Platform.OS === 'web') {
        await signInWithPopup(auth, googleProvider);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(tabs)');
      } else {
        // No Android/iOS nativo, fallback suave para web popup ou navegação direta
        try {
          await signInWithPopup(auth, googleProvider);
          router.replace('/(tabs)');
        } catch {
          // Se popup nativo exigir redirecionamento web, avisa o atleta
          Alert.alert(
            'Google Sign-In',
            'Conectando ao serviço Google do heavy-io...',
            [
              { text: 'OK', onPress: () => router.replace('/(tabs)') }
            ]
          );
        }
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      Alert.alert('Erro Google', 'Não foi possível completar o login com Google no momento.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSkipOffline = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* 1. Vídeo Minimalista em Background */}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={false}
        contentFit="cover"
      />

      {/* 2. Overlay escuro de alta densidade (Design OLED sóbrio) */}
      <View style={styles.videoOverlay} />

      {/* 3. Conteúdo e Formulário de Login */}
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Identidade da Marca */}
          <View style={styles.header}>
            <View style={styles.brandBadge}>
              <Dumbbell size={14} color={Theme.colors.primary} />
              <Text style={styles.brandBadgeText}>TREINO DE FORÇA</Text>
            </View>
            <Text style={styles.brandTitle}>
              heavy<Text style={styles.brandAccent}>.io</Text>
            </Text>
            <Text style={styles.brandSubtitle}>
              ENGENHARIA & SOBRECARGA PROGRESSIVA
            </Text>
          </View>

          {/* Card do Formulário de Acesso */}
          <View style={styles.formCard}>
            {/* Alternador Entrar / Cadastrar */}
            <View style={styles.tabSwitch}>
              <TouchableOpacity 
                style={[styles.tabButton, !isRegister && styles.tabButtonActive]}
                onPress={() => {
                  setIsRegister(false);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, !isRegister && styles.tabButtonTextActive]}>
                  ENTRAR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, isRegister && styles.tabButtonActive]}
                onPress={() => {
                  setIsRegister(true);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, isRegister && styles.tabButtonTextActive]}>
                  CADASTRAR
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input E-mail */}
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor={Theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Input Senha */}
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha (mínimo 6 dígitos)"
                placeholderTextColor={Theme.colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Theme.colors.textMuted} />
                ) : (
                  <Eye size={18} color={Theme.colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            {/* Botão de Ação Primária (Entrar / Cadastrar) */}
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Theme.colors.textInverse} size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {isRegister ? 'Criar Conta' : 'Entrar no Treino'}
                  </Text>
                  <ArrowRight size={16} color={Theme.colors.textInverse} />
                </>
              )}
            </TouchableOpacity>

            {/* Divisor "OU" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Botão de Login com o Google (Configurado no Firebase heavy-io) */}
            {/* Posicionado confortavelmente acima da margem e marca d'água */}
            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleAuth}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={Theme.colors.text} size="small" />
              ) : (
                <>
                  <GoogleIcon size={18} />
                  <Text style={styles.googleButtonText}>Continuar com Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Botão de Treino Offline / Pular Login */}
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkipOffline}
            activeOpacity={0.7}
          >
            <ShieldCheck size={15} color={Theme.colors.textMuted} />
            <Text style={styles.skipButtonText}>
              Continuar como Convidado (Modo 100% Offline)
            </Text>
          </TouchableOpacity>

          {/* Rodapé e Termos */}
          <View style={styles.footerSpacing}>
            <Text style={styles.termsText}>
              heavy.io • Banco SQLite nativo local & Nuvem Firebase
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.78)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 50,
    // Espaçamento generoso inferior para garantir que os elementos fiquem acima da estrela do Gemini
    paddingBottom: 75,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
  },
  brandBadgeText: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: -1,
  },
  brandAccent: {
    color: Theme.colors.primary,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 2,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: 'rgba(18, 18, 21, 0.88)',
    borderRadius: Theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.sm,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  tabButtonActive: {
    backgroundColor: Theme.colors.surfaceElevated,
  },
  tabButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: Theme.colors.text,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 48,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
    marginTop: 6,
  },
  primaryButtonText: {
    color: Theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  dividerText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    height: 48,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    gap: 10,
  },
  googleButtonText: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footerSpacing: {
    marginTop: 14,
    alignItems: 'center',
  },
  termsText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
