# Community Redesign & Banco Saltano Implementation

## Overview

This document describes the comprehensive redesign of the Community section and the complete implementation of the Banco Saltano virtual economy system for SaltoUruguayServer.

## 🎨 Design Philosophy

The redesign follows a **pixel art aesthetic** inspired by modern retro games like:
- Tug of War (Guerra de Streamers)
- Fishing (Guerra de Streamers)

**Key Principles:**
- Subtle pixel art styling without overwhelming the UI
- Consistent visual language across all community features
- Smooth animations and transitions
- Mobile-first responsive design
- Accessibility and usability

## 📦 What's Included

### 1. Pixel Art Design System (`src/assets/styles/pixel-art.css`)

A complete CSS framework providing:

**Components:**
- `pixel-container` - Base container with pixel borders
- `pixel-panel` - Content panel with decorative elements
- `pixel-btn` - Base button styling
- `pixel-btn-primary/secondary/success/danger` - Themed buttons
- `pixel-card` - Card component
- `pixel-card-hover` - Interactive card with hover effects
- `pixel-badge` - Badge/label component
- `pixel-progress` - Animated progress bar
- `pixel-coin-display` - Coin counter with animation
- `pixel-modal` - Modal/dialog styling
- `pixel-input` - Form input fields

**Utilities:**
- `pixel-heading` - Heading typography
- `pixel-text` - Body text styling
- `pixel-text-primary/secondary/success` - Colored text
- `pixel-divider` - Section divider

**Animations:**
- `pixel-pulse` - Pulsing animation
- `pixel-shake` - Shake effect for errors
- `pixel-glow` - Glowing effect for highlights

**Color Palette:**
- Primary: `#9146ff` (Electric Violet)
- Secondary: `#facc15` (Yellow)
- Accent: `#10b981` (Green)
- Danger: `#ef4444` (Red)

### 2. Banco Saltano Database Schema

**Tables:**

#### `banco_saltano_accounts`
User bank accounts with automatic creation:
- `id` - Primary key
- `userId` - User reference (unique)
- `balance` - Current balance (synced with users.coins)
- `totalDeposits` - Lifetime deposits
- `totalWithdrawals` - Lifetime withdrawals
- `totalTransfers` - Lifetime transfers
- `lastDailyBonus` - Last daily bonus claim timestamp
- `createdAt`, `updatedAt` - Timestamps

#### `banco_saltano_transactions`
Complete transaction history:
- `id` - Primary key
- `userId` - User reference
- `type` - Transaction type enum
- `status` - Transaction status enum
- `amount` - Transaction amount
- `balanceBefore` - Balance before transaction
- `balanceAfter` - Balance after transaction
- `description` - Human-readable description
- `metadata` - JSON metadata (game info, etc.)
- `fromUserId`, `toUserId` - For transfers
- `createdAt` - Timestamp

#### `banco_saltano_daily_rewards`
Daily bonus tracking:
- `id` - Primary key
- `userId` - User reference
- `rewardDate` - Reward date
- `amount` - Reward amount
- `streak` - Consecutive days streak
- `claimed` - Claimed flag
- `createdAt` - Timestamp

**Enums:**
- `transaction_type`: deposit, withdrawal, transfer, game_reward, daily_bonus, purchase, refund
- `transaction_status`: pending, completed, failed, cancelled

### 3. Backend Services

#### BancoSaltanoService (`src/services/banco-saltano.ts`)

Complete service layer for bank operations:

**Methods:**
- `getOrCreateAccount(userId)` - Get or auto-create user account
- `createTransaction(params)` - Create transaction and update balance
- `addGameReward(userId, amount, gameName, metadata)` - Add game reward
- `getTransactionHistory(userId, filters)` - Get transaction history with filtering
- `claimDailyBonus(userId)` - Claim daily bonus with streak tracking
- `canClaimDailyBonus(userId)` - Check if bonus is available
- `getAccountSummary(userId)` - Get complete account overview

**Features:**
- Atomic transactions with proper rollback
- Automatic balance synchronization between banco and users table
- Server-side validation
- Security checks to prevent exploits
- Detailed transaction logging

### 4. API Actions (`src/actions/banco.ts`)

Astro actions for frontend-backend communication:

**Actions:**
- `getAccountSummary()` - Get user's account summary
- `getTransactionHistory(filters)` - Get filtered transaction history
- `claimDailyBonus()` - Claim daily bonus
- `checkDailyBonus()` - Check if bonus is available

**Security:**
- Session-based authentication
- User context from locals
- Error handling and validation

### 5. Frontend Components

#### BancoSaltanoApp (`src/components/banco/BancoSaltanoApp.tsx`)

Complete bank dashboard with three views:

**Summary View:**
- Current balance display
- Total deposits/withdrawals/transfers
- Current streak information
- Daily bonus availability indicator

**Transaction History View:**
- Paginated transaction list
- Filter by type (deposits, withdrawals, rewards, etc.)
- Transaction details with icons
- Balance tracking per transaction

**Daily Bonus View:**
- Current streak display
- Bonus amount calculation (100 + streak * 10)
- Claim button
- Next claim date information

**Features:**
- Real-time balance updates
- Toast notifications for actions
- Loading states
- Error handling
- Responsive design

#### GameHUD (`src/components/games/GameHUD.tsx`)

Unified HUD component for all games:

**Components:**
- `GameHUD` - Display score, coins, energy, and custom info
- `GameFeedback` - Toast-style feedback messages
- `GameReward` - Reward modal with coin animation

**Features:**
- Configurable display elements
- Pixel art styling
- Animations
- Responsive layout

### 6. Community Layout Updates

#### CommunityLayout (`src/layouts/CommunityLayout.astro`)
- Integrated pixel art styles
- Updated header with pixel aesthetics
- Improved responsive layout

#### CommunitySidebar (`src/components/CommunitySidebar.tsx`)
- New navigation icons
- Direct link to Banco Saltano
- Pixel-styled buttons
- Hover effects

#### Community Index (`src/pages/comunidad/index.astro`)
- Redesigned game cards with pixel styling
- Updated hover effects
- Removed "coming soon" from Banco Saltano
- Consistent iconography

### 7. Game Integration

#### Ruleta Loca Updates
- Integrated GameHUD component
- Updated with pixel art styling
- Added reward modal
- Connected to BancoSaltanoService
- Automatic transaction creation on wins

**Integration Pattern:**
```typescript
// On game completion
await BancoSaltanoService.addGameReward(
    userId,
    coinsEarned,
    "Ruleta Loca",
    {
        sessionId: session.id,
        score: session.currentScore,
        phraseId: session.phraseId,
    }
);
```

## 🚀 Deployment Guide

### Prerequisites
1. PostgreSQL database
2. Existing users table with `coins` column
3. Node.js and npm installed

### Steps

1. **Run Database Migration:**
```bash
npm run db:migrate
```

This will create the three new banco tables and enums.

2. **Build the Project:**
```bash
npm run build
```

3. **Deploy:**
```bash
vercel --prod
```

### Post-Deployment

1. **Verify Tables:**
   - Check that banco tables are created
   - Verify foreign keys are in place

2. **Test Basic Flow:**
   - Login to the community
   - Navigate to Banco Saltano
   - Check account creation
   - Try claiming daily bonus
   - Play a game and verify transaction

3. **Monitor:**
   - Check transaction logs
   - Verify balance synchronization
   - Monitor error rates

## 📊 Database Indexing

The schema includes automatic indexes on:
- Foreign keys (userId references)
- Unique constraints (account per user, daily reward per user/date)

For optimal performance, consider adding:
```sql
CREATE INDEX idx_transactions_created_at ON banco_saltano_transactions(created_at DESC);
CREATE INDEX idx_transactions_user_type ON banco_saltano_transactions(user_id, type);
```

## 🔒 Security Considerations

**Implemented:**
1. ✅ Server-side validation on all operations
2. ✅ Session-based authentication
3. ✅ Transaction atomicity (prevents double-spending)
4. ✅ Balance verification before withdrawals
5. ✅ SQL injection prevention via Drizzle ORM
6. ✅ XSS prevention via React/Preact
7. ✅ No sensitive data exposure in API responses

**Future Enhancements:**
- Rate limiting for bonus claims
- Transaction amount limits
- Admin monitoring dashboard
- Audit logging system

## 🎮 Game Integration Guide

To integrate a new game with Banco Saltano:

1. **Import the service:**
```typescript
import { BancoSaltanoService } from "@/services/banco-saltano";
```

2. **On game completion:**
```typescript
const coinsEarned = calculateReward();
await BancoSaltanoService.addGameReward(
    userId,
    coinsEarned,
    "Your Game Name",
    {
        // Game-specific metadata
        sessionId: gameSessionId,
        score: finalScore,
        difficulty: gameDifficulty,
    }
);
```

3. **Use GameHUD component:**
```typescript
import { GameHUD, GameReward } from "@/components/games/GameHUD";

// In your component
<GameHUD
    score={score}
    showCoins={true}
    additionalInfo={{
        label: "Level",
        value: currentLevel,
    }}
/>

<GameReward
    coins={rewardAmount}
    visible={showReward}
    onComplete={() => setShowReward(false)}
/>
```

## 📱 Mobile Responsiveness

All components are mobile-responsive:
- Fluid layouts with Tailwind breakpoints
- Touch-friendly button sizes (min 44x44px)
- Readable font sizes
- Appropriate spacing
- Tested on common screen sizes

## 🎨 Style Customization

To customize the pixel art theme:

1. **Update CSS variables in `pixel-art.css`:**
```css
:root {
  --pixel-primary: #9146ff;
  --pixel-secondary: #facc15;
  --pixel-border-width: 2px;
  --pixel-corner-size: 4px;
}
```

2. **Create custom button variants:**
```css
.pixel-btn-custom {
  @apply pixel-btn;
  background: linear-gradient(180deg, #color1 0%, #color2 100%);
  border-color: #color3;
}
```

## 🐛 Troubleshooting

### Balance Sync Issues
If balance gets out of sync:
```sql
UPDATE banco_saltano_accounts 
SET balance = (SELECT coins FROM users WHERE id = banco_saltano_accounts.user_id)
WHERE user_id = ?;
```

### Transaction History Not Loading
- Check browser console for errors
- Verify API action permissions
- Check database connection
- Verify session is valid

### Daily Bonus Not Working
- Check system date/time
- Verify timezone configuration
- Check for existing claims in database
- Review transaction logs

## 📈 Future Enhancements

**Planned Features:**
1. Transfer system between users
2. Loan system (borrow with interest)
3. Savings accounts with interest
4. Premium purchases
5. Jackpot system
6. Leaderboards
7. Achievement rewards
8. Monthly reports
9. Export transaction history
10. Multi-currency support

**Technical Improvements:**
1. Caching layer for account summaries
2. Real-time balance updates via WebSocket
3. Advanced analytics dashboard
4. Automated reconciliation system
5. Backup/restore functionality

## 📝 API Documentation

### BancoSaltanoService API

#### `getOrCreateAccount(userId: number)`
Gets existing account or creates new one.
- **Returns:** Account object
- **Throws:** Error if user doesn't exist

#### `createTransaction(params: TransactionParams)`
Creates a transaction and updates balance.
- **Params:**
  - `userId` - User ID
  - `type` - Transaction type
  - `amount` - Amount
  - `description` - Optional description
  - `metadata` - Optional metadata object
- **Returns:** Transaction object
- **Throws:** Error if insufficient balance

#### `addGameReward(userId, amount, gameName, metadata)`
Shorthand for adding game rewards.
- **Returns:** Transaction object

#### `getTransactionHistory(userId, filters)`
Gets transaction history with optional filtering.
- **Filters:**
  - `type` - Filter by transaction type
  - `limit` - Results per page (default: 50)
  - `offset` - Pagination offset
- **Returns:** Array of transactions

#### `claimDailyBonus(userId)`
Claims daily bonus for user.
- **Returns:** Object with transaction, streak, and amount
- **Throws:** Error if already claimed today

#### `canClaimDailyBonus(userId)`
Checks if user can claim bonus.
- **Returns:** Object with canClaim, streak, nextClaimDate

#### `getAccountSummary(userId)`
Gets complete account overview.
- **Returns:** Account summary object

## 🤝 Contributing

When adding new features:

1. Follow the existing pixel art design patterns
2. Use the provided CSS classes
3. Maintain consistent spacing and sizing
4. Add proper error handling
5. Include TypeScript types
6. Test on mobile devices
7. Update this documentation

## 📞 Support

For issues or questions:
- Check this documentation first
- Review the code comments
- Check existing issues on GitHub
- Create a new issue with detailed information

## 🎉 Acknowledgments

This implementation was inspired by:
- Classic "Wheel of Fortune" format
- Modern retro game aesthetics
- Existing SaltoUruguayServer game architecture
- Community feedback and requests

---

**Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** ✅ Production Ready
