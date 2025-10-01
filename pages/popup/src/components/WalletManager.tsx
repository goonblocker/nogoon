import React, { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface WalletManagerProps {
  onClose: () => void;
}

export default function WalletManager({ onClose }: WalletManagerProps) {
  const { exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const [exportingWallet, setExportingWallet] = useState<string | null>(null);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(null);

  const handleExportWallet = async (walletAddress: string) => {
    setExportingWallet(walletAddress);
    try {
      await exportWallet({ address: walletAddress });
    } catch (error) {
      console.error('Error exporting wallet:', error);
    } finally {
      setExportingWallet(null);
      setShowExportWarning(false);
      setSelectedWalletAddress(null);
    }
  };

  const startExport = (walletAddress: string) => {
    setSelectedWalletAddress(walletAddress);
    setShowExportWarning(true);
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (chainType: string) => {
    switch (chainType) {
      case 'ethereum':
        return '⟠';
      case 'solana':
        return '◎';
      default:
        return '💼';
    }
  };

  if (showExportWarning && selectedWalletAddress) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">⚠️ Export Wallet</h3>

          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-4">
            <h4 className="text-yellow-200 font-medium mb-2">Security Warning</h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• Never share your private key with anyone</li>
              <li>• Store it securely offline</li>
              <li>• Anyone with your private key can access your funds</li>
              <li>• Privy cannot recover lost private keys</li>
            </ul>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            You are about to export the private key for wallet:
            <br />
            <span className="font-mono text-white">{formatAddress(selectedWalletAddress)}</span>
          </p>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowExportWarning(false);
                setSelectedWalletAddress(null);
              }}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => handleExportWallet(selectedWalletAddress)}
              disabled={exportingWallet === selectedWalletAddress}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {exportingWallet === selectedWalletAddress ? 'Exporting...' : 'Export Private Key'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Your Wallets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {wallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No wallets found</p>
              <p className="text-sm text-gray-500">Wallets are automatically created when you log in</p>
            </div>
          ) : (
            wallets.map(wallet => (
              <div key={wallet.address} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getWalletIcon(wallet.chainType)}</span>
                    <span className="text-white font-medium capitalize">{wallet.chainType}</span>
                    {wallet.walletClientType === 'privy' && (
                      <span className="bg-purple-600 text-xs px-2 py-1 rounded-full text-white">Embedded</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Address</p>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-white">{formatAddress(wallet.address)}</span>
                      <button
                        onClick={() => copyAddress(wallet.address)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Copy
                      </button>
                    </div>
                  </div>

                  {wallet.walletClientType === 'privy' && (
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => copyAddress(wallet.address)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                        Copy Address
                      </button>
                      <button
                        onClick={() => startExport(wallet.address)}
                        disabled={exportingWallet === wallet.address}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                        {exportingWallet === wallet.address ? 'Exporting...' : 'Export Private Key'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h3 className="text-sm font-medium text-white mb-2">SPL Token Payments</h3>
          <p className="text-xs text-gray-400 mb-2">
            Use your Solana wallet to pay for premium subscriptions with SPL tokens and get 50% off!
          </p>
          <div className="text-xs text-gray-500">
            • Premium: $4.99/month (or $2.49 with tokens) • Unlimited content blocking • Priority support
          </div>
        </div>
      </div>
    </div>
  );
}
