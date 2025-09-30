import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, contentBlockingStorage } from '@extension/storage';
import { useState } from 'react';
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
} from 'lucide-react';
import { Button, Switch, BlurFade } from '@extension/ui';

type Screen = 'home' | 'stats' | 'settings';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const blockingState = useStorage(contentBlockingStorage);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [blockAllSites, setBlockAllSites] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const [safeSearch, setSafeSearch] = useState(true);

  // Handler for toggling protection
  const handleProtectionToggle = async (checked: boolean) => {
    await contentBlockingStorage.set(state => ({
      ...state,
      protectionActive: checked,
    }));
  };

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
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8"
              onClick={() => setCurrentScreen('settings')}>
              <Settings className="w-4 h-4" />
            </Button>
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

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'stats' && renderStats()}
      {currentScreen === 'settings' && renderSettings()}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
