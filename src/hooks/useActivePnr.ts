import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PNR_STORAGE_KEY = '@active_pnr';

/**
 * Centralized hook for managing the persisted active PNR value.
 * 
 * This hook acts as the single source of truth for PNR persistence across
 * all screens (Dashboard, OfflineDashboard, HelpScreen). It reads from
 * AsyncStorage on mount and exposes setters that keep storage in sync.
 * 
 * NOTE: Because this is a hook (not a Context), each consumer gets its own
 * state instance. Synchronization is guaranteed through AsyncStorage reads
 * on mount. For cross-screen sync during a single session, callers should
 * also update their local journey state alongside this hook.
 */
export function useActivePnr() {
  const [activePnr, setActivePnrState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Hydrate from AsyncStorage on mount ────────────────────────
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(PNR_STORAGE_KEY);
        if (!cancelled && stored) {
          setActivePnrState(stored);
        }
      } catch (e) {
        console.error('[useActivePnr] Hydration failed:', e);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    };
    hydrate();
    return () => { cancelled = true; };
  }, []);

  // ── Persist a new PNR to storage ──────────────────────────────
  const setActivePnr = async (pnr: string) => {
    try {
      await AsyncStorage.setItem(PNR_STORAGE_KEY, pnr);
      setActivePnrState(pnr);
    } catch (e) {
      console.error('[useActivePnr] Failed to persist PNR:', e);
    }
  };

  // ── Remove PNR from storage ───────────────────────────────────
  const clearActivePnr = async () => {
    try {
      await AsyncStorage.removeItem(PNR_STORAGE_KEY);
      setActivePnrState(null);
    } catch (e) {
      console.error('[useActivePnr] Failed to clear PNR:', e);
    }
  };

  return { activePnr, isHydrated, setActivePnr, clearActivePnr };
}
