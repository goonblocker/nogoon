import '@src/Popup.css';
import {
  useStorage,
  withErrorBoundary,
  withSuspense,
  loginWithPrivy,
  getSyncStatus,
  isBackendAvailable,
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
} from 'lucide-react';
import { Button, Switch, BlurFade } from '@extension/ui';
import WalletManager from './components/WalletManager';

type Screen = 'home' | 'stats' | 'settings' | 'auth' | 'paywall';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const blockingState = useStorage(contentBlockingStorage);
  const authState = useStorage(privyAuthStorage);
  const { login, logout, authenticated, user, ready, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  // Start with auth screen - this is the default until user is authenticated
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [blockAllSites, setBlockAllSites] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const [safeSearch, setSafeSearch] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);

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

  // Sync Privy auth state with our storage AND backend
  useEffect(() => {
    if (ready && authenticated && user) {
      console.log('[Popup] User authenticated, syncing to storage and backend');

      const syncAuth = async () => {
        try {
          const walletAddress = wallets?.[0]?.address || null;

          // Extract all wallet info for storage
          const allWallets = wallets.map(wallet => ({
            address: wallet.address,
            chainType: wallet.chainType as 'ethereum' | 'solana',
          }));

          // Sync to local storage first
          await privyAuthStorage.login(user.id, walletAddress, allWallets);
          console.log('[Popup] Auth synced to local storage with', allWallets.length, 'wallets');

          // Sync to backend if available
          if (backendAvailable) {
            try {
              const accessToken = await getAccessToken();
              if (accessToken) {
                console.log('[Popup] Syncing auth to backend...');
                const backendResponse = await loginWithPrivy(accessToken);
                console.log('[Popup] Backend sync successful:', backendResponse);

                // Update local storage with backend data
                await privyAuthStorage.set(state => ({
                  ...state,
                  isPremium: backendResponse.is_premium,
                  freeBlocksRemaining: backendResponse.free_blocks_remaining,
                }));

                setSyncError(null);
              }
            } catch (error) {
              console.error('[Popup] Backend sync failed:', error);
              setSyncError('Failed to sync with backend. Using local state.');
            }
          }

          // Auto-navigate to home after successful login
          setCurrentScreen('home');
        } catch (error) {
          console.error('[Popup] Auth sync error:', error);
          setSyncError('Authentication sync failed');
        }
      };

      syncAuth();
    } else if (ready && !authenticated && authState.isAuthenticated) {
      console.log('[Popup] User logged out, clearing storage');
      privyAuthStorage.logout();
    } else if (ready && !authenticated) {
      // Fresh install or logged out - ensure storage is clear
      console.log('[Popup] Not authenticated, ensuring storage is clear');
      if (authState.isAuthenticated) {
        privyAuthStorage.logout();
      }
    }
  }, [ready, authenticated, user, wallets, authState.isAuthenticated, backendAvailable, getAccessToken]);

  // Check if user should see paywall (only when authenticated)
  useEffect(() => {
    if (
      authenticated &&
      authState.freeBlocksRemaining === 0 &&
      !authState.isPremium &&
      currentScreen !== 'auth' &&
      currentScreen !== 'paywall'
    ) {
      console.log('[Popup] Out of free blocks, showing paywall');
      setCurrentScreen('paywall');
    }
  }, [authenticated, authState.freeBlocksRemaining, authState.isPremium, currentScreen]);

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
            Sign in to get 10 free daily blocks and protect your browsing experience
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

  // Paywall Screen
  const renderPaywall = () => (
    <BlurFade delay={0.1} inView>
      <div className="relative w-full h-full overflow-hidden">
        <Crown className="absolute top-4 right-6 w-12 h-12 text-yellow-400/30 fill-yellow-400/20 rotate-12" />
        <Sparkles className="absolute bottom-16 left-4 w-10 h-10 text-purple-400/30 fill-purple-400/20" />

        <div className="relative z-10 flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8"
              onClick={() => setCurrentScreen('home')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-black tracking-tighter">Upgrade</h2>
            <div className="w-8" />
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-lg mb-4 text-white text-center">
            <Crown className="w-16 h-16 mx-auto mb-3" />
            <h3 className="text-2xl font-black tracking-tighter mb-2">Out of Free Blocks!</h3>
            <p className="text-sm font-bold tracking-tighter opacity-90">You've used all {10} free daily blocks</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border-2 border-primary mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-black tracking-tighter">Premium Benefits</h4>
            </div>
            <ul className="space-y-2 text-sm font-bold tracking-tighter">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Unlimited daily blocks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Advanced filtering options
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Support development
              </li>
            </ul>
          </div>

          <div className="space-y-2 mt-auto">
            <Button
              size="lg"
              className="w-full h-12 rounded-full text-sm font-black tracking-tighter shadow-lg bg-gradient-to-r from-yellow-500 to-orange-500"
              onClick={async () => {
                // TODO: Integrate actual payment flow
                await privyAuthStorage.upgradeToPremium();
                setCurrentScreen('home');
              }}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium - $4.99/mo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-10 rounded-full text-xs font-black tracking-tighter border-2 bg-transparent"
              onClick={() => setCurrentScreen('home')}>
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </BlurFade>
  );

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
            <h1 className="text-3xl font-black tracking-tighter">nogoon</h1>
            <div className="flex gap-2">
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

          {/* Free Blocks Counter */}
          {!authState.isPremium && (
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg mb-3 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5" />
                <p className="text-sm font-black tracking-tighter">Free Blocks Remaining</p>
              </div>
              <p className="text-4xl font-black tracking-tighter mb-0.5">{authState.freeBlocksRemaining} / 10</p>
              <p className="text-xs font-bold tracking-tighter opacity-90">
                {authState.freeBlocksRemaining === 0
                  ? 'Upgrade for unlimited!'
                  : authState.freeBlocksRemaining < 3
                    ? 'Running low! Consider upgrading'
                    : 'Resets daily'}
              </p>
              {authState.freeBlocksRemaining < 5 && (
                <Button
                  size="sm"
                  className="w-full mt-2 h-8 rounded-full text-xs font-black tracking-tighter bg-white text-purple-600 hover:bg-gray-100"
                  onClick={() => setCurrentScreen('paywall')}>
                  <Crown className="w-3 h-3 mr-1" />
                  Upgrade Now
                </Button>
              )}
            </div>
          )}

          {/* Premium Badge */}
          {authState.isPremium && (
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-4 shadow-lg mb-3 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5" />
                <p className="text-sm font-black tracking-tighter">Premium Active</p>
              </div>
              <p className="text-lg font-black tracking-tighter">Unlimited Blocks ∞</p>
            </div>
          )}

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
              size="lg"
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg"
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
            Stay focused. Stay safe.
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
            <div className="w-8" />
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-br from-secondary to-primary rounded-2xl p-4 shadow-lg mb-3 text-primary-foreground">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <p className="text-sm font-black tracking-tighter">Total Blocks</p>
            </div>
            <p className="text-4xl font-black tracking-tighter mb-0.5">{blockingState.blockedCount}</p>
            <p className="text-xs font-bold tracking-tighter opacity-90">All-time protection</p>
          </div>

          {/* Daily Breakdown */}
          <div className="space-y-2 mb-3">
            <div className="bg-card rounded-xl p-3 border-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-bold tracking-tighter text-muted-foreground">Today</p>
                    <p className="text-xl font-black tracking-tighter">{blockingState.todayBlockedCount}</p>
                  </div>
                </div>
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-3 border-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-xs font-bold tracking-tighter text-muted-foreground">Protection Status</p>
                    <p className="text-xl font-black tracking-tighter">
                      {blockingState.protectionActive ? 'Active' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <Star
                  className={`w-6 h-6 ${blockingState.protectionActive ? 'text-secondary fill-secondary' : 'text-muted-foreground'}`}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-auto">
            <Button size="lg" className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg">
              View Full Report
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3 font-bold tracking-tighter">
            Keep up the momentum!
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
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg bg-gradient-to-r from-primary to-secondary">
              Custom Blocklist
            </Button>

            <Button
              size="lg"
              onClick={() => setShowWalletManager(true)}
              className="w-full h-10 rounded-full text-sm font-black tracking-tighter shadow-lg bg-gradient-to-r from-purple-600 to-blue-600">
              💼 Manage Wallets
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-9 rounded-full text-xs font-black tracking-tighter border-2 bg-transparent">
              Reset to Default
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-2 font-bold tracking-tighter">
            Customize your protection
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
      {currentScreen === 'paywall' && renderPaywall()}
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'stats' && renderStats()}
      {currentScreen === 'settings' && renderSettings()}
      {currentScreen === 'auth' && renderAuth()}

      {/* Wallet Manager Modal */}
      {showWalletManager && <WalletManager onClose={() => setShowWalletManager(false)} />}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
