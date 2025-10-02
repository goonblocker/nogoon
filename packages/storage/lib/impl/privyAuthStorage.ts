import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

type WalletInfo = {
  address: string;
  chainType: 'ethereum' | 'solana';
};

type PrivyAuthState = {
  isAuthenticated: boolean;
  userId: string | null;
  walletAddress: string | null; // Primary wallet for backwards compatibility
  wallets: WalletInfo[];
  isPremium: boolean;
  freeBlocksRemaining: number;
  lastFreeBlocksResetDate: string;
};

type PrivyAuthStorage = BaseStorage<PrivyAuthState> & {
  login: (userId: string, walletAddress: string | null, allWallets?: WalletInfo[]) => Promise<void>;
  logout: () => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  decrementFreeBlocks: () => Promise<number>; // Returns remaining blocks
  resetDailyFreeBlocks: () => Promise<void>;
  canBlock: () => Promise<boolean>; // Check if user can block content
};

const defaultState: PrivyAuthState = {
  isAuthenticated: false,
  userId: null,
  walletAddress: null,
  wallets: [],
  isPremium: false,
  freeBlocksRemaining: 10,
  lastFreeBlocksResetDate: new Date().toDateString(),
};

const storage = createStorage<PrivyAuthState>('privy-auth-storage', defaultState, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const privyAuthStorage: PrivyAuthStorage = {
  ...storage,
  login: async (userId: string, walletAddress: string | null, allWallets: WalletInfo[] = []) => {
    await storage.set(currentState => ({
      ...currentState,
      isAuthenticated: true,
      userId,
      walletAddress,
      wallets: allWallets,
    }));
  },
  logout: async () => {
    await storage.set(() => ({
      ...defaultState,
      // Reset free blocks on logout
      freeBlocksRemaining: 10,
      lastFreeBlocksResetDate: new Date().toDateString(),
    }));
  },
  upgradeToPremium: async () => {
    await storage.set(currentState => ({
      ...currentState,
      isPremium: true,
    }));
  },
  decrementFreeBlocks: async () => {
    let remaining = 0;
    await storage.set(currentState => {
      const today = new Date().toDateString();
      const isNewDay = currentState.lastFreeBlocksResetDate !== today;

      // Reset free blocks if it's a new day
      const blocksToUse = isNewDay ? 10 : currentState.freeBlocksRemaining;
      remaining = Math.max(0, blocksToUse - 1);

      return {
        ...currentState,
        freeBlocksRemaining: remaining,
        lastFreeBlocksResetDate: today,
      };
    });
    return remaining;
  },
  resetDailyFreeBlocks: async () => {
    await storage.set(currentState => ({
      ...currentState,
      freeBlocksRemaining: 10,
      lastFreeBlocksResetDate: new Date().toDateString(),
    }));
  },
  canBlock: async () => {
    // $NoGoon MODEL: Always free, no limits, powered by token trading fees
    return true;
  },
};
