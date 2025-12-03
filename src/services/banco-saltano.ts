import { client as db } from '@/db/client';
import {
    BancoSaltanoAccountsTable,
    BancoSaltanoTransactionsTable,
    BancoSaltanoDailyRewardsTable,
    UsersTable
} from '@/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'game_reward' | 'daily_bonus' | 'purchase' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

interface TransactionMetadata {
    gameId?: string;
    gameName?: string;
    source?: string;
    reason?: string;
    [key: string]: any;
}

export class BancoSaltanoService {
    /**
     * Get or create user bank account
     */
    static async getOrCreateAccount(userId: number) {
        try {
            let account = await db.query.BancoSaltanoAccountsTable.findFirst({
                where: eq(BancoSaltanoAccountsTable.userId, userId),
            });

            if (!account) {
                // Create account and sync with user's current coins
                const user = await db.query.UsersTable.findFirst({
                    where: eq(UsersTable.id, userId),
                    columns: { coins: true },
                });

                const [newAccount] = await db.insert(BancoSaltanoAccountsTable).values({
                    userId,
                    balance: user?.coins || 0,
                }).returning();

                account = newAccount;
            }

            return account;
        } catch (error) {
            console.error('Error getting/creating account:', error);
            throw new Error('Failed to access bank account');
        }
    }

    /**
     * Create a transaction and update balance
     */
    static async createTransaction(params: {
        userId: number;
        type: TransactionType;
        amount: number;
        description?: string;
        metadata?: TransactionMetadata;
        fromUserId?: number;
        toUserId?: number;
    }) {
        const { userId, type, amount, description, metadata, fromUserId, toUserId } = params;

        try {
            return await db.transaction(async (tx) => {
                // Get current account
                const account = await tx.query.BancoSaltanoAccountsTable.findFirst({
                    where: eq(BancoSaltanoAccountsTable.userId, userId),
                });

                if (!account) {
                    throw new Error('Bank account not found');
                }

                const balanceBefore = account.balance;
                let balanceAfter = balanceBefore;

                // Calculate new balance based on transaction type
                switch (type) {
                    case 'deposit':
                    case 'game_reward':
                    case 'daily_bonus':
                    case 'refund':
                        balanceAfter = balanceBefore + amount;
                        break;
                    case 'withdrawal':
                    case 'purchase':
                        if (balanceBefore < amount) {
                            throw new Error('Insufficient balance');
                        }
                        balanceAfter = balanceBefore - amount;
                        break;
                    case 'transfer':
                        // Handle transfer logic separately
                        if (fromUserId === userId) {
                            if (balanceBefore < amount) {
                                throw new Error('Insufficient balance');
                            }
                            balanceAfter = balanceBefore - amount;
                        } else if (toUserId === userId) {
                            balanceAfter = balanceBefore + amount;
                        }
                        break;
                }

                // Create transaction record
                const [transaction] = await tx.insert(BancoSaltanoTransactionsTable).values({
                    userId,
                    type,
                    status: 'completed',
                    amount,
                    balanceBefore,
                    balanceAfter,
                    description,
                    metadata: metadata || {},
                    fromUserId,
                    toUserId,
                }).returning();

                // Update account balance
                await tx.update(BancoSaltanoAccountsTable)
                    .set({
                        balance: balanceAfter,
                        totalDeposits: type === 'deposit' || type === 'game_reward' || type === 'daily_bonus' || type === 'refund'
                            ? sql`${BancoSaltanoAccountsTable.totalDeposits} + ${amount}`
                            : BancoSaltanoAccountsTable.totalDeposits,
                        totalWithdrawals: type === 'withdrawal' || type === 'purchase'
                            ? sql`${BancoSaltanoAccountsTable.totalWithdrawals} + ${amount}`
                            : BancoSaltanoAccountsTable.totalWithdrawals,
                        totalTransfers: type === 'transfer'
                            ? sql`${BancoSaltanoAccountsTable.totalTransfers} + ${amount}`
                            : BancoSaltanoAccountsTable.totalTransfers,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(BancoSaltanoAccountsTable.userId, userId));

                // Sync with users table coins
                await tx.update(UsersTable)
                    .set({
                        coins: balanceAfter,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(UsersTable.id, userId));

                return transaction;
            });
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    /**
     * Process game reward
     */
    static async addGameReward(userId: number, amount: number, gameName: string, metadata?: TransactionMetadata) {
        return await this.createTransaction({
            userId,
            type: 'game_reward',
            amount,
            description: `Recompensa de ${gameName}`,
            metadata: {
                ...metadata,
                gameName,
                source: 'game',
            },
        });
    }

    /**
     * Get transaction history with optional filters
     */
    static async getTransactionHistory(
        userId: number,
        filters?: {
            type?: TransactionType;
            limit?: number;
            offset?: number;
        }
    ) {
        try {
            const { type, limit = 50, offset = 0 } = filters || {};

            const whereConditions = type
                ? and(
                    eq(BancoSaltanoTransactionsTable.userId, userId),
                    eq(BancoSaltanoTransactionsTable.type, type)
                )
                : eq(BancoSaltanoTransactionsTable.userId, userId);

            const transactions = await db
                .select()
                .from(BancoSaltanoTransactionsTable)
                .where(whereConditions)
                .orderBy(desc(BancoSaltanoTransactionsTable.createdAt))
                .limit(limit)
                .offset(offset);

            return transactions;
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw new Error('Failed to retrieve transaction history');
        }
    }

    /**
     * Claim daily bonus
     */
    static async claimDailyBonus(userId: number) {
        try {
            return await db.transaction(async (tx) => {
                const account = await tx.query.BancoSaltanoAccountsTable.findFirst({
                    where: eq(BancoSaltanoAccountsTable.userId, userId),
                });

                if (!account) {
                    throw new Error('Bank account not found');
                }

                // Check if already claimed today
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const todayReward = await tx.query.BancoSaltanoDailyRewardsTable.findFirst({
                    where: and(
                        eq(BancoSaltanoDailyRewardsTable.userId, userId),
                        gte(BancoSaltanoDailyRewardsTable.rewardDate, today)
                    ),
                });

                if (todayReward) {
                    throw new Error('Daily bonus already claimed today');
                }

                // Calculate streak
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const yesterdayReward = await tx.query.BancoSaltanoDailyRewardsTable.findFirst({
                    where: and(
                        eq(BancoSaltanoDailyRewardsTable.userId, userId),
                        gte(BancoSaltanoDailyRewardsTable.rewardDate, yesterday)
                    ),
                    orderBy: desc(BancoSaltanoDailyRewardsTable.rewardDate),
                });

                const streak = yesterdayReward ? yesterdayReward.streak + 1 : 1;
                const baseReward = 100;
                const bonusAmount = baseReward + (streak - 1) * 10; // +10 per day streak

                // Create daily reward record
                await tx.insert(BancoSaltanoDailyRewardsTable).values({
                    userId,
                    amount: bonusAmount,
                    streak,
                });

                // Create transaction inline (within same transaction context)
                const balanceBefore = account.balance;
                const balanceAfter = balanceBefore + bonusAmount;

                const [transaction] = await tx.insert(BancoSaltanoTransactionsTable).values({
                    userId,
                    type: 'daily_bonus',
                    status: 'completed',
                    amount: bonusAmount,
                    balanceBefore,
                    balanceAfter,
                    description: `Bonus diario (Racha: ${streak} días)`,
                    metadata: { streak, baseReward },
                }).returning();

                // Update account balance and stats
                await tx.update(BancoSaltanoAccountsTable)
                    .set({
                        balance: balanceAfter,
                        totalDeposits: sql`${BancoSaltanoAccountsTable.totalDeposits} + ${bonusAmount}`,
                        lastDailyBonus: sql`current_timestamp`,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(BancoSaltanoAccountsTable.userId, userId));

                // Sync with users table coins
                await tx.update(UsersTable)
                    .set({
                        coins: balanceAfter,
                        updatedAt: sql`current_timestamp`,
                    })
                    .where(eq(UsersTable.id, userId));

                return {
                    transaction,
                    streak,
                    amount: bonusAmount,
                };
            });
        } catch (error) {
            console.error('Error claiming daily bonus:', error);
            throw error;
        }
    }

    /**
     * Check if daily bonus is available
     */
    static async canClaimDailyBonus(userId: number): Promise<{ canClaim: boolean; streak: number; nextClaimDate?: Date }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayReward = await db.query.BancoSaltanoDailyRewardsTable.findFirst({
                where: and(
                    eq(BancoSaltanoDailyRewardsTable.userId, userId),
                    gte(BancoSaltanoDailyRewardsTable.rewardDate, today)
                ),
            });

            if (todayReward) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return {
                    canClaim: false,
                    streak: todayReward.streak,
                    nextClaimDate: tomorrow,
                };
            }

            // Get current streak
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const lastReward = await db.query.BancoSaltanoDailyRewardsTable.findFirst({
                where: eq(BancoSaltanoDailyRewardsTable.userId, userId),
                orderBy: desc(BancoSaltanoDailyRewardsTable.rewardDate),
            });

            const streak = lastReward && lastReward.rewardDate >= yesterday ? lastReward.streak : 0;

            return {
                canClaim: true,
                streak,
            };
        } catch (error) {
            console.error('Error checking daily bonus availability:', error);
            throw new Error('Failed to check daily bonus');
        }
    }

    /**
     * Get account summary
     */
    static async getAccountSummary(userId: number) {
        try {
            const account = await this.getOrCreateAccount(userId);
            const bonusInfo = await this.canClaimDailyBonus(userId);

            return {
                balance: account.balance,
                totalDeposits: account.totalDeposits,
                totalWithdrawals: account.totalWithdrawals,
                totalTransfers: account.totalTransfers,
                lastDailyBonus: account.lastDailyBonus,
                canClaimDailyBonus: bonusInfo.canClaim,
                currentStreak: bonusInfo.streak,
                nextClaimDate: bonusInfo.nextClaimDate,
                createdAt: account.createdAt,
            };
        } catch (error) {
            console.error('Error getting account summary:', error);
            throw new Error('Failed to retrieve account summary');
        }
    }
}
