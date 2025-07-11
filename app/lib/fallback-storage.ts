// Enhanced fallback storage with local persistence for critical business continuity
// Preserves special CSV format and corporate environment constraints

import { logError } from './error-handler';
import { STORAGE_KEYS } from './types/storage-keys';

export interface FallbackData {
  csvData: Array<Record<string, unknown>>;
  metadata: Record<string, unknown> | null;
  timestamp: number;
}

interface FallbackStorage {
  data: FallbackData;
  version: string;
}

const STORAGE_KEY = STORAGE_KEYS.BLUESAP_CSV_CACHE;
const CURRENT_VERSION = '1.0';

// In-memory cache for performance
let memoryCache: FallbackData | null = null;

/**
 * Enhanced fallback storage with local persistence
 * Preserves special CSV format and corporate constraints
 */
export function setFallbackData(
  csvData: Array<Record<string, unknown>>,
  metadata: Record<string, unknown>
) {
  const fallbackData: FallbackData = {
    csvData: [...csvData],
    metadata: { ...metadata },
    timestamp: Date.now(),
  };

  // Update memory cache
  memoryCache = fallbackData;

  // Persist to localStorage for session continuity
  try {
    const storageData: FallbackStorage = {
      data: fallbackData,
      version: CURRENT_VERSION,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    }
  } catch (error) {
    logError(
      {
        type: 'storage',
        message: 'Failed to save fallback data',
        details: error,
        timestamp: Date.now(),
        userFriendly: false,
      },
      'fallback-storage'
    );
  }
}

export function getFallbackData(): FallbackData | null {
  // Return memory cache if available
  if (memoryCache) {
    return {
      csvData: [...memoryCache.csvData],
      metadata: memoryCache.metadata ? { ...memoryCache.metadata } : null,
      timestamp: memoryCache.timestamp,
    };
  }

  // Try to load from localStorage
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storageData: FallbackStorage = JSON.parse(stored);

        // Validate version compatibility
        if (storageData.version === CURRENT_VERSION && storageData.data) {
          memoryCache = storageData.data;
          return {
            csvData: [...storageData.data.csvData],
            metadata: storageData.data.metadata
              ? { ...storageData.data.metadata }
              : null,
            timestamp: storageData.data.timestamp,
          };
        }
      }
    }
  } catch (error) {
    logError(
      {
        type: 'storage',
        message: 'Failed to get fallback data',
        details: error,
        timestamp: Date.now(),
        userFriendly: false,
      },
      'fallback-storage'
    );
    return null;
  }

  return null;
}

export function hasFallbackData(): boolean {
  const data = getFallbackData();
  return data !== null && data.csvData.length > 0;
}

export function clearFallbackData() {
  memoryCache = null;

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    logError(
      {
        type: 'storage',
        message: 'Failed to clear fallback data',
        details: error,
        timestamp: Date.now(),
        userFriendly: false,
      },
      'fallback-storage'
    );
  }
}

/**
 * Get fallback data age in minutes
 * Useful for determining if data is stale
 */
export function getFallbackDataAge(): number {
  const data = getFallbackData();
  if (!data) return -1;

  const ageMs = Date.now() - data.timestamp;
  return Math.floor(ageMs / (1000 * 60)); // Convert to minutes
}

/**
 * Check if fallback data is fresh (less than 24 hours old)
 */
export function isFallbackDataFresh(): boolean {
  const ageMinutes = getFallbackDataAge();
  return ageMinutes >= 0 && ageMinutes < 24 * 60; // 24 hours
}
