import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { 
  User, 
  Scale, 
  Ruler, 
  Calendar, 
  Award, 
  Flame, 
  RefreshCw, 
  Clock, 
  Volume2, 
  Smartphone, 
  Cloud, 
  CheckCircle2, 
  ChevronRight, 
  LogOut, 
  Sliders, 
  Dumbbell, 
  X,
  Check,
  Zap,
  Sparkles,
  Activity,
  Download,
  Upload,
  Layers,
  HardDrive,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useUserStore, UserProfile } from '../../src/store/userStore';
import { getRoutines, getActiveProgram } from '../../src/database/database';
import { Routine, WorkoutProgram } from '../../src/types/workout';
import { 
  auth, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider 
} from '../../src/services/firebase';
import { processSyncQueue, syncAllLocalDataToCloud } from '../../src/services/syncQueueService';

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
import { 
  getHealthConnectStatus, 
  requestHealthConnectAccess, 
  importBiometricsFromHealthConnect, 
  exportAllWorkoutsToHealthConnect,
  HealthConnectStatus 
} from '../../src/services/healthConnectService';
import Theme from '../../src/theme/theme';
import { RoutineManagementModal } from '../../src/components/RoutineManagementModal';

export default function AthleteControlCenterScreen() {
  const router = useRouter();
  const { workoutHistory, loadFromDatabase, discardActiveSession } = useWorkoutStore();
  const { 
    isGuest,
    setIsGuest,
    profile, 
    preferences, 
    updateMetrics, 
    updatePreferences, 
    resetOnboarding,
    logout
  } = useUserStore();

  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  const isGuestMode = isGuest || !currentUser;

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeProgram, setActiveProgramState] = useState<WorkoutProgram | null>(null);
  const [isEditMetricsModalOpen, setIsEditMetricsModalOpen] = useState(false);
  const [isResetRoutineModalOpen, setIsResetRoutineModalOpen] = useState(false);
  const [isRoutineManagerOpen, setIsRoutineManagerOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Estados para Conexão de Conta do Convidado com a Nuvem
  const [isConnectAccountModalOpen, setIsConnectAccountModalOpen] = useState(false);
  const [isRegisteringAccount, setIsRegisteringAccount] = useState(true);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [accountErrorMessage, setAccountErrorMessage] = useState<string | null>(null);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  // Estado da Conexão com Health Connect
  const [healthStatus, setHealthStatus] = useState<HealthConnectStatus | null>(null);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [healthFeedback, setHealthFeedback] = useState<string | null>(null);

  // Form temporário para edição de métricas
  const [tempWeight, setTempWeight] = useState(String(profile?.bodyWeightKg || 80));
  const [tempHeight, setTempHeight] = useState(String(profile?.heightCm || 178));
  const [tempDays, setTempDays] = useState(profile?.preferredDaysPerWeek || 4);
  const [tempExperience, setTempExperience] = useState<UserProfile['experienceLevel']>(
    profile?.experienceLevel || 'intermediario'
  );

  useEffect(() => {
    loadFromDatabase();
    refreshRoutines();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const status = await getHealthConnectStatus();
      setHealthStatus(status);
    } catch {}
  };

  const handleConnectHealth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const granted = await requestHealthConnectAccess();
    await checkHealth();
    if (granted) {
      setHealthFeedback('Health Connect conectado com sucesso.');
    } else {
      setHealthFeedback('Permissões pendentes ou não concedidas.');
    }
    setTimeout(() => setHealthFeedback(null), 4000);
  };

  const handleImportBiometrics = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsHealthSyncing(true);
    setHealthFeedback(null);
    try {
      const res = await importBiometricsFromHealthConnect();
      setHealthFeedback(res.message);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      setHealthFeedback('Erro ao comunicar com o Health Connect.');
    } finally {
      setIsHealthSyncing(false);
      setTimeout(() => setHealthFeedback(null), 5000);
    }
  };

  const handleExportWorkouts = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsHealthSyncing(true);
    setHealthFeedback(null);
    try {
      const res = await exportAllWorkoutsToHealthConnect(workoutHistory);
      if (res.total === 0) {
        setHealthFeedback('Nenhum treino concluído para exportar.');
      } else {
        setHealthFeedback(`${res.exported} de ${res.total} treino(s) exportado(s) com sucesso.`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      setHealthFeedback('Erro ao exportar treinos para o Health Connect.');
    } finally {
      setIsHealthSyncing(false);
      setTimeout(() => setHealthFeedback(null), 5000);
    }
  };

  const refreshRoutines = () => {
    try {
      const activeRoutines = getRoutines();
      setRoutines(activeRoutines);
      const activeProg = getActiveProgram();
      setActiveProgramState(activeProg);
    } catch (e) {
      console.error('Erro ao carregar rotinas:', e);
    }
  };

  // Cálculo de Métricas de Consistência
  const totalVolume = workoutHistory.reduce((acc, curr) => acc + curr.totalTonnageKg, 0);
  const totalSets = workoutHistory.reduce((acc, curr) => acc + curr.totalSets, 0);

  const calculateActiveWeeksStreak = (history: typeof workoutHistory): number => {
    if (history.length === 0) return 0;
    const weekKeys = new Set<string>();
    for (const s of history) {
      const d = new Date(s.startTime);
      if (isNaN(d.getTime())) continue;
      const year = d.getFullYear();
      const firstJan = new Date(year, 0, 1);
      const dayNum = Math.floor((d.getTime() - firstJan.getTime()) / 86400000);
      const week = Math.ceil((dayNum + firstJan.getDay() + 1) / 7);
      weekKeys.add(`${year}-W${week}`);
    }
    return weekKeys.size;
  };

  const weeklyStreak = calculateActiveWeeksStreak(workoutHistory);

  // Salvar Métricas Corporais
  const handleSaveMetrics = () => {
    const weightNum = parseFloat(tempWeight.replace(',', '.')) || profile?.bodyWeightKg || 80;
    const heightNum = parseInt(tempHeight, 10) || profile?.heightCm || 178;

    updateMetrics({
      bodyWeightKg: weightNum,
      heightCm: heightNum,
      preferredDaysPerWeek: tempDays,
      experienceLevel: tempExperience,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsEditMetricsModalOpen(false);
  };

  // Sincronização manual com Firebase
  const handleTriggerSync = async () => {
    if (isGuestMode) {
      setSyncFeedback('Modo local ativo. Conecte sua conta para sincronizar com a nuvem.');
      setTimeout(() => setSyncFeedback(null), 4000);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const res = await processSyncQueue();
      if (res.processed > 0) {
        setSyncFeedback(`${res.processed} treino(s) sincronizado(s) com a nuvem.`);
      } else {
        setSyncFeedback('Fila atualizada. Todos os dados estão na nuvem.');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setSyncFeedback('Falha de conexão com a nuvem.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Conexão com Conta Google para Convidados
  const handleGoogleConnect = async () => {
    setIsGoogleConnecting(true);
    setSyncFeedback(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      let loggedUser = null;
      if (Platform.OS === 'web') {
        const result = await signInWithPopup(auth, googleProvider);
        loggedUser = result.user;
      } else {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          loggedUser = result.user;
        } catch {
          Alert.alert(
            'Google Sign-In',
            'Conectando ao serviço Google do heavy-io...',
            [{ text: 'OK' }]
          );
        }
      }

      if (loggedUser) {
        setIsGuest(false);
        const syncResult = await syncAllLocalDataToCloud(loggedUser);
        const msg = `Conta Google conectada! ${syncResult.sessionsSynced} treino(s) e ${syncResult.prsSynced} recorde(s) sincronizados na nuvem.`;
        setSyncFeedback(msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err: any) {
      console.error('Erro ao conectar Google no perfil:', err);
      setSyncFeedback('Não foi possível conectar com o Google no momento.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsGoogleConnecting(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Criação ou Login com Conta heavy.io (E-mail/Senha) para Convidados
  const handleEmailAccountConnect = async () => {
    setAccountErrorMessage(null);

    if (!accountEmail.trim() || !accountPassword.trim()) {
      const msg = 'Informe e-mail e senha para continuar.';
      setAccountErrorMessage(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    if (accountPassword.length < 6) {
      const msg = 'A senha deve conter no mínimo 6 caracteres.';
      setAccountErrorMessage(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setIsAccountLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      let userCred;
      if (isRegisteringAccount) {
        userCred = await createUserWithEmailAndPassword(auth, accountEmail.trim(), accountPassword);
      } else {
        userCred = await signInWithEmailAndPassword(auth, accountEmail.trim(), accountPassword);
      }

      const connectedUser = userCred.user;
      setIsGuest(false);

      // Sincroniza retroativamente todos os dados salvos localmente
      const syncResult = await syncAllLocalDataToCloud(connectedUser);

      setIsConnectAccountModalOpen(false);
      setAccountEmail('');
      setAccountPassword('');
      const actionText = isRegisteringAccount ? 'criada' : 'conectada';
      const msg = `Conta heavy.io ${actionText}! ${syncResult.sessionsSynced} treino(s) e ${syncResult.prsSynced} recorde(s) sincronizados.`;
      setSyncFeedback(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      let message = 'Falha na autenticação. Verifique os dados e tente novamente.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está cadastrado. Alterne para a aba "ENTRAR".';
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        message = isRegisteringAccount
          ? 'Não foi possível cadastrar com os dados informados.'
          : 'E-mail ou senha incorretos ou usuário inexistente.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de e-mail inválido. Verifique o endereço digitado.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha escolhida é muito fraca. Mínimo de 6 caracteres.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas incorretas. Aguarde alguns instantes.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Falha de conexão com a rede. Verifique sua internet.';
      }
      setAccountErrorMessage(message);
    } finally {
      setIsAccountLoading(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Redirecionamento para re-onboarding
  const handleSelectReOnboarding = (track: 'guided' | 'advanced') => {
    setIsResetRoutineModalOpen(false);
    resetOnboarding();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (track === 'guided') {
      router.push('/onboarding-guided' as any);
    } else {
      router.push('/onboarding-advanced' as any);
    }
  };

  const handleConfirmLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsLogoutModalOpen(true);
  };

  const handleExecuteLogout = async () => {
    setIsLoggingOut(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    
    // 1. Apaga qualquer treino ativo ou rascunho em andamento
    try {
      discardActiveSession();
    } catch (err) {
      console.warn('Erro ao descartar sessão de treino ativa no logout:', err);
    }

    // 2. Realiza o encerramento da sessão no Firebase se autenticado
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Erro ao deslogar do Firebase:', err);
    }

    // 3. Reseta a store do usuário e limpa o armazenamento persistente local
    try {
      logout();
    } catch (err) {
      console.warn('Erro ao resetar userStore:', err);
    }

    setIsLogoutModalOpen(false);
    setIsLoggingOut(false);

    // 4. Redireciona com segurança para a tela inicial (index / login)
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/');
  };

  const getExperienceLabel = (exp?: string) => {
    switch (exp) {
      case 'iniciante': return 'Iniciante (< 6 meses)';
      case 'intermediario': return 'Intermediário (6m - 2 anos)';
      case 'avancado': return 'Avançado (+ 2 anos)';
      default: return 'Intermediário';
    }
  };

  const REST_PRESETS = [60, 90, 120, 180];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* Header de Identidade do Atleta */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <User size={26} color={Theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.athleteName}>
              {currentUser?.displayName || (isGuestMode ? 'Atleta Convidado' : (profile?.name || 'Atleta de Força'))}
            </Text>
            <Text style={styles.athleteEmail}>
              {currentUser?.email || 'Modo Convidado • Armazenamento Local'}
            </Text>
          </View>
          <View style={styles.headerRightActions}>
            {isGuestMode ? (
              <View style={styles.badgeGuestHeader}>
                <HardDrive size={11} color={Theme.colors.textMuted} />
                <Text style={styles.badgeGuestHeaderText}>100% Local</Text>
              </View>
            ) : (
              <View style={styles.badgeOffline}>
                <CheckCircle2 size={12} color={Theme.colors.success} />
                <Text style={styles.badgeOfflineText}>Nuvem Ativa</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.headerLogoutBtn}
              onPress={handleConfirmLogout}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <LogOut size={12} color={Theme.colors.danger} />
              <Text style={styles.headerLogoutBtnText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Métricas do Usuário */}
        <View style={styles.sectionHeader}>
          <Sliders size={16} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>Métricas do Atleta</Text>
          <TouchableOpacity 
            style={styles.editHeaderBtn} 
            onPress={() => {
              setTempWeight(String(profile?.bodyWeightKg || 80));
              setTempHeight(String(profile?.heightCm || 178));
              setTempDays(profile?.preferredDaysPerWeek || 4);
              setTempExperience(profile?.experienceLevel || 'intermediario');
              setIsEditMetricsModalOpen(true);
            }}
          >
            <Text style={styles.editHeaderText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Scale size={16} color={Theme.colors.textSecondary} />
            </View>
            <Text style={styles.metricValue}>
              {profile?.bodyWeightKg || 80} <Text style={styles.metricUnit}>kg</Text>
            </Text>
            <Text style={styles.metricLabel}>Peso Corporal</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ruler size={16} color={Theme.colors.textSecondary} />
            </View>
            <Text style={styles.metricValue}>
              {profile?.heightCm || 178} <Text style={styles.metricUnit}>cm</Text>
            </Text>
            <Text style={styles.metricLabel}>Estatura</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Calendar size={16} color={Theme.colors.textSecondary} />
            </View>
            <Text style={styles.metricValue}>
              {profile?.preferredDaysPerWeek || 4} <Text style={styles.metricUnit}>dias/sem</Text>
            </Text>
            <Text style={styles.metricLabel}>Frequência Alvo</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Award size={16} color={Theme.colors.textSecondary} />
            </View>
            <Text style={[styles.metricValue, { fontSize: 13, marginTop: 4 }]} numberOfLines={1}>
              {profile?.experienceLevel === 'iniciante' ? 'Iniciante' : profile?.experienceLevel === 'avancado' ? 'Avançado' : 'Intermediário'}
            </Text>
            <Text style={styles.metricLabel}>Experiência</Text>
          </View>
        </View>

        {/* 2. Resumo de Consistência */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Flame size={16} color={Theme.colors.accentFlame} />
          <Text style={styles.sectionTitle}>Resumo de Consistência</Text>
        </View>

        <View style={styles.consistencyCard}>
          <View style={styles.consistencyRow}>
            <View style={styles.consistencyItem}>
              <Text style={styles.consistencyValue}>{workoutHistory.length}</Text>
              <Text style={styles.consistencyLabel}>Treinos Feitos</Text>
            </View>
            <View style={styles.consistencyDivider} />
            <View style={styles.consistencyItem}>
              <Text style={styles.consistencyValue}>
                {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)} kg`}
              </Text>
              <Text style={styles.consistencyLabel}>Tonelagem Total</Text>
            </View>
            <View style={styles.consistencyDivider} />
            <View style={styles.consistencyItem}>
              <Text style={styles.consistencyValue}>{totalSets}</Text>
              <Text style={styles.consistencyLabel}>Séries Válidas</Text>
            </View>
          </View>

          <View style={styles.streakBanner}>
            <Flame size={18} color={Theme.colors.accentFlame} />
            <Text style={styles.streakText}>
              Consistência: <Text style={styles.streakHighlight}>{weeklyStreak} {weeklyStreak === 1 ? 'semana ativa' : 'semanas ativas'}</Text> registradas
            </Text>
          </View>
        </View>

        {/* 3. Gerenciamento de Rotina Ativa */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Dumbbell size={16} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>Rotina Ativa</Text>
        </View>

        <View style={styles.routineCard}>
          <View style={styles.routineHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={styles.routineTitle}>
                  {activeProgram?.name || (routines.length > 0 ? 'Ficha Ativa' : 'Nenhuma Ficha')}
                </Text>
                {activeProgram && (
                  <View style={styles.activeTagBadge}>
                    <Text style={styles.activeTagBadgeText}>ATIVA</Text>
                  </View>
                )}
              </View>
              <Text style={styles.routineSub}>
                {routines.length > 0 
                  ? `${routines.length} sessões cadastradas no ciclo` 
                  : 'Configure uma divisão para guiar seus treinos'}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.changeRoutineBtn}
              onPress={() => setIsRoutineManagerOpen(true)}
              activeOpacity={0.7}
            >
              <Layers size={13} color={Theme.colors.primary} />
              <Text style={styles.changeRoutineBtnText}>Gerenciar Fichas</Text>
            </TouchableOpacity>
          </View>

          {routines.length > 0 ? (
            <View style={styles.routineList}>
              {routines.map((r, idx) => (
                <View key={r.id || idx} style={styles.routineRow}>
                  <View style={styles.routineTag}>
                    <Text style={styles.routineTagText}>{String.fromCharCode(65 + idx)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineItemName}>{r.name}</Text>
                    <Text style={styles.routineItemDetails}>
                      {r.exercises?.length || 0} exercícios • ~{((r.exercises?.length || 0) * 8)} min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* 4. Preferências de Treino */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Clock size={16} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>Preferências do Cronômetro</Text>
        </View>

        <View style={styles.prefsCard}>
          {/* Tempo Padrão de Descanso */}
          <Text style={styles.prefFieldTitle}>Tempo Padrão de Descanso</Text>
          <Text style={styles.prefFieldSub}>Intervalo automático disparado ao concluir cada série</Text>
          
          <View style={styles.restChipsRow}>
            {REST_PRESETS.map((seconds) => {
              const isSelected = preferences.defaultRestSeconds === seconds;
              return (
                <TouchableOpacity
                  key={seconds}
                  style={[styles.restChip, isSelected && styles.restChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    updatePreferences({ defaultRestSeconds: seconds });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.restChipText, isSelected && styles.restChipTextActive]}>
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Toggle Som */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.toggleIconWrap}>
                <Volume2 size={16} color={Theme.colors.text} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Alerta Sonoro</Text>
                <Text style={styles.toggleSub}>Tocar bipe ao zerar descanso</Text>
              </View>
            </View>
            <Switch
              value={preferences.soundEnabled}
              onValueChange={(val) => {
                Haptics.selectionAsync().catch(() => {});
                updatePreferences({ soundEnabled: val });
              }}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
              thumbColor={preferences.soundEnabled ? Theme.colors.background : Theme.colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          {/* Toggle Vibração */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.toggleIconWrap}>
                <Smartphone size={16} color={Theme.colors.text} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Vibração Tátil (Haptics)</Text>
                <Text style={styles.toggleSub}>Pulsos mecânicos no término do descanso</Text>
              </View>
            </View>
            <Switch
              value={preferences.vibrationEnabled}
              onValueChange={(val) => {
                Haptics.selectionAsync().catch(() => {});
                updatePreferences({ vibrationEnabled: val });
              }}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
              thumbColor={preferences.vibrationEnabled ? Theme.colors.background : Theme.colors.textMuted}
            />
          </View>
        </View>

        {/* 5. Integração com Google Health Connect */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Activity size={16} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>Google Health Connect</Text>
          <View style={[
            styles.badgeOffline, 
            healthStatus?.hasPermissions 
              ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } 
              : { backgroundColor: 'rgba(255, 255, 255, 0.06)' }
          ]}>
            <CheckCircle2 
              size={12} 
              color={healthStatus?.hasPermissions ? Theme.colors.success : Theme.colors.textMuted} 
            />
            <Text style={[
              styles.badgeOfflineText, 
              healthStatus?.hasPermissions ? { color: Theme.colors.success } : { color: Theme.colors.textMuted }
            ]}>
              {healthStatus?.hasPermissions ? 'Conectado' : healthStatus?.isSupported ? 'Disponível' : 'Android'}
            </Text>
          </View>
        </View>

        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthTitle}>Sincronização Bidirecional</Text>
              <Text style={styles.healthSub}>
                {healthFeedback || 'Importe peso/altura do Health Connect e exporte suas sessões de força.'}
              </Text>
            </View>
          </View>

          {!healthStatus?.hasPermissions ? (
            <TouchableOpacity 
              style={styles.connectHealthBtn}
              onPress={handleConnectHealth}
              activeOpacity={0.8}
            >
              <Activity size={15} color={Theme.colors.background} />
              <Text style={styles.connectHealthBtnText}>Conectar com Health Connect</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.healthActionsGrid}>
              <TouchableOpacity 
                style={styles.healthActionBtn}
                onPress={handleImportBiometrics}
                disabled={isHealthSyncing}
                activeOpacity={0.7}
              >
                <Download size={14} color={Theme.colors.primary} />
                <Text style={styles.healthActionBtnText}>
                  {isHealthSyncing ? 'Buscando...' : 'Puxar Métricas'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.healthActionBtn, { backgroundColor: Theme.colors.surfaceCard }]}
                onPress={handleExportWorkouts}
                disabled={isHealthSyncing}
                activeOpacity={0.7}
              >
                <Upload size={14} color={Theme.colors.primary} />
                <Text style={styles.healthActionBtnText}>
                  {isHealthSyncing ? 'Exportando...' : 'Exportar Treinos'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Conta & Sincronização em Nuvem */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Cloud size={16} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>
            {isGuestMode ? 'Conexão em Nuvem' : 'Sincronização em Nuvem'}
          </Text>
        </View>

        {isGuestMode ? (
          <View style={styles.guestCloudCard}>
            <View style={styles.guestCloudHeader}>
              <View style={styles.guestBadge}>
                <HardDrive size={11} color={Theme.colors.textMuted} />
                <Text style={styles.guestBadgeText}>MODO LOCAL • 100% OFFLINE</Text>
              </View>
            </View>

            <Text style={styles.guestCloudTitle}>Conectar com a Nuvem</Text>
            <Text style={styles.guestCloudSub}>
              Seus treinos estão salvos exclusivamente na memória deste aparelho. Conecte sua conta para fazer backup contínuo e sincronizar seus dados em caso de troca ou formatação de dispositivo.
            </Text>

            {/* Resumo de Dados Locais Prontos para Sincronizar */}
            <View style={styles.localDataPill}>
              <View style={styles.localDataDot} />
              <Text style={styles.localDataText}>
                <Text style={styles.localDataHighlight}>{workoutHistory.length}</Text> treino(s) e <Text style={styles.localDataHighlight}>{Object.keys(useWorkoutStore.getState().personalRecords || {}).length}</Text> recorde(s) prontos para migração
              </Text>
            </View>

            {syncFeedback ? (
              <View style={styles.feedbackBanner}>
                <CheckCircle2 size={14} color={Theme.colors.success} />
                <Text style={styles.feedbackBannerText}>{syncFeedback}</Text>
              </View>
            ) : null}

            {/* Ações de Conexão com a Nuvem */}
            <View style={styles.guestActionsContainer}>
              <TouchableOpacity
                style={styles.guestGoogleBtn}
                onPress={handleGoogleConnect}
                disabled={isGoogleConnecting}
                activeOpacity={0.85}
              >
                {isGoogleConnecting ? (
                  <ActivityIndicator size="small" color={Theme.colors.text} />
                ) : (
                  <>
                    <GoogleIcon size={16} />
                    <Text style={styles.guestGoogleBtnText}>Continuar com Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestHeavyBtn}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setAccountErrorMessage(null);
                  setIsRegisteringAccount(true);
                  setIsConnectAccountModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Mail size={15} color={Theme.colors.textInverse} />
                <Text style={styles.guestHeavyBtnText}>Criar Conta heavy.io / Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cloudCard}>
            <View style={styles.cloudRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cloudTitle}>Sync Queue (Offline-First)</Text>
                <Text style={styles.cloudSub}>
                  {syncFeedback || 'Seus treinos são salvos no SQLite e espelhados no Firebase.'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.syncNowBtn}
                onPress={handleTriggerSync}
                disabled={isSyncingCloud}
                activeOpacity={0.7}
              >
                <RefreshCw 
                  size={14} 
                  color={Theme.colors.background} 
                  style={isSyncingCloud ? { opacity: 0.5 } : {}}
                />
                <Text style={styles.syncNowBtnText}>
                  {isSyncingCloud ? 'Enviando...' : 'Sincronizar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 7. Conta & Sessão */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <User size={16} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>Conta & Sessão</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountInfoRow}>
            <View style={styles.accountAvatarMini}>
              <User size={18} color={Theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountEmailText} numberOfLines={1}>
                {currentUser?.email || 'Atleta de Força (Modo Convidado)'}
              </Text>
              <Text style={styles.accountStatusSub}>
                {currentUser ? 'Autenticado via Firebase Auth' : 'Armazenamento 100% Local • Sem Nuvem'}
              </Text>
            </View>
          </View>

          <View style={styles.accountDivider} />

          <TouchableOpacity 
            style={styles.fullLogoutBtn} 
            onPress={handleConfirmLogout}
            activeOpacity={0.7}
          >
            <LogOut size={16} color={Theme.colors.danger} />
            <Text style={styles.fullLogoutBtnText}>
              {isGuestMode ? 'Encerrar Modo Convidado' : 'Encerrar Sessão da Conta'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* MODAL 1: Edição de Métricas do Atleta */}
      <Modal
        visible={isEditMetricsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditMetricsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Métricas</Text>
              <TouchableOpacity 
                onPress={() => setIsEditMetricsModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso Corporal (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  value={tempWeight}
                  onChangeText={setTempWeight}
                  placeholder="Ex: 82.5"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Estatura (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={tempHeight}
                  onChangeText={setTempHeight}
                  placeholder="Ex: 178"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frequência Semanal Alvo</Text>
                <View style={styles.daysSelector}>
                  {[2, 3, 4, 5, 6].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dayChoice, tempDays === d && styles.dayChoiceActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setTempDays(d);
                      }}
                    >
                      <Text style={[styles.dayChoiceText, tempDays === d && styles.dayChoiceTextActive]}>
                        {d}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nível de Experiência</Text>
                <View style={styles.expSelector}>
                  {(['iniciante', 'intermediario', 'avancado'] as const).map(lvl => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.expChoice, tempExperience === lvl && styles.expChoiceActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setTempExperience(lvl);
                      }}
                    >
                      <Text style={[styles.expChoiceText, tempExperience === lvl && styles.expChoiceTextActive]}>
                        {lvl === 'iniciante' ? 'Iniciante' : lvl === 'avancado' ? 'Avançado' : 'Intermediário'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.modalPrimaryBtn}
              onPress={handleSaveMetrics}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Reconfiguração de Rotina */}
      <Modal
        visible={isResetRoutineModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsResetRoutineModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trocar Estrutura de Treino</Text>
              <TouchableOpacity 
                onPress={() => setIsResetRoutineModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Seu histórico de treinos e recordes pessoais continuarão salvos no SQLite. Como você deseja montar sua nova ficha?
            </Text>

            <View style={styles.tracksContainer}>
              <TouchableOpacity 
                style={styles.trackOption}
                onPress={() => {
                  setIsResetRoutineModalOpen(false);
                  setIsRoutineManagerOpen(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.trackIconWrap}>
                  <Layers size={18} color={Theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle}>Gerenciador de Fichas (Alternar / Criar)</Text>
                  <Text style={styles.trackDesc}>
                    Alterne entre fichas salvas (ex: Férias, Ciclo de Força) ou edite exercícios sem reiniciar o onboarding.
                  </Text>
                </View>
                <ChevronRight size={16} color={Theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.trackOption}
                onPress={() => handleSelectReOnboarding('guided')}
                activeOpacity={0.7}
              >
                <View style={styles.trackIconWrap}>
                  <Sparkles size={18} color={Theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle}>Trilha Guiada (Algorítmica)</Text>
                  <Text style={styles.trackDesc}>
                    Responda perguntas estruturadas e receba um split otimizado para seu tempo e limitações.
                  </Text>
                </View>
                <ChevronRight size={16} color={Theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.trackOption}
                onPress={() => handleSelectReOnboarding('advanced')}
                activeOpacity={0.7}
              >
                <View style={styles.trackIconWrap}>
                  <Zap size={18} color={Theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle}>Trilha Avançada (Setup Rápido)</Text>
                  <Text style={styles.trackDesc}>
                    Escolha um preset (PPL, Upper/Lower, Full Body) ou crie sua rotina do zero.
                  </Text>
                </View>
                <ChevronRight size={16} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setIsResetRoutineModalOpen(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Gestão Completa de Fichas (CRUD de Fichas e Dias) */}
      <RoutineManagementModal
        visible={isRoutineManagerOpen}
        onClose={() => setIsRoutineManagerOpen(false)}
        onProgramsUpdated={refreshRoutines}
      />

      {/* MODAL 4: Confirmação de Logout */}
      <Modal
        visible={isLogoutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLoggingOut) setIsLogoutModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalBox}>
            <View style={styles.logoutModalIconWrap}>
              <LogOut size={22} color={Theme.colors.danger} />
            </View>

            <Text style={styles.logoutModalTitle}>Encerrar Sessão?</Text>
            <Text style={styles.logoutModalDesc}>
              Você será desconectado da sua conta. Seus dados e treinos salvos localmente permanecerão intactos neste dispositivo.
            </Text>

            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={handleExecuteLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutConfirmBtnText}>
                  {isLoggingOut ? 'Saindo...' : 'Sim, Sair'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Conectar com a Nuvem (Criar Conta heavy.io ou Entrar) */}
      <Modal
        visible={isConnectAccountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isAccountLoading) setIsConnectAccountModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.connectAccountModalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Conectar com a Nuvem</Text>
                <Text style={styles.modalHeaderSub}>
                  Sincronize todo o histórico e dados locais deste aparelho
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  if (!isAccountLoading) setIsConnectAccountModalOpen(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Alternador Criar Conta / Entrar */}
            <View style={styles.accountTabSwitch}>
              <TouchableOpacity
                style={[styles.accountTabBtn, isRegisteringAccount && styles.accountTabBtnActive]}
                onPress={() => {
                  setIsRegisteringAccount(true);
                  setAccountErrorMessage(null);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.accountTabBtnText, isRegisteringAccount && styles.accountTabBtnTextActive]}>
                  CRIAR CONTA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountTabBtn, !isRegisteringAccount && styles.accountTabBtnActive]}
                onPress={() => {
                  setIsRegisteringAccount(false);
                  setAccountErrorMessage(null);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.accountTabBtnText, !isRegisteringAccount && styles.accountTabBtnTextActive]}>
                  ENTRAR
                </Text>
              </TouchableOpacity>
            </View>

            {/* Banner de Erro */}
            {accountErrorMessage ? (
              <View style={styles.accountErrorBanner}>
                <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
                <Text style={styles.accountErrorBannerText}>{accountErrorMessage}</Text>
              </View>
            ) : null}

            {/* Formulário de Credenciais */}
            <View style={styles.accountInputsContainer}>
              <View style={styles.accountInputWrapper}>
                <Mail size={16} color={Theme.colors.textMuted} style={styles.accountInputIcon} />
                <TextInput
                  style={styles.accountTextInput}
                  placeholder="E-mail"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={accountEmail}
                  onChangeText={val => {
                    setAccountEmail(val);
                    if (accountErrorMessage) setAccountErrorMessage(null);
                  }}
                />
              </View>

              <View style={styles.accountInputWrapper}>
                <Lock size={16} color={Theme.colors.textMuted} style={styles.accountInputIcon} />
                <TextInput
                  style={styles.accountTextInput}
                  placeholder="Senha (mínimo 6 dígitos)"
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showAccountPassword}
                  value={accountPassword}
                  onChangeText={val => {
                    setAccountPassword(val);
                    if (accountErrorMessage) setAccountErrorMessage(null);
                  }}
                />
                <TouchableOpacity
                  style={styles.accountEyeBtn}
                  onPress={() => setShowAccountPassword(!showAccountPassword)}
                >
                  {showAccountPassword ? (
                    <EyeOff size={16} color={Theme.colors.textMuted} />
                  ) : (
                    <Eye size={16} color={Theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Botão de Ação Primária */}
            <TouchableOpacity
              style={styles.accountPrimaryBtn}
              onPress={handleEmailAccountConnect}
              disabled={isAccountLoading}
              activeOpacity={0.85}
            >
              {isAccountLoading ? (
                <ActivityIndicator size="small" color={Theme.colors.textInverse} />
              ) : (
                <Text style={styles.accountPrimaryBtnText}>
                  {isRegisteringAccount ? 'Criar Conta e Sincronizar' : 'Entrar e Sincronizar'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divisor "OU" */}
            <View style={styles.accountDividerRow}>
              <View style={styles.accountDividerLine} />
              <Text style={styles.accountDividerText}>OU</Text>
              <View style={styles.accountDividerLine} />
            </View>

            {/* Botão Google dentro do Modal */}
            <TouchableOpacity
              style={styles.accountGoogleBtn}
              onPress={async () => {
                setIsConnectAccountModalOpen(false);
                await handleGoogleConnect();
              }}
              disabled={isGoogleConnecting}
              activeOpacity={0.85}
            >
              <GoogleIcon size={16} />
              <Text style={styles.accountGoogleBtnText}>Continuar com Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 24,
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.3,
  },
  athleteEmail: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  badgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
  },
  badgeOfflineText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.success,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
  },
  headerLogoutBtnText: {
    color: Theme.colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  editHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  metricLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  consistencyCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  consistencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consistencyItem: {
    flex: 1,
    alignItems: 'center',
  },
  consistencyDivider: {
    width: 1,
    height: 32,
    backgroundColor: Theme.colors.border,
  },
  consistencyValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  consistencyLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  streakText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  streakHighlight: {
    color: Theme.colors.text,
    fontWeight: '800',
  },
  routineCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  activeTagBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeTagBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.textInverse,
  },
  routineSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  changeRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    gap: 6,
  },
  changeRoutineBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  routineList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 10,
    gap: 8,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  routineTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineTagText: {
    color: Theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  routineItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  routineItemDetails: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  prefsCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  prefFieldTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  prefFieldSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  restChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  restChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  restChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  restChipTextActive: {
    color: Theme.colors.background,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  toggleSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  healthCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  healthHeader: {
    marginBottom: 12,
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  healthSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  connectHealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
    marginTop: 6,
  },
  connectHealthBtnText: {
    color: Theme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  healthActionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  healthActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    gap: 6,
  },
  healthActionBtnText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  cloudCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cloudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cloudTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  cloudSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    gap: 6,
  },
  syncNowBtnText: {
    color: Theme.colors.background,
    fontSize: 12,
    fontWeight: '800',
  },
  accountCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountEmailText: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  accountStatusSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  accountDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 14,
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  fullLogoutBtnText: {
    color: Theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
  },
  logoutModalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoutModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutModalDesc: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  logoutModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  logoutCancelBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#991B1B',
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: Theme.colors.surfaceCard,
    borderRadius: Theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInputs: {
    gap: 14,
    marginBottom: 20,
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChoice: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  dayChoiceActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  dayChoiceText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
  },
  dayChoiceTextActive: {
    color: Theme.colors.background,
  },
  expSelector: {
    gap: 6,
  },
  expChoice: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  expChoiceActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  expChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  expChoiceTextActive: {
    color: Theme.colors.text,
  },
  modalPrimaryBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: Theme.colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  tracksContainer: {
    gap: 10,
    marginBottom: 16,
  },
  trackOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 12,
  },
  trackIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  trackDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  badgeGuestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  badgeGuestHeaderText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  guestCloudCard: {
    backgroundColor: 'rgba(18, 18, 21, 0.95)',
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  guestCloudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  guestBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  guestCloudTitle: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  guestCloudSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  localDataPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
  },
  localDataDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.accentFlame || '#F59E0B',
  },
  localDataText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  localDataHighlight: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginBottom: 14,
  },
  feedbackBannerText: {
    color: '#86EFAC',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  guestActionsContainer: {
    gap: 10,
  },
  guestGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#18181B',
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  guestGoogleBtnText: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  guestHeavyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
  },
  guestHeavyBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  connectAccountModalBox: {
    backgroundColor: '#121215',
    borderRadius: Theme.borderRadius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    width: '100%',
    maxWidth: 420,
  },
  modalHeaderSub: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  accountTabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.sm,
    padding: 3,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  accountTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  accountTabBtnActive: {
    backgroundColor: Theme.colors.surfaceElevated,
  },
  accountTabBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accountTabBtnTextActive: {
    color: Theme.colors.text,
    fontWeight: '800',
  },
  accountErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181B',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  accountErrorBannerText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  accountInputsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  accountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 46,
  },
  accountInputIcon: {
    marginRight: 10,
  },
  accountTextInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  accountEyeBtn: {
    padding: 6,
  },
  accountPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 46,
    borderRadius: Theme.borderRadius.md,
  },
  accountPrimaryBtnText: {
    color: Theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  accountDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  accountDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  accountDividerText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  accountGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#18181B',
    height: 46,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
  },
  accountGoogleBtnText: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
