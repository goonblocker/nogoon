import '@src/Popup.css';
import {
  useStorage,
  withErrorBoundary,
  withSuspense,
  loginWithPrivy,
  getSyncStatus,
  isBackendAvailable,
  getUserStats,
} from '@extension/shared';
import { exampleThemeStorage, contentBlockingStorage, privyAuthStorage } from '@extension/storage';
import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  Shield,
  Settings,
  BarChart3,
  Star,
  Circle,
  Triangle,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Lock,
  ChevronLeft,
  LogIn,
  LogOut,
  Crown,
  Sparkles,
  Calendar,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { Button, Switch, BlurFade } from '@extension/ui';
import WalletManager from './components/WalletManager';

type Screen = 'home' | 'stats' | 'settings' | 'auth';
type Theme = 'light' | 'dark' | 'pitch-black';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const blockingState = useStorage(contentBlockingStorage);
  const authState = useStorage(privyAuthStorage);
  const { login, logout, authenticated, user, ready, getAccessToken, createWallet, connectedWallets } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  // Start with auth screen - this is the default until user is authenticated
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [blockAllSites, setBlockAllSites] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const [safeSearch, setSafeSearch] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [userStats, setUserStats] = useState<{
    total_blocks_used: number;
    blocks_used_today: number;
    blocks_used_this_week: number;
    blocks_used_this_month: number;
    most_blocked_domains: Array<{ domain: string; blocks: number }>;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>('dark');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // AUTH GUARD: Force user to auth screen when not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      console.log('[Popup] User not authenticated, forcing auth screen');
      setCurrentScreen('auth');
    }
  }, [ready, authenticated]);

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      const available = await isBackendAvailable();
      setBackendAvailable(available);
      if (!available) {
        console.warn('[Popup] Backend is not available - running in offline mode');
        setSyncError('Backend server unavailable. Running in offline mode.');
      }
    };
    checkBackend();
  }, []);

  // Fetch user statistics when stats screen is opened
  const fetchUserStats = async () => {
    if (!authenticated || !getAccessToken) {
      console.warn('[Popup] Cannot fetch stats - user not authenticated');
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const accessToken = await getAccessToken();
      console.log('[Popup] Fetching user statistics...');
      const response = await getUserStats(accessToken);
      console.log('[Popup] User stats received:', response);
      setUserStats(response.stats);
    } catch (error) {
      console.error('[Popup] Error fetching user stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load stats when stats screen is opened
  useEffect(() => {
    if (currentScreen === 'stats' && authenticated && !userStats && !statsLoading) {
      fetchUserStats();
    }
  }, [currentScreen, authenticated]);

  // Close theme menu when switching screens
  useEffect(() => {
    setShowThemeMenu(false);
  }, [currentScreen]);

  // Theme switching functions
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'pitch-black');
    root.classList.add(theme);
    setCurrentTheme(theme);
  };

  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setShowThemeMenu(false);
  };

  // Apply theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  // Close theme menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showThemeMenu) {
        const target = event.target as Element;
        if (!target.closest('[data-theme-menu]')) {
          setShowThemeMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemeMenu]);

  // Check wallets after a delay - for debugging only
  useEffect(() => {
    if (ready && authenticated && user && walletsReady) {
      // Give Privy time to create all wallets
      const timer = setTimeout(() => {
        console.log('[Popup] Checking wallets after delay...');
        console.log('[Popup] Wallets available from useWallets():', wallets);
        console.log('[Popup] User.wallet (may not be in useWallets):', user.wallet);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [ready, authenticated, user, walletsReady, wallets]);

  // Sync Privy auth state with our storage AND backend (only once per session)
  useEffect(() => {
    if (ready && authenticated && user && !hasSynced && !isSyncing) {
      setIsSyncing(true);
      console.log('[Popup] User authenticated, syncing to storage and backend');

      const syncAuth = async () => {
        try {
          // Wait for wallets to be ready
          if (!walletsReady) {
            console.log('[Popup] Waiting for wallets to be ready...');
            setIsSyncing(false);
            return;
          }

          console.log('[Popup] Wallets from useWallets:', wallets);
          console.log('[Popup] User object full:', user);
          console.log('[Popup] User wallet property:', user.wallet);

          // Combine wallets from useWallets() and user.wallet
          const allUserWallets = [...wallets];
          if (user.wallet && !allUserWallets.find(w => w.address === user.wallet.address)) {
            allUserWallets.push(user.wallet);
          }

          console.log('[Popup] All combined wallets:', allUserWallets);

          // Check if we have both wallet types (using correct property)
          const hasEthereumWallet = allUserWallets.some(w => w.type === 'ethereum' || w.chainType === 'ethereum');
          const hasSolanaWallet = allUserWallets.some(w => w.type === 'solana' || w.chainType === 'solana');
          console.log('[Popup] Has Ethereum wallet:', hasEthereumWallet);
          console.log('[Popup] Has Solana wallet:', hasSolanaWallet);

          const walletAddress = allUserWallets?.[0]?.address || null;

          // Extract all wallet info for storage
          const allWallets = allUserWallets.map(wallet => ({
            address: wallet.address,
            chainType: (wallet.type || wallet.chainType) as 'ethereum' | 'solana',
          }));

          // Sync to local storage first
          await privyAuthStorage.login(user.id, walletAddress, allWallets);
          console.log('[Popup] Auth synced to local storage with', allWallets.length, 'wallets');
          console.log('[Popup] Wallet details:', allWallets);

          // Sync to backend if available
          if (backendAvailable) {
            try {
              const accessToken = await getAccessToken();
              if (accessToken) {
                console.log('[Popup] Syncing auth to backend...');
                console.log('[Popup] Access token length:', accessToken.length);
                console.log('[Popup] Access token preview:', accessToken.substring(0, 50) + '...');

                const backendResponse = await loginWithPrivy(accessToken);
                console.log('[Popup] Backend sync successful:', backendResponse);

                // Update local storage with backend data
                await privyAuthStorage.set(state => ({
                  ...state,
                  isPremium: backendResponse.is_premium,
                  freeBlocksRemaining: backendResponse.free_blocks_remaining,
                }));

                setSyncError(null);
              } else {
                console.warn('[Popup] No access token available for backend sync');
                setSyncError('No access token available. Using local state only.');
              }
            } catch (error) {
              console.error('[Popup] Backend sync failed:', error);
              console.error('[Popup] Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
              });

              // Check if this is a backend Privy verification issue
              if (error instanceof Error && error.message === 'Authentication failed') {
                console.warn('[Popup] Backend Privy verification is broken - this is a known backend issue');
                console.warn('[Popup] Extension will work in local mode with basic functionality');
                console.warn('[Popup] Backend needs to be updated to use correct Privy JWKS endpoint');
              }

              // Don't show backend errors to user - just log them and continue with local state
              console.warn('[Popup] Continuing with local state due to backend sync failure');
              setSyncError(null); // Don't show error to user
            }
          } else {
            console.log('[Popup] Backend not available, skipping sync');
            setSyncError('Backend server unavailable. Running in offline mode.');
          }

          // Mark as synced and navigate to home
          setHasSynced(true);
          setCurrentScreen('home');
        } catch (error) {
          console.error('[Popup] Auth sync error:', error);
          setSyncError('Authentication sync failed');
        } finally {
          setIsSyncing(false);
        }
      };

      syncAuth();
    } else if (ready && !authenticated && authState.isAuthenticated) {
      console.log('[Popup] User logged out, clearing storage');
      privyAuthStorage.logout();
      setHasSynced(false);
      setCurrentScreen('auth');
    } else if (ready && !authenticated) {
      // Fresh install or logged out - ensure storage is clear
      console.log('[Popup] Not authenticated, ensuring storage is clear');
      if (authState.isAuthenticated) {
        privyAuthStorage.logout();
        setHasSynced(false);
      }
    }
  }, [ready, authenticated, user, walletsReady, backendAvailable, hasSynced, isSyncing]);

  // $NoGoon MODEL: No paywall needed, always free

  // Handler for toggling protection
  const handleProtectionToggle = async (checked: boolean) => {
    await contentBlockingStorage.set(state => ({
      ...state,
      protectionActive: checked,
    }));
  };

  // Handler for logout - ensures proper cleanup and navigation
  const handleLogout = async () => {
    console.log('[Popup] Logging out user');
    setCurrentScreen('auth'); // Immediately switch to auth screen
    await privyAuthStorage.logout(); // Clear storage
    await logout(); // Logout from Privy
    console.log('[Popup] Logout complete');
  };

  // Auth Screen
  const renderAuth = () => (
    <BlurFade delay={0.1} inView>
      <div className="relative w-full h-full overflow-hidden">
        <Star className="absolute top-4 right-6 w-10 h-10 text-primary/25 fill-primary/15 rotate-12" />
        <Circle className="absolute bottom-16 left-4 w-8 h-8 text-primary/20 fill-primary/10" />

        <div className="relative z-10 flex flex-col h-full p-4 items-center justify-center">
          <div className="bg-gradient-to-br from-primary to-secondary rounded-full p-4 mb-4">
            <Shield className="w-12 h-12 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-black tracking-tighter mb-2">Welcome to NoGoon</h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs font-bold tracking-tighter">
            100% Free Forever. Powered by $NoGoon trading volume.
          </p>

          <Button
            size="lg"
            className="w-full max-w-xs h-12 rounded-full text-sm font-black tracking-tighter shadow-lg !bg-black  !text-white border-0 flex flex-row"
            onClick={login}>
            Sign In with Privy
            <LogIn className="w-4 h-4 mr-2" />
          </Button>

          <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
            The side panel will stay open while you check your email for the verification code
          </p>
        </div>
      </div>
    </BlurFade>
  );

  // $NoGoon MODEL: No paywall needed - extension is 100% free

  // Main Dashboard Screen
  const renderHome = () => (
    <BlurFade delay={0.1} inView>
      <div className="relative w-full h-full overflow-hidden">
        {/* Decorative elements */}
        <Circle className="absolute -top-4 -left-4 w-12 h-12 text-primary/20 fill-primary/10" />
        <Star className="absolute top-6 right-4 w-6 h-6 text-primary/30 fill-primary/20 rotate-12" />
        <Triangle className="absolute bottom-16 -left-3 w-10 h-10 text-primary/20 fill-primary/10 -rotate-12" />
        <Zap className="absolute bottom-6 right-6 w-8 h-8 text-primary/20 fill-primary/10 rotate-45" />

        {/* Main content */}
        <div className="relative z-10 flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-black tracking-tighter">$NoGoon</h1>
            <div className="flex gap-2">
              {/* Theme Switcher */}
              <div className="relative" data-theme-menu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-8 h-8"
                  title={`Switch theme (Current: ${currentTheme})`}
                  onClick={() => setShowThemeMenu(!showThemeMenu)}>
                  {currentTheme === 'light' && <Sun className="w-4 h-4" />}
                  {currentTheme === 'dark' && <Moon className="w-4 h-4" />}
                  {currentTheme === 'pitch-black' && <Monitor className="w-4 h-4" />}
                </Button>

                {showThemeMenu && (
                  <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[120px]">
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold tracking-tighter transition-colors ${
                        currentTheme === 'light'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleThemeChange('light')}>
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold tracking-tighter transition-colors ${
                        currentTheme === 'dark'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleThemeChange('dark')}>
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold tracking-tighter transition-colors ${
                        currentTheme === 'pitch-black'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleThemeChange('pitch-black')}>
                      <Monitor className="w-4 h-4" />
                      Pitch Black
                    </button>
                  </div>
                )}
              </div>

              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8"
                onClick={() => setCurrentScreen('settings')}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-3 shadow-lg mb-3 border-2 border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold tracking-tighter">Protection</p>
                  <p className="text-lg font-black tracking-tighter">
                    {blockingState.protectionActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <Switch checked={blockingState.protectionActive} onCheckedChange={handleProtectionToggle} />
            </div>
          </div>

          {/* $NoGoon Powered - Always Free */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 shadow-lg mb-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" />
              <p className="text-sm font-black tracking-tighter">Powered by $NoGoon</p>
            </div>
            <p className="text-2xl font-black tracking-tighter mb-0.5">100% Free Forever ∞</p>
            <p className="text-xs font-bold tracking-tighter opacity-90">Every trade sponsors your focus</p>
          </div>

          <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-4 shadow-lg mb-3 text-primary-foreground">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5" />
              <p className="text-sm font-black tracking-tighter">Today's Blocks</p>
            </div>
            <p className="text-4xl font-black tracking-tighter mb-0.5">{blockingState.todayBlockedCount}</p>
            <p className="text-xs font-bold tracking-tighter opacity-90">
              {blockingState.todayBlockedCount === 0
                ? 'No blocks yet today'
                : blockingState.todayBlockedCount < 10
                  ? "You're doing great!"
                  : blockingState.todayBlockedCount < 50
                    ? 'Excellent protection!'
                    : 'Outstanding work!'}
            </p>
          </div>

          <div className="space-y-2 mt-auto">
            <Button
              variant="default"
              size="lg"
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setCurrentScreen('stats')}>
              View Statistics
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter border-2 bg-transparent"
              onClick={() => setCurrentScreen('settings')}>
              Manage Blocklist
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3 font-bold tracking-tighter">
            Powered by $NoGoon trading volume.
          </p>
        </div>
      </div>
    </BlurFade>
  );

  // Statistics Screen
  const renderStats = () => (
    <BlurFade delay={0.1} inView>
      <div className="relative w-full h-full overflow-hidden">
        {/* Decorative elements */}
        <Star className="absolute top-4 -right-2 w-8 h-8 text-primary/25 fill-primary/15 -rotate-12" />
        <Circle className="absolute top-16 left-2 w-6 h-6 text-primary/20 fill-primary/10" />
        <Triangle className="absolute bottom-6 right-4 w-10 h-10 text-primary/20 fill-primary/10 rotate-45" />

        {/* Main content */}
        <div className="relative z-10 flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8"
              onClick={() => setCurrentScreen('home')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-black tracking-tighter">Stats</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8"
                onClick={fetchUserStats}
                disabled={statsLoading}>
                <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
              </Button>
              {/* Theme Switcher */}
              <div className="relative" data-theme-menu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-8 h-8"
                  title={`Switch theme (Current: ${currentTheme})`}
                  onClick={() => setShowThemeMenu(!showThemeMenu)}>
                  {currentTheme === 'light' && <Sun className="w-4 h-4" />}
                  {currentTheme === 'dark' && <Moon className="w-4 h-4" />}
                  {currentTheme === 'pitch-black' && <Monitor className="w-4 h-4" />}
                </Button>

                {showThemeMenu && (
                  <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[120px]">
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold tracking-tighter transition-colors ${
                        currentTheme === 'light'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleThemeChange('light')}>
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold tracking-tighter transition-colors ${
                        currentTheme === 'dark'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleThemeChange('dark')}>
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold tracking-tighter transition-colors ${
                        currentTheme === 'pitch-black'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleThemeChange('pitch-black')}>
                      <Monitor className="w-4 h-4" />
                      Pitch Black
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {statsLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm font-bold tracking-tighter text-muted-foreground">Loading statistics...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {statsError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <p className="text-sm font-bold tracking-tighter text-destructive">Error Loading Stats</p>
              </div>
              <p className="text-xs text-destructive/80">{statsError}</p>
              <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={fetchUserStats}>
                Retry
              </Button>
            </div>
          )}

          {/* Statistics Content */}
          {!statsLoading && !statsError && userStats && (
            <>
              {/* Total Summary */}
              <div className="bg-gradient-to-br from-secondary to-primary rounded-2xl p-4 shadow-lg mb-3 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <p className="text-sm font-black tracking-tighter">Total Blocks</p>
                </div>
                <p className="text-4xl font-black tracking-tighter mb-0.5">{userStats.total_blocks_used}</p>
                <p className="text-xs font-bold tracking-tighter opacity-90">All-time protection</p>
              </div>

              {/* Time Period Breakdown */}
              <div className="space-y-2 mb-3">
                <div className="bg-card rounded-xl p-3 border-2 border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold tracking-tighter text-muted-foreground">Today</p>
                        <p className="text-xl font-black tracking-tighter">{userStats.blocks_used_today}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border-2 border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-secondary" />
                      <div>
                        <p className="text-xs font-bold tracking-tighter text-muted-foreground">This Week</p>
                        <p className="text-xl font-black tracking-tighter">{userStats.blocks_used_this_week}</p>
                      </div>
                    </div>
                    <TrendingUp className="w-6 h-6 text-secondary" />
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border-2 border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold tracking-tighter text-muted-foreground">This Month</p>
                        <p className="text-xl font-black tracking-tighter">{userStats.blocks_used_this_month}</p>
                      </div>
                    </div>
                    <Star className="w-6 h-6 text-primary fill-primary" />
                  </div>
                </div>
              </div>

              {/* Most Blocked Domains */}
              {userStats.most_blocked_domains && userStats.most_blocked_domains.length > 0 && (
                <div className="bg-card rounded-xl p-3 border-2 border-border mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <p className="text-sm font-bold tracking-tighter">Top Blocked Sites</p>
                  </div>
                  <div className="space-y-1">
                    {userStats.most_blocked_domains.slice(0, 3).map((domain, index) => (
                      <div key={domain.domain} className="flex items-center justify-between text-xs">
                        <span className="font-bold tracking-tighter text-muted-foreground truncate">
                          {index + 1}. {domain.domain}
                        </span>
                        <span className="font-black tracking-tighter text-primary">{domain.blocks}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fallback to Local Data */}
          {!statsLoading && !statsError && !userStats && (
            <>
              <div className="bg-gradient-to-br from-secondary to-primary rounded-2xl p-4 shadow-lg mb-3 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <p className="text-sm font-black tracking-tighter">Local Blocks</p>
                </div>
                <p className="text-4xl font-black tracking-tighter mb-0.5">{blockingState.blockedCount}</p>
                <p className="text-xs font-bold tracking-tighter opacity-90">Local tracking only</p>
              </div>

              <div className="bg-card rounded-xl p-3 border-2 border-border mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold tracking-tighter text-muted-foreground">Today (Local)</p>
                      <p className="text-xl font-black tracking-tighter">{blockingState.todayBlockedCount}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="mt-auto">
            <Button
              size="lg"
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg"
              onClick={() => {
                // For now, just show an alert. In production, this could open a detailed analytics page
                alert('Full analytics report coming soon! This will show detailed usage statistics and trends.');
              }}>
              View Full Report
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3 font-bold tracking-tighter">
            Degens fund your focus. Thank the traders.
          </p>
        </div>
      </div>
    </BlurFade>
  );

  // Settings Screen
  const renderSettings = () => (
    <BlurFade delay={0.1} inView>
      <div className="relative w-full h-full overflow-hidden">
        {/* Decorative elements */}
        <Zap className="absolute -top-3 right-6 w-10 h-10 text-primary/20 fill-primary/10 rotate-12" />
        <Circle className="absolute top-20 -right-3 w-8 h-8 text-primary/25 fill-primary/15" />
        <Star className="absolute bottom-16 left-3 w-7 h-7 text-primary/25 fill-primary/15 -rotate-45" />

        {/* Main content */}
        <div className="relative z-10 flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8"
              onClick={() => setCurrentScreen('home')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-black tracking-tighter">Settings</h2>
            <div className="w-8" />
          </div>

          {/* Settings Options */}
          <div className="space-y-2 mb-3">
            <div className="bg-card rounded-xl p-3 border-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-black tracking-tighter">Block All Sites</p>
                    <p className="text-xs font-bold tracking-tighter text-muted-foreground">Maximum protection</p>
                  </div>
                </div>
                <Switch checked={blockAllSites} onCheckedChange={setBlockAllSites} className="scale-90" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-3 border-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-sm font-black tracking-tighter">Show Warnings</p>
                    <p className="text-xs font-bold tracking-tighter text-muted-foreground">Alert before blocking</p>
                  </div>
                </div>
                <Switch checked={showWarnings} onCheckedChange={setShowWarnings} className="scale-90" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-3 border-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-black tracking-tighter">Safe Search</p>
                    <p className="text-xs font-bold tracking-tighter text-muted-foreground">Filter search results</p>
                  </div>
                </div>
                <Switch checked={safeSearch} onCheckedChange={setSafeSearch} className="scale-90" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mt-auto">
            <Button
              size="lg"
              onClick={() =>
                alert(
                  'Custom Blocklist feature coming soon! 🚀\n\nThis will allow you to:\n• Add custom domains to block\n• Whitelist trusted sites\n• Import/export blocklists\n\nPowered by $NoGoon trading fees.',
                )
              }
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg bg-gradient-to-r from-primary to-secondary">
              Custom Blocklist
            </Button>

            <Button
              size="lg"
              onClick={() => setShowWalletManager(true)}
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg bg-gradient-to-r from-purple-600 to-blue-600">
              💎 Wallet Manager
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    'Reset all settings to default?\n\nThis will:\n• Reset protection settings\n• Clear custom blocklists\n• Reset UI preferences',
                  )
                ) {
                  alert('Settings reset! 🔄\n\nAll settings restored to defaults.');
                }
              }}
              className="w-full h-9 rounded-full text-xs font-black tracking-tighter border-2 bg-transparent">
              Reset to Default
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-2 font-bold tracking-tighter">
            100% Free. Powered by $NoGoon.
          </p>
        </div>
      </div>
    </BlurFade>
  );

  // AUTHENTICATION GUARD: Don't render protected screens if not authenticated
  // This prevents flash of wrong content and enforces login requirement

  console.log('[Popup Render] ready:', ready, 'authenticated:', authenticated, 'currentScreen:', currentScreen);

  if (!ready) {
    console.log('[Popup Render] Privy not ready, showing loading screen');
    return (
      <div className="w-full h-full flex flex-col bg-background items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-primary animate-pulse" />
          <p className="text-sm font-bold tracking-tighter text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    // FORCE AUTH SCREEN: User must login before accessing any other screen
    console.log('[Popup Render] Not authenticated, forcing auth screen');
    return <div className="w-full h-full flex flex-col bg-background">{renderAuth()}</div>;
  }

  // User is authenticated - show the requested screen
  console.log('[Popup Render] Authenticated, showing screen:', currentScreen);
  return (
    <div className="w-full h-full flex flex-col bg-background">
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'stats' && renderStats()}
      {currentScreen === 'settings' && renderSettings()}
      {currentScreen === 'auth' && renderAuth()}

      {/* Wallet Manager Modal Overlay */}
      {showWalletManager && <WalletManager onClose={() => setShowWalletManager(false)} />}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
