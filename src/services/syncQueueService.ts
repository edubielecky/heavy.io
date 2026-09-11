import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore, User } from './firebase';
import { 
  getPendingSyncItems, 
  updateSyncItemStatus, 
  removeSyncedItem,
  getWorkoutHistory,
  getPersonalRecords,
  enqueueForSync
} from '../database/database';
import { SyncQueueItem } from '../types/workout';
import { useUserStore } from '../store/userStore';

let isSyncing = false;
let isInitialized = false;

/**
 * Processa a fila de sincronização enviando itens pendentes para o Firebase Firestore.
 * Conexão à nuvem é estritamente bloqueada para convidados (isGuest === true) ou não-autenticados.
 */
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (isSyncing) {
    return { processed: 0, failed: 0 };
  }

  const { isGuest } = useUserStore.getState();
  const currentUser = auth?.currentUser;

  // Se o usuário estiver como convidado ou não autenticado, NÃO conecta nem envia para a nuvem
  if (isGuest || !currentUser) {
    return { processed: 0, failed: 0 };
  }

  // 1. Verifica conectividade ativa com a internet
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      return { processed: 0, failed: 0 };
    }
  } catch (netErr) {
    console.warn('[SyncQueue] Não foi possível verificar o estado da rede:', netErr);
    return { processed: 0, failed: 0 };
  }

  isSyncing = true;
  let totalProcessed = 0;
  let totalFailed = 0;

  try {
    // Processa em lotes contínuos até esvaziar a fila ou atingir erro impeditivo
    while (true) {
      const items = getPendingSyncItems(15);
      if (items.length === 0) {
        break;
      }

      let batchProcessed = 0;
      for (const item of items) {
        const success = await syncItemToCloud(item);
        if (success) {
          totalProcessed++;
          batchProcessed++;
        } else {
          totalFailed++;
        }
      }

      // Se nenhum item do lote teve sucesso, para para evitar loop em caso de erro persistente
      if (batchProcessed === 0) {
        break;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { processed: totalProcessed, failed: totalFailed };
}

/**
 * Envia um item individual da fila para o Firestore.
 */
async function syncItemToCloud(item: SyncQueueItem): Promise<boolean> {
  try {
    const currentUser = auth?.currentUser;
    const currentUid = currentUser?.uid;

    if (!currentUid) {
      return false;
    }

    updateSyncItemStatus(item.id, 'syncing');

    const rawData = JSON.parse(item.payload);

    const cloudPayload = {
      ...rawData,
      syncedByUserId: currentUid,
      syncedUserEmail: currentUser?.email || null,
      cloudSyncedAt: serverTimestamp(),
    };

    if (item.entityType === 'workout_session') {
      // 1. Grava no perfil individual do usuário autenticado no Firestore
      const userSessionRef = doc(firestore, 'users', currentUid, 'workouts', item.entityId);
      await setDoc(userSessionRef, cloudPayload, { merge: true });

      // 2. Grava na coleção unificada de sessões
      const globalSessionRef = doc(firestore, 'workouts', item.entityId);
      await setDoc(globalSessionRef, cloudPayload, { merge: true });
    }

    // Sucesso: remove o item da fila local do SQLite
    removeSyncedItem(item.id);
    return true;
  } catch (error: any) {
    const errMsg = error?.message || 'Falha ao sincronizar com Firebase Firestore';
    console.warn(`[SyncQueue] Falha no envio do item ${item.id}:`, errMsg);
    updateSyncItemStatus(item.id, 'failed', errMsg);
    return false;
  }
}

/**
 * Sincroniza retroativamente todos os dados salvos localmente pelo convidado
 * (sessões de treino, recordes pessoais, métricas e preferências) para a conta na nuvem.
 */
export async function syncAllLocalDataToCloud(currentUser: User): Promise<{
  sessionsSynced: number;
  prsSynced: number;
  profileSynced: boolean;
}> {
  if (!currentUser || !currentUser.uid) {
    return { sessionsSynced: 0, prsSynced: 0, profileSynced: false };
  }

  const uid = currentUser.uid;
  let prsSynced = 0;
  let profileSynced = false;

  try {
    // 1. Sincroniza Perfil e Preferências
    const userState = useUserStore.getState();
    const profile = userState.profile;
    const preferences = userState.preferences;

    if (profile) {
      const userRef = doc(firestore, 'users', uid);
      await setDoc(userRef, {
        profile,
        preferences,
        email: currentUser.email || profile.email || null,
        displayName: currentUser.displayName || profile.name || null,
        lastSyncedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      profileSynced = true;
    }

    // 2. Sincroniza Recordes Pessoais (PRs)
    try {
      const prs = getPersonalRecords();
      const prEntries = Object.entries(prs);
      for (const [exerciseId, pr] of prEntries) {
        const prRef = doc(firestore, 'users', uid, 'personal_records', exerciseId);
        await setDoc(prRef, {
          ...pr,
          syncedAt: serverTimestamp(),
        }, { merge: true });
        prsSynced++;
      }
    } catch (prErr) {
      console.warn('[SyncQueue] Erro ao sincronizar PRs locais:', prErr);
    }

    // 3. Enfileira todo o histórico de treinos locais no sync_queue
    try {
      const history = getWorkoutHistory();
      for (const session of history) {
        enqueueForSync('workout_session', session.id, session);
      }
    } catch (histErr) {
      console.warn('[SyncQueue] Erro ao enfileirar histórico de treinos:', histErr);
    }

    // 4. Assegura que isGuest é falso na store
    useUserStore.getState().setIsGuest(false);

    // 5. Drena a fila de sincronização
    const queueResult = await processSyncQueue();

    return {
      sessionsSynced: queueResult.processed,
      prsSynced,
      profileSynced,
    };
  } catch (err) {
    console.error('[SyncQueue] Falha geral ao sincronizar dados locais com a nuvem:', err);
    throw err;
  }
}

/**
 * Inicializa a escuta de conectividade de rede e eventos de autenticação
 * para disparar a sincronização assim que houver rede ativa e usuário autenticado.
 */
export function initSyncQueue(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Vincula o gatilho global para chamadas originadas no SQLite (ex: completeWorkout)
  (globalThis as any).__heavy_syncQueueTrigger = () => {
    const { isGuest } = useUserStore.getState();
    if (!isGuest && auth?.currentUser) {
      processSyncQueue().catch(() => {});
    }
  };

  // 1. Escuta mudanças na conexão de rede (offline -> online)
  NetInfo.addEventListener((state: NetInfoState) => {
    const { isGuest } = useUserStore.getState();
    if (!isGuest && auth?.currentUser && state.isConnected && state.isInternetReachable !== false) {
      processSyncQueue().catch(() => {});
    }
  });

  // 2. Escuta mudanças no estado de autenticação (usuário logou -> envia treinos pendentes)
  if (auth) {
    auth.onAuthStateChanged(user => {
      const { isGuest } = useUserStore.getState();
      if (user && !isGuest) {
        processSyncQueue().catch(() => {});
      }
    });
  }

  // 3. Tentativa inicial no boot apenas se logado e não convidado
  setTimeout(() => {
    const { isGuest } = useUserStore.getState();
    if (!isGuest && auth?.currentUser) {
      processSyncQueue().catch(() => {});
    }
  }, 2000);
}
