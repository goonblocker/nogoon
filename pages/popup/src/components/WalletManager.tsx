import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useExportWallet as useSolanaExportWallet } from '@privy-io/react-auth/solana';
import { Button } from '@extension/ui';
import { Copy, ExternalLink, Wallet, RefreshCw } from 'lucide-react';

interface WalletManagerProps {
  onClose: () => void;
}

export default function WalletManager({ onClose }: WalletManagerProps) {
  const { exportWallet, user } = usePrivy();
  const { exportWallet: exportSolanaWallet } = useSolanaExportWallet();
  const { wallets, ready: walletsReady } = useWallets();
  const [exportingWallet, setExportingWallet] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Combine wallets from useWallets() and user.wallet (same logic as Popup.tsx)
  const allUserWallets = React.useMemo(() => {
    const combined = [...wallets];
    if (user?.wallet && !combined.find(w => w.address === user.wallet.address)) {
      combined.push(user.wallet);
    }
    return combined;
  }, [wallets, user?.wallet]);

  // Debug logging
  useEffect(() => {
    if (walletsReady) {
      console.log('[WalletManager] Wallets from useWallets:', wallets);
      console.log('[WalletManager] User wallet:', user?.wallet);
      console.log('[WalletManager] Combined wallets:', allUserWallets);
      console.log('[WalletManager] Wallet count:', allUserWallets.length);
      allUserWallets.forEach((wallet, index) => {
        console.log(`[WalletManager] Wallet ${index}:`, {
          address: wallet.address,
          chainType: wallet.chainType,
          type: wallet.type,
          walletClientType: wallet.walletClientType,
          connectorType: wallet.connectorType,
        });
      });
    }
  }, [allUserWallets, walletsReady, user?.wallet]);

  const handleExportWallet = async (walletAddress: string) => {
    setExportingWallet(walletAddress);
    try {
      const walletToExport = allUserWallets.find(w => w.address === walletAddress);
      if (walletToExport && walletToExport.walletClientType === 'privy') {
        const chainType = getChainType(walletToExport);
        console.log('[WalletManager] Exporting Privy wallet:', walletAddress);
        console.log('[WalletManager] Wallet chain type:', chainType);

        // Check if wallet exists in useWallets() (required for export)
        const isInWalletsList = wallets.some(w => w.address === walletAddress);
        console.log('[WalletManager] Wallet in useWallets():', isInWalletsList);

        if (chainType === 'ethereum') {
          // ✅ Ethereum: Use standard exportWallet with address parameter
          console.log('[WalletManager] Exporting Ethereum wallet with address:', walletAddress);
          await exportWallet({ address: walletAddress });
        } else if (chainType === 'solana') {
          // ✅ Solana: Use Solana-specific exportWallet from @privy-io/react-auth/solana
          console.log('[WalletManager] Exporting Solana wallet with address:', walletAddress);
          console.log('[WalletManager] Using Solana-specific useExportWallet hook');

          // According to Privy docs, Solana export accepts address parameter just like EVM
          await exportSolanaWallet({ address: walletAddress });
        } else {
          throw new Error(`Unsupported chain type: ${chainType}`);
        }

        console.log('[WalletManager] Export modal opened');
      } else {
        console.warn('[WalletManager] Wallet not found or not a Privy wallet:', walletToExport);
        alert('This wallet cannot be exported. Only Privy embedded wallets can be exported.');
      }
    } catch (error) {
      console.error('[WalletManager] Error exporting wallet:', error);
      // Only show error if it's not user cancellation
      if (
        error instanceof Error &&
        !error.message.includes('User rejected') &&
        !error.message.includes('cancelled') &&
        !error.message.includes('User canceled')
      ) {
        alert(`Failed to export wallet: ${error.message}`);
      }
    } finally {
      setExportingWallet(null);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopySuccess(address);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('[WalletManager] Failed to copy address:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainType = (wallet: any): string => {
    // Check chainType first (Privy v3+ format)
    if (wallet.chainType) return wallet.chainType;

    // Fallback to type field
    if (wallet.type) return wallet.type;

    // Detect from address format as last resort
    if (wallet.address) {
      if (wallet.address.startsWith('0x') && wallet.address.length === 42) {
        return 'ethereum';
      }
      if (!wallet.address.startsWith('0x') && wallet.address.length >= 32 && wallet.address.length <= 44) {
        return 'solana';
      }
    }

    return 'unknown';
  };

  const getWalletIcon = (wallet: any) => {
    const chainType = getChainType(wallet);
    switch (chainType) {
      case 'ethereum':
        return (
          <svg width="20" height="20" viewBox="0 0 784.37 1277.39" className="text-current">
            <g fill="currentColor">
              <polygon points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" />
              <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" />
              <polygon points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" />
              <polygon points="392.07,1277.38 392.07,956.52 0,724.89" />
              <polygon points="392.07,882.29 784.13,650.54 392.07,472.33" />
              <polygon points="0,650.54 392.07,882.29 392.07,472.33" />
            </g>
          </svg>
        );
      case 'solana':
        return (
          <svg width="20" height="20" viewBox="0 0 397.7 311.7" className="text-current">
            <g fill="currentColor">
              <path d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" />
              <path d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1L333.1,73.8c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" />
              <path d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" />
            </g>
          </svg>
        );
      default:
        return '💼';
    }
  };

  const getWalletTypeLabel = (wallet: any) => {
    const chainType = getChainType(wallet);
    return chainType.charAt(0).toUpperCase() + chainType.slice(1);
  };

  // Group wallets by chain type
  const ethereumWallets = allUserWallets.filter(w => getChainType(w) === 'ethereum');
  const solanaWallets = allUserWallets.filter(w => getChainType(w) === 'solana');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl p-6 max-w-lg w-full border-2 border-border max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Your Wallets</h2>
              <p className="text-xs text-muted-foreground">Manage your embedded wallets</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.reload()}
              className="h-8 w-8"
              title="Refresh wallets">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" title="Close wallet manager">
              ✕
            </Button>
          </div>
        </div>

        {/* Ethereum Wallets */}
        {ethereumWallets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-black tracking-tighter text-foreground mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 784.37 1277.39" className="text-blue-500">
                <g fill="currentColor">
                  <polygon points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" />
                  <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" />
                  <polygon points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" />
                  <polygon points="392.07,1277.38 392.07,956.52 0,724.89" />
                  <polygon points="392.07,882.29 784.13,650.54 392.07,472.33" />
                  <polygon points="0,650.54 392.07,882.29 392.07,472.33" />
                </g>
              </svg>
              Ethereum Wallets ({ethereumWallets.length})
            </h3>
            <div className="space-y-3">
              {ethereumWallets.map(wallet => (
                <div
                  key={wallet.address}
                  className="bg-card rounded-xl p-4 border border-border/50 hover:border-border transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">{getWalletIcon(wallet)}</div>
                      <div>
                        <span className="text-foreground font-semibold text-sm">
                          {getWalletTypeLabel(wallet)} Wallet
                        </span>
                        {wallet.walletClientType === 'privy' && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md font-medium">
                              Embedded
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Wallet Address</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-foreground">{formatAddress(wallet.address)}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyAddress(wallet.address)}
                            className="h-7 w-7 hover:bg-background">
                            <Copy className="h-3 w-3" />
                          </Button>
                          {copySuccess === wallet.address && (
                            <span className="text-xs text-green-500 font-medium">Copied!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {wallet.walletClientType === 'privy' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => copyAddress(wallet.address)}
                          className="flex-1 h-9 text-xs font-medium">
                          <Copy className="w-3 h-3 mr-2" />
                          Copy Address
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExportWallet(wallet.address)}
                          disabled={exportingWallet === wallet.address}
                          className="flex-1 h-9 text-xs font-medium border-orange-200 text-orange-600 hover:bg-orange-50">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          {exportingWallet === wallet.address ? 'Exporting...' : 'Export Key'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solana Wallets */}
        {solanaWallets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-black tracking-tighter text-foreground mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 397.7 311.7" className="text-purple-500">
                <g fill="currentColor">
                  <path d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" />
                  <path d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1L333.1,73.8c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" />
                  <path d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" />
                </g>
              </svg>
              Solana Wallets ({solanaWallets.length})
            </h3>
            <div className="space-y-3">
              {solanaWallets.map(wallet => (
                <div
                  key={wallet.address}
                  className="bg-card rounded-xl p-4 border border-border/50 hover:border-border transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">{getWalletIcon(wallet)}</div>
                      <div>
                        <span className="text-foreground font-semibold text-sm">
                          {getWalletTypeLabel(wallet)} Wallet
                        </span>
                        {wallet.walletClientType === 'privy' && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="bg-secondary/10 text-secondary text-xs px-2 py-0.5 rounded-md font-medium">
                              Embedded
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Wallet Address</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-foreground">{formatAddress(wallet.address)}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyAddress(wallet.address)}
                            className="h-7 w-7 hover:bg-background">
                            <Copy className="h-3 w-3" />
                          </Button>
                          {copySuccess === wallet.address && (
                            <span className="text-xs text-green-500 font-medium">Copied!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {wallet.walletClientType === 'privy' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => copyAddress(wallet.address)}
                          className="flex-1 h-9 text-xs font-medium">
                          <Copy className="w-3 h-3 mr-2" />
                          Copy Address
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExportWallet(wallet.address)}
                          disabled={exportingWallet === wallet.address}
                          className="flex-1 h-9 text-xs font-medium border-orange-200 text-orange-600 hover:bg-orange-50">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          {exportingWallet === wallet.address ? 'Exporting...' : 'Export Key'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Wallets State */}
        {allUserWallets.length === 0 && (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4 font-bold">No wallets found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Wallets are automatically created when you sign up with Privy
            </p>
          </div>
        )}

        {/* $NoGoon Integration Info */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
          <h3 className="text-sm font-black tracking-tighter text-foreground mb-2 flex items-center">
            💎 $NoGoon Token Ready
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            {solanaWallets.length > 0
              ? `Your ${solanaWallets.length} Solana wallet${solanaWallets.length > 1 ? 's are' : ' is'} ready for $NoGoon token trading and rewards!`
              : 'Create a Solana wallet to receive $NoGoon tokens and trading rewards.'}
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Extension: 100% Free Forever</div>
            <div>• Powered by $NoGoon trading fees</div>
            <div>• Early users get token airdrops</div>
            <div>• Multi-chain support: ETH + SOL</div>
          </div>
        </div>
      </div>
    </div>
  );
}
