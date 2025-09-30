import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

type ContentBlockingState = {
  protectionActive: boolean;
  blockedCount: number;
  todayBlockedCount: number;
  lastResetDate: string;
};

type ContentBlockingStorage = BaseStorage<ContentBlockingState> & {
  toggleProtection: () => Promise<void>;
  incrementBlockCount: () => Promise<void>;
  resetDailyCount: () => Promise<void>;
};

const defaultState: ContentBlockingState = {
  protectionActive: true,
  blockedCount: 0,
  todayBlockedCount: 0,
  lastResetDate: new Date().toDateString(),
};

const storage = createStorage<ContentBlockingState>('content-blocking-storage', defaultState, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// You can extend it with your own methods
export const contentBlockingStorage: ContentBlockingStorage = {
  ...storage,
  toggleProtection: async () => {
    await storage.set(currentState => ({
      ...currentState,
      protectionActive: !currentState.protectionActive,
    }));
  },
  incrementBlockCount: async () => {
    await storage.set(currentState => {
      const today = new Date().toDateString();
      const isNewDay = currentState.lastResetDate !== today;

      return {
        ...currentState,
        blockedCount: currentState.blockedCount + 1,
        todayBlockedCount: isNewDay ? 1 : currentState.todayBlockedCount + 1,
        lastResetDate: today,
      };
    });
  },
  resetDailyCount: async () => {
    await storage.set(currentState => ({
      ...currentState,
      todayBlockedCount: 0,
      lastResetDate: new Date().toDateString(),
    }));
  },
};
