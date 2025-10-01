/**
 * Backend API service for NoGoon Chrome Extension
 * Handles all communication with the FastAPI backend server
 *
 * SECURITY: This file only sends authentication tokens to the backend.
 * No database credentials or sensitive data is exposed to the client.
 */

// Backend API base URL - production Railway deployment
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://content-blocking-extension-production.up.railway.app';

export interface UserData {
  user_id: string;
  email?: string | null;
  wallet_address?: string | null;
  is_premium: boolean;
  subscription_status: string;
  free_blocks_remaining: number;
  total_blocks_used: number;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  created_at: string;
  last_login?: string | null;
}

export interface AuthResponse {
  status: string;
  user_id: string;
  is_premium: boolean;
  free_blocks_remaining: number;
  subscription_status: string;
  message: string;
}

export interface SyncResponse {
  status: string;
  user_data: UserData;
  synced_blocks: number;
  message: string;
}

export interface BlockUsage {
  blocks_used: number;
  domain?: string;
  is_premium_block: boolean;
}

/**
 * Make authenticated API request to backend
 * Automatically includes Privy auth token in headers
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, authToken?: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if provided
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Login user with Privy access token
 * Creates user in backend if doesn't exist
 */
export async function loginWithPrivy(accessToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken }),
  });
}

/**
 * Verify authentication token and get user status
 * Used to check if user is still authenticated
 */
export async function verifyAuth(accessToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    '/api/v1/auth/verify',
    {
      method: 'POST',
    },
    accessToken,
  );
}

/**
 * Logout user (mainly for logging purposes)
 */
export async function logout(accessToken: string): Promise<{ status: string; message: string }> {
  return apiRequest(
    '/api/v1/auth/logout',
    {
      method: 'POST',
    },
    accessToken,
  );
}

/**
 * Get current user data from backend
 */
export async function getCurrentUser(accessToken: string): Promise<UserData> {
  return apiRequest<UserData>(
    '/api/v1/users/me',
    {
      method: 'GET',
    },
    accessToken,
  );
}

/**
 * Sync block usage data from extension to backend
 * Updates user's free blocks and tracks analytics
 */
export async function syncBlockUsage(accessToken: string, blocksUsage: BlockUsage[]): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(
    '/api/v1/sync',
    {
      method: 'POST',
      body: JSON.stringify({
        sync_type: 'blocks_update',
        blocks_usage: blocksUsage,
      }),
    },
    accessToken,
  );
}

/**
 * Perform full sync - gets latest user data from backend
 * Useful for refreshing state after daily reset
 */
export async function fullSync(accessToken: string): Promise<SyncResponse> {
  return apiRequest<SyncResponse>(
    '/api/v1/sync',
    {
      method: 'POST',
      body: JSON.stringify({
        sync_type: 'full_sync',
      }),
    },
    accessToken,
  );
}

/**
 * Get sync status and latest user data
 * Checks if local state is in sync with backend
 */
export async function getSyncStatus(accessToken: string): Promise<UserData> {
  return apiRequest<UserData>(
    '/api/v1/sync/status',
    {
      method: 'GET',
    },
    accessToken,
  );
}

/**
 * Get user usage statistics
 */
export async function getUserStats(accessToken: string): Promise<{
  status: string;
  stats: {
    total_blocks_used: number;
    blocks_used_today: number;
    blocks_used_this_week: number;
    blocks_used_this_month: number;
    most_blocked_domains: Array<{ domain: string; blocks: number }>;
  };
}> {
  return apiRequest(
    '/api/v1/users/stats',
    {
      method: 'GET',
    },
    accessToken,
  );
}

/**
 * Health check endpoint
 * Used to verify backend is reachable
 */
export async function healthCheck(): Promise<{
  status: string;
  environment: string;
  version: string;
}> {
  return apiRequest('/health', { method: 'GET' });
}

/**
 * Check if backend is available
 * Returns true if backend is reachable, false otherwise
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    await healthCheck();
    return true;
  } catch {
    return false;
  }
}
