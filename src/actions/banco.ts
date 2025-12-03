import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { BancoSaltanoService } from '@/services/banco-saltano';
import { getSession } from "auth-astro/server";

export const banco = {
    /**
     * Get account summary
     */
    getAccountSummary: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para acceder al Banco Saltano',
                });
            }

            try {
                const summary = await BancoSaltanoService.getAccountSummary(session.user.id);
                return summary;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al obtener información de la cuenta',
                });
            }
        },
    }),

    /**
     * Get transaction history
     */
    getTransactionHistory: defineAction({
        input: z.object({
            type: z.enum(['deposit', 'withdrawal', 'transfer', 'game_reward', 'daily_bonus', 'purchase', 'refund']).optional(),
            limit: z.number().min(1).max(100).default(50).optional(),
            offset: z.number().min(0).default(0).optional(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para acceder al historial',
                });
            }

            try {
                const transactions = await BancoSaltanoService.getTransactionHistory(
                    session.user.id,
                    input
                );
                return transactions;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al obtener historial de transacciones',
                });
            }
        },
    }),

    /**
     * Claim daily bonus
     */
    claimDailyBonus: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para reclamar el bonus',
                });
            }

            try {
                const result = await BancoSaltanoService.claimDailyBonus(session.user.id);
                return {
                    success: true,
                    amount: result.amount,
                    streak: result.streak,
                    transaction: result.transaction,
                };
            } catch (error: any) {
                if (error.message === 'Daily bonus already claimed today') {
                    throw new ActionError({
                        code: 'BAD_REQUEST',
                        message: 'Ya reclamaste el bonus diario hoy',
                    });
                }
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al reclamar el bonus diario',
                });
            }
        },
    }),

    /**
     * Check if can claim daily bonus
     */
    checkDailyBonus: defineAction({
        handler: async (_, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión',
                });
            }

            try {
                const result = await BancoSaltanoService.canClaimDailyBonus(session.user.id);
                return result;
            } catch (error: any) {
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al verificar bonus diario',
                });
            }
        },
    }),
};
