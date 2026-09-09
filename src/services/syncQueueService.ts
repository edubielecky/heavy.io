import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { 
  getPendingSyncItems, 
  updateSyncItemStatus, 
  removeSyncedItem 
} from '../database/database';
import { SyncQueueItem } from '../types/workout';

let isSyncing = false;
let isInitialized = false;

/**
 * Processa a fila de sincronização enviando itens pendentes para o Firebase Firestore.
 */
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (isSyncing) {
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

  const items = getPendingSyncItems(15);
  if (items.length === 0) {
    return { processed: 0, failed: 0 };
  }

  isSyncing = true;
  let processed = 0;
  let failed = 0;

  try {
    for (const item of items) {
      const success = await syncItemToCloud(item);
      if (success) {
        processed++;
      } else {
        failed++;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { processed, failed };
}

/**
 * Envia um item individual da fila para o Firestore.
 */
async function syncItemToCloud(item: SyncQueueItem): Promise<boolean> {
  try {
    updateSyncItemStatus(item.id, 'syncing');

    const rawData = JSON.parse(item.payload);
    const currentUser = auth?.currentUser;
    const currentUid = currentUser?.uid;

    const cloudPayload = {
      ...rawData,
      syncedByUserId: currentUid || 'offline_user',
      syncedUserEmail: currentUser?.email || null,
      cloudSyncedAt: serverTimestamp(),
    };

    if (item.entityType === 'workout_session') {
      // 1. Grava no perfil do usuário no Firestore se autenticado
      if (currentUid) {
        const userSessionRef = doc(firestore, 'users', currentUid, 'workouts', item.entityId);
        await setDoc(userSessionRef, cloudPayload, { merge: true });
      }

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
 * Inicializa a escuta de conectividade de rede e eventos de autenticação
 * para disparar a sincronização assim que houver rede ativa ou novo login.
 */
export function initSyncQueue(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Vincula o gatilho global para chamadas originadas no SQLite (ex: completeWorkout)
  (globalThis as any).__heavy_syncQueueTrigger = () => {
    processSyncQueue().catch(() => {});
  };

  // 1. Escuta mudanças na conexão de rede (offline -> online)
  NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      processSyncQueue().catch(() => {});
    }
  });

  // 2. Escuta mudanças no estado de autenticação (usuário logou -> envia treinos pendentes)
  if (auth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        processSyncQueue().catch(() => {});
      }
    });
  }

  // 3. Primeira tentativa de drenar a fila no boot caso já esteja online
  setTimeout(() => {
    processSyncQueue().catch(() => {});
  }, 2000);
}
