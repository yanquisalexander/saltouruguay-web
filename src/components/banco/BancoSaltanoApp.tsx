import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { 
    LucidePiggyBank, 
    LucideHistory, 
    LucideGift,
    LucideCoins,
    LucideTrendingUp,
    LucideTrendingDown,
    LucideCalendar,
    LucideFilter
} from 'lucide-preact';

interface AccountSummary {
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalTransfers: number;
    canClaimDailyBonus: boolean;
    currentStreak: number;
    nextClaimDate?: Date;
}

interface Transaction {
    id: number;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    metadata: any;
    createdAt: Date;
}

type ViewMode = 'summary' | 'transactions' | 'daily-bonus';

export default function BancoSaltanoApp() {
    const [viewMode, setViewMode] = useState<ViewMode>('summary');
    const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimingBonus, setClaimingBonus] = useState(false);
    const [transactionFilter, setTransactionFilter] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadAccountData();
    }, []);

    const loadAccountData = async () => {
        try {
            setLoading(true);
            const result = await actions.banco.getAccountSummary();
            if (result.data) {
                setAccountSummary(result.data as any);
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async (filter?: string) => {
        try {
            const result = await actions.banco.getTransactionHistory({
                type: filter as any,
                limit: 50,
            });
            if (result.data) {
                setTransactions(result.data as any);
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar el historial');
        }
    };

    const handleClaimDailyBonus = async () => {
        try {
            setClaimingBonus(true);
            const result = await actions.banco.claimDailyBonus();
            if (result.data) {
                toast.success(`¡Bonus reclamado! +${result.data.amount} SaltoCoins (Racha: ${result.data.streak} días)`);
                await loadAccountData();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al reclamar el bonus');
        } finally {
            setClaimingBonus(false);
        }
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'deposit':
            case 'game_reward':
                return <LucideTrendingUp size={20} className="text-green-400" />;
            case 'withdrawal':
            case 'purchase':
                return <LucideTrendingDown size={20} className="text-red-400" />;
            case 'daily_bonus':
                return <LucideGift size={20} className="text-yellow-400" />;
            default:
                return <LucideCoins size={20} className="text-blue-400" />;
        }
    };

    const getTransactionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            deposit: 'Depósito',
            withdrawal: 'Retiro',
            game_reward: 'Recompensa de Juego',
            daily_bonus: 'Bonus Diario',
            purchase: 'Compra',
            transfer: 'Transferencia',
            refund: 'Reembolso',
        };
        return labels[type] || type;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="pixel-panel p-8">
                    <div className="pixel-pulse">
                        <LucidePiggyBank size={48} className="text-yellow-400" />
                    </div>
                    <p className="pixel-text mt-4">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-w-6xl mx-auto min-h-screen p-4">
            {/* Header */}
            <header className="pixel-panel mb-6 p-6">
                <div className="flex items-center gap-4 flex-col md:flex-row">
                    <div className="relative">
                        <img
                            src="/images/banco.webp"
                            alt="Banco Saltano"
                            className="h-24 w-auto rounded-lg pixel-coin-icon"
                            style={{ imageRendering: 'pixelated' }}
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="pixel-heading text-2xl md:text-3xl pixel-text-secondary mb-2">
                            Banco Saltano
                        </h1>
                        <p className="pixel-text text-white/70">
                            Tu economía virtual en SaltoUruguay
                        </p>
                    </div>
                    <div className="pixel-coin-display">
                        <LucidePiggyBank size={32} className="text-yellow-400" />
                        <div className="flex flex-col">
                            <span className="text-xs text-white/60 uppercase">Saldo</span>
                            <span className="text-xl font-bold pixel-text-secondary">
                                {accountSummary?.balance.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                <button
                    onClick={() => setViewMode('summary')}
                    className={`pixel-btn ${viewMode === 'summary' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
                >
                    <LucideCoins size={20} />
                    <span>Resumen</span>
                </button>
                <button
                    onClick={() => {
                        setViewMode('transactions');
                        loadTransactions(transactionFilter);
                    }}
                    className={`pixel-btn ${viewMode === 'transactions' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
                >
                    <LucideHistory size={20} />
                    <span>Historial</span>
                </button>
                <button
                    onClick={() => setViewMode('daily-bonus')}
                    className={`pixel-btn ${viewMode === 'daily-bonus' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
                >
                    <LucideGift size={20} />
                    <span>Bonus Diario</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                {viewMode === 'summary' && accountSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="pixel-card">
                            <div className="flex items-center gap-3 mb-2">
                                <LucideTrendingUp size={24} className="text-green-400" />
                                <h3 className="pixel-text font-bold">Depósitos Totales</h3>
                            </div>
                            <p className="text-2xl font-bold pixel-text-success">
                                {accountSummary.totalDeposits.toLocaleString()}
                            </p>
                        </div>

                        <div className="pixel-card">
                            <div className="flex items-center gap-3 mb-2">
                                <LucideTrendingDown size={24} className="text-red-400" />
                                <h3 className="pixel-text font-bold">Retiros Totales</h3>
                            </div>
                            <p className="text-2xl font-bold text-red-400">
                                {accountSummary.totalWithdrawals.toLocaleString()}
                            </p>
                        </div>

                        <div className="pixel-card">
                            <div className="flex items-center gap-3 mb-2">
                                <LucideCalendar size={24} className="text-yellow-400" />
                                <h3 className="pixel-text font-bold">Racha Actual</h3>
                            </div>
                            <p className="text-2xl font-bold pixel-text-secondary">
                                {accountSummary.currentStreak} días
                            </p>
                        </div>

                        {accountSummary.canClaimDailyBonus && (
                            <div className="pixel-card md:col-span-2 lg:col-span-3 pixel-glow">
                                <div className="flex items-center justify-between flex-col md:flex-row gap-4">
                                    <div className="flex items-center gap-3">
                                        <LucideGift size={32} className="text-yellow-400" />
                                        <div>
                                            <h3 className="pixel-heading text-lg pixel-text-secondary">
                                                ¡Bonus Diario Disponible!
                                            </h3>
                                            <p className="pixel-text text-white/70 text-sm">
                                                Reclama tu recompensa diaria ahora
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClaimDailyBonus}
                                        disabled={claimingBonus}
                                        className="pixel-btn-success"
                                    >
                                        {claimingBonus ? 'Reclamando...' : 'Reclamar Bonus'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'transactions' && (
                    <div className="pixel-panel">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="pixel-heading text-xl">Historial de Transacciones</h2>
                            <div className="flex gap-2">
                                <select
                                    value={transactionFilter || ''}
                                    onChange={(e) => {
                                        const value = (e.target as HTMLSelectElement).value;
                                        setTransactionFilter(value || undefined);
                                        loadTransactions(value || undefined);
                                    }}
                                    className="pixel-input text-sm"
                                >
                                    <option value="">Todas</option>
                                    <option value="game_reward">Recompensas</option>
                                    <option value="daily_bonus">Bonus Diario</option>
                                    <option value="deposit">Depósitos</option>
                                    <option value="withdrawal">Retiros</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {transactions.length === 0 ? (
                                <div className="text-center py-8 pixel-text text-white/50">
                                    No hay transacciones para mostrar
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="pixel-card flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {getTransactionIcon(tx.type)}
                                            <div>
                                                <p className="font-bold pixel-text">
                                                    {tx.description || getTransactionTypeLabel(tx.type)}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    {new Date(tx.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${
                                                ['deposit', 'game_reward', 'daily_bonus', 'refund'].includes(tx.type)
                                                    ? 'text-green-400'
                                                    : 'text-red-400'
                                            }`}>
                                                {['deposit', 'game_reward', 'daily_bonus', 'refund'].includes(tx.type) ? '+' : '-'}
                                                {tx.amount.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-white/50">
                                                Saldo: {tx.balanceAfter.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'daily-bonus' && accountSummary && (
                    <div className="pixel-panel">
                        <h2 className="pixel-heading text-xl mb-4 pixel-text-secondary">Bonus Diario</h2>
                        
                        <div className="space-y-4">
                            <div className="pixel-card">
                                <div className="flex items-center gap-3 mb-4">
                                    <LucideGift size={32} className="text-yellow-400" />
                                    <div>
                                        <h3 className="pixel-text font-bold text-lg">Racha Actual</h3>
                                        <p className="text-3xl font-bold pixel-text-secondary">
                                            {accountSummary.currentStreak} días
                                        </p>
                                    </div>
                                </div>
                                <div className="pixel-divider my-4" />
                                <p className="pixel-text text-white/70">
                                    Reclama tu bonus diario cada día para mantener tu racha. 
                                    Cuanto mayor sea tu racha, mayor será la recompensa.
                                </p>
                            </div>

                            {accountSummary.canClaimDailyBonus ? (
                                <div className="pixel-card pixel-glow">
                                    <h3 className="pixel-heading text-lg mb-3 pixel-text-secondary">
                                        ¡Bonus Disponible!
                                    </h3>
                                    <p className="pixel-text mb-4 text-white/80">
                                        Tu recompensa: <span className="font-bold pixel-text-secondary">
                                            {100 + (accountSummary.currentStreak * 10)} SaltoCoins
                                        </span>
                                    </p>
                                    <button
                                        onClick={handleClaimDailyBonus}
                                        disabled={claimingBonus}
                                        className="pixel-btn-success w-full"
                                    >
                                        {claimingBonus ? 'Reclamando...' : 'Reclamar Bonus'}
                                    </button>
                                </div>
                            ) : (
                                <div className="pixel-card">
                                    <h3 className="pixel-heading text-lg mb-3">Ya Reclamado Hoy</h3>
                                    <p className="pixel-text text-white/70">
                                        Vuelve mañana para reclamar tu siguiente bonus.
                                    </p>
                                    {accountSummary.nextClaimDate && (
                                        <p className="pixel-text text-sm text-white/50 mt-2">
                                            Próximo bonus: {new Date(accountSummary.nextClaimDate).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="pixel-panel">
                                <h3 className="pixel-heading text-sm mb-3">Cómo Funciona</h3>
                                <ul className="space-y-2 pixel-text text-sm text-white/70">
                                    <li>• Bonus base: 100 SaltoCoins</li>
                                    <li>• +10 SaltoCoins por cada día de racha</li>
                                    <li>• Reclama cada día para no perder tu racha</li>
                                    <li>• Sin límite de racha máxima</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
