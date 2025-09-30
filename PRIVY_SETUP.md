# Privy Authentication Setup

This extension uses [Privy](https://www.privy.io/) for user authentication and wallet management.

## Setup Instructions

### 1. Create a Privy Account

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Sign up for a free account
3. Create a new app

### 2. Get Your App ID

1. In your Privy dashboard, navigate to your app settings
2. Copy your **App ID** (it should look like `cmg74h4sm0035le0c1k99b1gz`)
   - ⚠️ **Important**: Use the **App ID**, NOT the App Secret
   - App ID: Used in frontend/client-side code (safe to expose)
   - App Secret: Used in backend/server-side code only (keep private!)
3. Update the App ID in `pages/popup/src/index.tsx`:

```typescript
appId={import.meta.env.VITE_PRIVY_APP_ID || 'cmg74h4sm0035le0c1k99b1gz'}
```

Or create a `.env` file in the root directory:

```bash
cp .env.example .env
```

4. Add your Privy App ID to the `.env` file:

```env
VITE_PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
```

### 3. Configure Privy Settings

In your Privy dashboard, configure the following:

#### Embedded Wallets
- Enable **Embedded Wallets**
- Set to create wallets for "users without wallets"

#### Login Methods
Enable your preferred login methods:
- ✅ Email
- ✅ Google
- ✅ Discord
- ✅ Wallet (MetaMask, WalletConnect, etc.)

#### Appearance
- Theme: Dark (recommended)
- Accent Color: #676FFF (matches extension theme)

### 4. Payment Integration (Future)

For the premium subscription paywall, you'll need to integrate a payment processor:

**Recommended Options:**
- **Stripe** - Traditional payment processing
- **Coinbase Commerce** - Crypto payments
- **Privy's built-in wallet** - Use embedded wallets for crypto payments

## Features Enabled by Privy

### Free Tier
- ✅ 10 daily content blocks
- ✅ Email/Social login
- ✅ Basic statistics

### Premium Tier (After Payment)
- ✅ Unlimited daily blocks
- ✅ Priority support
- ✅ Advanced filtering
- ✅ Custom blocklists

## Development

The extension automatically syncs authentication state between:
- Privy authentication session
- Chrome extension local storage
- Content blocking enforcement

## Storage Schema

```typescript
{
  isAuthenticated: boolean;
  userId: string | null;
  walletAddress: string | null;
  isPremium: boolean;
  freeBlocksRemaining: number; // Resets daily
  lastFreeBlocksResetDate: string;
}
```

## Testing

1. Install the extension in developer mode
2. Open the popup
3. Click "Sign In with Privy"
4. Test with a free account (10 blocks/day)
5. Test premium upgrade flow

## Production Checklist

- [ ] Set up Privy production app
- [ ] Configure allowed domains in Privy dashboard
- [ ] Integrate payment processor
- [ ] Set up webhook endpoints for payment verification
- [ ] Test authentication flow
- [ ] Test paywall enforcement
- [ ] Monitor usage analytics

## Support

For Privy-related issues:
- [Privy Documentation](https://docs.privy.io/)
- [Privy Discord](https://discord.gg/privy)

For extension issues:
- Check browser console for errors
- Verify environment variables are set
- Check manifest CSP settings
