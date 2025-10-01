# Chrome Extension Integration Guide

This guide shows how to integrate the NoGoon Chrome extension with the FastAPI backend.

## Overview

The integration allows the extension to:
1. Authenticate users via Privy and sync with backend
2. Track block usage server-side
3. Process payments (fiat and token)
4. Sync data bidirectionally

## Required Changes to Extension

### 1. Add Backend API Client

Create `packages/api/lib/backend-client.ts`:

```typescript
import { privyAuthStorage } from '@extension/storage';

const API_BASE_URL = 'https://your-backend.railway.app/api/v1';

class BackendClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get authorization header with Privy token
   */
  private async getAuthHeader(): Promise<Record<string, string>> {
    // Get Privy access token from extension
    // You'll need to store this when user logs in with Privy
    const token = localStorage.getItem('privy_access_token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Login/authenticate with backend using Privy token
   */
  async login(privyAccessToken: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: privyAccessToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const data = await response.json();
    
    // Sync backend state with local storage
    await privyAuthStorage.set(state => ({
      ...state,
      isAuthenticated: true,
      userId: data.user_id,
      isPremium: data.is_premium,
      freeBlocksRemaining: data.free_blocks_remaining
    }));
    
    return data;
  }
  
  /**
   * Verify token and get user status
   */
  async verifyAuth() {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Token verification failed');
    }
    
    return response.json();
  }
  
  /**
   * Sync block usage to backend
   */
  async syncBlockUsage(blocks: Array<{
    blocks_used: number;
    domain?: string;
    is_premium_block: boolean;
  }>) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sync_type: 'blocks_update',
        blocks_usage: blocks
      })
    });
    
    if (!response.ok) {
      throw new Error('Sync failed');
    }
    
    const data = await response.json();
    
    // Update local state with server response
    await privyAuthStorage.set(state => ({
      ...state,
      freeBlocksRemaining: data.user_data.free_blocks_remaining,
      isPremium: data.user_data.is_premium
    }));
    
    return data;
  }
  
  /**
   * Get sync status
   */
  async getSyncStatus() {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/sync/status`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to get sync status');
    }
    
    return response.json();
  }
  
  /**
   * Process fiat payment subscription
   */
  async subscribeFiat(stripePaymentMethodId?: string) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/payments/subscribe/fiat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        payment_method: 'fiat',
        stripe_payment_method_id: stripePaymentMethodId
      })
    });
    
    if (!response.ok) {
      throw new Error('Payment failed');
    }
    
    const data = await response.json();
    
    // Update premium status
    await privyAuthStorage.upgradeToPremium();
    
    return data;
  }
  
  /**
   * Process token payment subscription (50% discount)
   */
  async subscribeToken(params: {
    chain: 'ethereum' | 'solana';
    transaction_hash: string;
    from_address: string;
    token_address?: string;
  }) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/payments/subscribe/token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        payment_method: 'token',
        ...params
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Token payment failed');
    }
    
    const data = await response.json();
    
    // Update premium status
    await privyAuthStorage.upgradeToPremium();
    
    return data;
  }
  
  /**
   * Get user statistics
   */
  async getUserStats() {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/users/stats`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to get stats');
    }
    
    return response.json();
  }
  
  /**
   * Get payment history
   */
  async getPaymentHistory() {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/payments/history`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to get payment history');
    }
    
    return response.json();
  }
}

export const backendClient = new BackendClient();
```

### 2. Update Popup Login Flow

Modify `pages/popup/src/Popup.tsx`:

```typescript
import { backendClient } from '@packages/api';

// In the Privy auth sync effect:
useEffect(() => {
  if (ready && authenticated && user) {
    console.log('[Popup] User authenticated, syncing to storage and backend');
    const walletAddress = wallets?.[0]?.address || null;
    
    // Get Privy access token
    const privyAccessToken = user.accessToken; // Or however you get it from Privy
    
    // Store token for API client
    localStorage.setItem('privy_access_token', privyAccessToken);
    
    // Sync with local storage
    privyAuthStorage.login(user.id, walletAddress).then(async () => {
      // Sync with backend
      try {
        const backendData = await backendClient.login(privyAccessToken);
        console.log('[Popup] Backend sync successful:', backendData);
        
        // Update local state with backend data
        await privyAuthStorage.set(state => ({
          ...state,
          freeBlocksRemaining: backendData.free_blocks_remaining,
          isPremium: backendData.is_premium
        }));
        
        setCurrentScreen('home');
      } catch (error) {
        console.error('[Popup] Backend sync failed:', error);
        // Continue with local-only mode
        setCurrentScreen('home');
      }
    });
  }
}, [ready, authenticated, user, wallets]);
```

### 3. Update Content Script Block Tracking

Modify `pages/content/src/index.ts`:

```typescript
import { backendClient } from '@packages/api';

// After blocking an image:
async function processImage(img: HTMLImageElement) {
  // ... existing code ...
  
  if (result === 'disallowed') {
    // ... existing blocking code ...
    
    // Sync to backend (queue for batch sync)
    queueBlockSync({
      blocks_used: 1,
      domain: new URL(window.location.href).hostname,
      is_premium_block: authState.isPremium
    });
    
    // Decrement local blocks
    const remaining = await privyAuthStorage.decrementFreeBlocks();
    
    // Batch sync every 5 blocks or 30 seconds
    checkBatchSync();
  }
}

// Batch sync queue
let syncQueue: Array<any> = [];
let syncTimeout: NodeJS.Timeout | null = null;

function queueBlockSync(blockData: any) {
  syncQueue.push(blockData);
  
  // Clear existing timeout
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  // Sync if queue reaches 5 blocks or after 30 seconds
  if (syncQueue.length >= 5) {
    performBatchSync();
  } else {
    syncTimeout = setTimeout(performBatchSync, 30000);
  }
}

async function performBatchSync() {
  if (syncQueue.length === 0) return;
  
  try {
    const blocksToSync = [...syncQueue];
    syncQueue = [];
    
    await backendClient.syncBlockUsage(blocksToSync);
    console.log(`[Content] Synced ${blocksToSync.length} blocks to backend`);
  } catch (error) {
    console.error('[Content] Backend sync failed:', error);
    // Keep in queue for retry or handle gracefully
  }
}

// Sync on page unload
window.addEventListener('beforeunload', () => {
  if (syncQueue.length > 0) {
    // Use navigator.sendBeacon for reliable unload sync
    navigator.sendBeacon(
      `${API_BASE_URL}/sync`,
      JSON.stringify({
        sync_type: 'blocks_update',
        blocks_usage: syncQueue
      })
    );
  }
});
```

### 4. Update Payment Flow

Modify paywall upgrade button in `Popup.tsx`:

```typescript
// For token payment:
const handleTokenPayment = async () => {
  try {
    // Get wallet from Privy
    const wallet = wallets[0];
    
    // Initiate payment transaction
    // This is simplified - implement proper Web3 transaction
    const txHash = await wallet.sendTransaction({
      to: 'your_payment_address',
      value: ethers.utils.parseEther('0.01'), // ~$10 worth
    });
    
    // Wait for confirmation
    await txHash.wait();
    
    // Verify and activate subscription on backend
    const payment = await backendClient.subscribeToken({
      chain: 'ethereum',
      transaction_hash: txHash.hash,
      from_address: wallet.address,
    });
    
    console.log('Payment successful:', payment);
    setCurrentScreen('home');
  } catch (error) {
    console.error('Payment failed:', error);
    alert('Payment failed. Please try again.');
  }
};

// For fiat payment (Stripe):
const handleFiatPayment = async () => {
  try {
    // Implement Stripe checkout
    // Then call backend
    const payment = await backendClient.subscribeFiat();
    
    console.log('Payment successful:', payment);
    setCurrentScreen('home');
  } catch (error) {
    console.error('Payment failed:', error);
    alert('Payment failed. Please try again.');
  }
};
```

### 5. Add Periodic Sync

Create a background script sync:

```typescript
// In background/index.ts
import { backendClient } from '@packages/api';

// Sync every 5 minutes
setInterval(async () => {
  try {
    const status = await backendClient.getSyncStatus();
    
    // Update local storage with backend state
    await privyAuthStorage.set(state => ({
      ...state,
      freeBlocksRemaining: status.free_blocks_remaining,
      isPremium: status.is_premium
    }));
    
    console.log('[Background] Periodic sync completed');
  } catch (error) {
    console.error('[Background] Periodic sync failed:', error);
  }
}, 5 * 60 * 1000);
```

## Testing Integration

### 1. Test Authentication
```javascript
// In browser console (extension context)
const privyToken = 'your_privy_jwt';
const result = await backendClient.login(privyToken);
console.log(result);
```

### 2. Test Block Sync
```javascript
await backendClient.syncBlockUsage([
  { blocks_used: 1, domain: 'example.com', is_premium_block: false }
]);
```

### 3. Test Payment
```javascript
// Token payment
await backendClient.subscribeToken({
  chain: 'ethereum',
  transaction_hash: '0x...',
  from_address: '0x...'
});
```

## Error Handling

Always handle backend errors gracefully:

```typescript
try {
  await backendClient.syncBlockUsage(blocks);
} catch (error) {
  console.error('Backend sync failed, continuing with local state:', error);
  // Extension continues to work with local storage
}
```

## Security Considerations

1. **Token Storage**: Store Privy access token securely
2. **HTTPS Only**: Never use HTTP in production
3. **Validate Responses**: Always validate backend responses
4. **Fallback to Local**: Extension should work even if backend is down
5. **Rate Limiting**: Respect backend rate limits

## Deployment Checklist

- [ ] Update `API_BASE_URL` to production backend URL
- [ ] Add extension ID to backend `ALLOWED_ORIGINS`
- [ ] Test authentication flow end-to-end
- [ ] Test payment flows (both fiat and token)
- [ ] Test block sync under various network conditions
- [ ] Monitor backend logs for errors
- [ ] Set up error tracking (Sentry, etc.)

## Support

If integration issues occur:
1. Check browser console for errors
2. Verify Privy token is valid
3. Check backend logs
4. Ensure CORS is configured correctly
5. Verify all environment variables are set

