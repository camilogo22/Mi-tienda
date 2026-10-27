// hooks/useAutoSync.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { syncProducts, type SyncResult } from '@/services/sync';

export function useAutoSync(
  userId: string | undefined,
  onSyncComplete?: (result: SyncResult) => void
) {
  const isSyncingRef = useRef(false);
  const wasOfflineRef = useRef(false);

  const checkAndSync = useCallback(async () => {
    if (!userId || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      const result = await syncProducts(userId);
      if (result.success) {
        if (wasOfflineRef.current) {
          console.log('Conexión recuperada: sincronización automática completada.');
          wasOfflineRef.current = false;
        }
        if (onSyncComplete && (result.uploadedCount > 0 || result.downloadedCount > 0)) {
          onSyncComplete(result);
        }
      } else {
        wasOfflineRef.current = true;
      }
    } catch {
      wasOfflineRef.current = true;
    } finally {
      isSyncingRef.current = false;
    }
  }, [userId, onSyncComplete]);

  useEffect(() => {
    if (!userId) return;

    // Sincronización inicial al iniciar
    checkAndSync();

    // Eventos Web 'online'
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        console.log('Evento Web online detectado -> Ejecutando sincronización automática');
        checkAndSync();
      };
      window.addEventListener('online', handleOnline);

      // Intervalo de sondeo periódico ligero (cada 20 segundos)
      const interval = setInterval(() => {
        if (navigator.onLine) {
          checkAndSync();
        }
      }, 20000);

      return () => {
        window.removeEventListener('online', handleOnline);
        clearInterval(interval);
      };
    } else {
      // Evento de ciclo de vida nativo (al volver a primer plano)
      const appStateSub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          checkAndSync();
        }
      });

      // Sondeo periódico cada 25 segundos para detectar reconexión en modo avión apagado
      const interval = setInterval(() => {
        checkAndSync();
      }, 25000);

      return () => {
        appStateSub.remove();
        clearInterval(interval);
      };
    }
  }, [userId, checkAndSync]);
}

