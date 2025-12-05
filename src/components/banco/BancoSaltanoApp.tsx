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
    LucideWallet,
    LucideArrowRightLeft,
    LucideLoader2,
    LucideSparkles
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
    description: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

interface ClaimBonusResult {
    success: boolean;
    amount: number;
    streak: number;
    transaction: unknown;
}

type ViewMode = 'summary' | 'transactions' | 'daily-bonus';

export default function BancoSaltanoApp() {
    // --- LÓGICA EXISTENTE (NO TOCADA) ---
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
                setAccountSummary(result.data as AccountSummary);
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
                setTransactions(result.data as Transaction[]);
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
                const bonusData = result.data as ClaimBonusResult;
                toast.success(`¡Bonus reclamado! +${bonusData.amount} SaltoCoins (Racha: ${bonusData.streak} días)`);
                await loadAccountData();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al reclamar el bonus');
        } finally {
            setClaimingBonus(false);
        }
    };

    const getTransactionIcon = (type: string) => {
        // Adaptado visualmente pero misma lógica
        const baseClass = "p-2 rounded-lg backdrop-blur-md";
        switch (type) {
            case 'deposit':
            case 'game_reward':
                return <div className={`${baseClass} bg-green-500/10 text-green-400`}><LucideTrendingUp size={20} /></div>;
            case 'withdrawal':
            case 'purchase':
                return <div className={`${baseClass} bg-red-500/10 text-red-400`}><LucideTrendingDown size={20} /></div>;
            case 'daily_bonus':
                return <div className={`${baseClass} bg-yellow-500/10 text-yellow-400`}><LucideGift size={20} /></div>;
            case 'transfer':
                return <div className={`${baseClass} bg-blue-500/10 text-blue-400`}><LucideArrowRightLeft size={20} /></div>;
            default:
                return <div className={`${baseClass} bg-gray-500/10 text-gray-400`}><LucideCoins size={20} /></div>;
        }
    };

    const getTransactionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            deposit: 'Depósito',
            withdrawal: 'Retiro',
            game_reward: 'Premio Juego',
            daily_bonus: 'Bonus Diario',
            purchase: 'Compra',
            transfer: 'Transferencia',
            refund: 'Reembolso',
        };
        return labels[type] || type;
    };

    // --- NUEVA UI (BENTO GRID STYLE) ---

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <LucideLoader2 size={48} className="text-yellow-400 animate-spin mb-4" />
                <p className="font-teko text-2xl text-white/50 tracking-wide uppercase">Sincronizando Billetera...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto px-4 pb-20">

            {/* HEADER: TIPO DASHBOARD */}
            <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-black p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('/images/pattern-grid.svg')] opacity-5 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                            <LucidePiggyBank size={32} className="text-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-teko font-bold text-white uppercase tracking-wide leading-none">
                                Banco <span className="text-yellow-400">Saltano</span>
                            </h1>
                            <p className="text-sm font-rubik text-white/40">Gestiona tus SaltoCoins y recompensas diarias.</p>
                        </div>
                    </div>

                    <div className="text-center md:text-right bg-white/5 px-6 py-3 rounded-xl border border-white/5 backdrop-blur-md">
                        <span className="text-xs font-rubik text-white/50 uppercase tracking-widest block mb-1">Saldo Total</span>
                        <div className="flex items-baseline justify-center md:justify-end gap-1">
                            <span className="text-5xl font-teko font-bold text-white tracking-wide">
                                {accountSummary?.balance.toLocaleString()}
                            </span>
                            <span className="text-xl font-teko text-yellow-400">SC</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* NAVIGATION TABS */}
            <div className="flex p-1 bg-gray-900/40 backdrop-blur-sm rounded-xl border border-white/10 w-full md:w-max mx-auto overflow-x-auto">
                {[
                    { id: 'summary', icon: LucideWallet, label: 'Resumen' },
                    { id: 'transactions', icon: LucideHistory, label: 'Historial' },
                    { id: 'daily-bonus', icon: LucideGift, label: 'Bonus Diario' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setViewMode(tab.id as ViewMode);
                            if (tab.id === 'transactions') loadTransactions(transactionFilter);
                        }}
                        className={`
                            flex items-center gap-2 px-6 py-2 rounded-lg font-teko text-xl tracking-wide transition-all duration-300 whitespace-nowrap
                            ${viewMode === tab.id
                                ? 'bg-white/10 text-yellow-400 shadow-lg border border-white/10'
                                : 'text-white/40 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                        {tab.id === 'daily-bonus' && accountSummary?.canClaimDailyBonus && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENT AREA - BENTO GRID FEEL */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* --- VISTA: RESUMEN --- */}
                {viewMode === 'summary' && accountSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tarjeta de Ingresos */}
                        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/40 p-6 transition-all hover:-translate-y-1 hover:border-green-500/30">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><LucideTrendingUp size={24} /></div>
                                <span className="text-xs font-rubik text-white/30 uppercase tracking-widest">Global</span>
                            </div>
                            <h3 className="text-3xl font-teko font-bold text-white mb-1">+{accountSummary.totalDeposits.toLocaleString()}</h3>
                            <p className="text-sm font-rubik text-white/50">Ingresos Totales</p>
                        </div>

                        {/* Tarjeta de Gastos */}
                        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/40 p-6 transition-all hover:-translate-y-1 hover:border-red-500/30">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><LucideTrendingDown size={24} /></div>
                                <span className="text-xs font-rubik text-white/30 uppercase tracking-widest">Global</span>
                            </div>
                            <h3 className="text-3xl font-teko font-bold text-white mb-1">{accountSummary.totalWithdrawals.toLocaleString()}</h3>
                            <p className="text-sm font-rubik text-white/50">Gastos Totales</p>
                        </div>

                        {/* Tarjeta de Racha */}
                        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/40 p-6 transition-all hover:-translate-y-1 hover:border-yellow-500/30">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400"><LucideCalendar size={24} /></div>
                                <span className="text-xs font-rubik text-white/30 uppercase tracking-widest">Activo</span>
                            </div>
                            <h3 className="text-3xl font-teko font-bold text-white mb-1">{accountSummary.currentStreak} Días</h3>
                            <p className="text-sm font-rubik text-white/50">Racha Actual</p>
                        </div>

                        {/* Banner de Bonus (Ocupa todo el ancho si está disponible) */}
                        {accountSummary.canClaimDailyBonus && (
                            <div className="md:col-span-3 relative overflow-hidden rounded-2xl border border-green-500/50 bg-gradient-to-r from-green-900/40 to-black p-8 flex flex-col md:flex-row items-center justify-between gap-6 group">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="p-4 bg-green-500 text-black rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-bounce">
                                        <LucideGift size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-teko font-bold text-white uppercase tracking-wide">¡Recompensa Disponible!</h3>
                                        <p className="text-sm font-rubik text-green-200/80">Mantén tu racha y gana más SaltoCoins gratis.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClaimDailyBonus}
                                    disabled={claimingBonus}
                                    className="relative z-10 px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-teko text-xl font-bold uppercase rounded-lg transition-all shadow-lg hover:shadow-green-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {claimingBonus ? 'Procesando...' : 'Reclamar Ahora'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- VISTA: HISTORIAL --- */}
                {viewMode === 'transactions' && (
                    <div className="rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md overflow-hidden flex flex-col min-h-[500px]">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
                            <h2 className="font-teko text-2xl text-white uppercase tracking-wide flex items-center gap-2">
                                <LucideHistory className="text-white/50" size={20} />
                                Últimos Movimientos
                            </h2>
                            <select
                                value={transactionFilter || ''}
                                onChange={(e) => {
                                    const value = (e.target as HTMLSelectElement).value;
                                    setTransactionFilter(value || undefined);
                                    loadTransactions(value || undefined);
                                }}
                                className="bg-black/50 border border-white/10 text-white/80 text-sm rounded-lg px-4 py-2 font-rubik focus:outline-none focus:border-yellow-500/50"
                            >
                                <option value="">Todos</option>
                                <option value="game_reward">Premios</option>
                                <option value="daily_bonus">Bonus</option>
                                <option value="deposit">Depósitos</option>
                                <option value="withdrawal">Retiros</option>
                            </select>
                        </div>

                        {/* Lista */}
                        <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1">
                            {transactions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30">
                                    <LucideHistory size={48} className="mb-4 opacity-50" />
                                    <p className="font-rubik">No hay transacciones registradas</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                        <div className="flex items-center gap-4">
                                            {getTransactionIcon(tx.type)}
                                            <div>
                                                <p className="font-teko text-xl text-white leading-none mb-1">
                                                    {tx.description || getTransactionTypeLabel(tx.type)}
                                                </p>
                                                <p className="text-xs font-rubik text-white/40">
                                                    {new Date(tx.createdAt).toLocaleDateString()} • ID: #{tx.id.toString().slice(-4)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-teko text-xl font-bold tracking-wide ${['deposit', 'game_reward', 'daily_bonus', 'refund'].includes(tx.type) ? 'text-green-400' : 'text-white'}`}>
                                                {['deposit', 'game_reward', 'daily_bonus', 'refund'].includes(tx.type) ? '+' : ''}
                                                {tx.amount.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] font-rubik text-white/30">
                                                Saldo: {tx.balanceAfter.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* --- VISTA: BONUS --- */}
                {viewMode === 'daily-bonus' && accountSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Panel de Racha Visual */}
                        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-yellow-900/10 to-black p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                            <div className="absolute inset-0 bg-[url('/images/sun-pattern.svg')] opacity-5 animate-[spin_60s_linear_infinite]"></div>
                            <LucideSparkles className="text-yellow-400 mb-6 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" size={64} />

                            <h2 className="font-rubik text-sm text-yellow-200/50 uppercase tracking-[0.2em] font-bold mb-2">Racha Actual</h2>
                            <div className="font-teko text-8xl font-bold text-white drop-shadow-xl">
                                {accountSummary.currentStreak}
                            </div>
                            <p className="font-teko text-2xl text-yellow-500 uppercase">Días Consecutivos</p>
                        </div>

                        {/* Panel de Acción e Info */}
                        <div className="flex flex-col gap-6">
                            <div className="flex-1 rounded-2xl border border-white/10 bg-gray-900/40 p-6 backdrop-blur-md">
                                <h3 className="font-teko text-2xl text-white uppercase mb-4 pb-2 border-b border-white/10">Desglose de Recompensa</h3>

                                <div className="space-y-4 font-rubik text-sm">
                                    <div className="flex justify-between items-center text-white/60">
                                        <span>Base Diaria del Servidor</span>
                                        <span className="font-mono text-white">100 SC</span>
                                    </div>
                                    <div className="flex justify-between items-center text-yellow-400/80">
                                        <span className="flex items-center gap-2">
                                            <LucideTrendingUp size={14} /> Multiplicador de Racha
                                        </span>
                                        <span className="font-mono text-yellow-400">+{accountSummary.currentStreak * 10} SC</span>
                                    </div>

                                    <div className="h-px bg-white/10 my-2"></div>

                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="text-white font-bold uppercase">Total a Recibir</span>
                                        <span className="font-teko text-2xl text-green-400 font-bold">
                                            {100 + (accountSummary.currentStreak * 10)} SC
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {accountSummary.canClaimDailyBonus ? (
                                <button
                                    onClick={handleClaimDailyBonus}
                                    disabled={claimingBonus}
                                    className="w-full py-5 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-teko text-2xl font-bold uppercase tracking-wide shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all hover:-translate-y-1"
                                >
                                    {claimingBonus ? 'Conectando con el Banco...' : '¡Reclamar Bonus Ahora!'}
                                </button>
                            ) : (
                                <div className="p-6 rounded-2xl border border-white/5 bg-black/40 text-center flex flex-col items-center justify-center gap-2">
                                    <LucideHistory className="text-white/20" size={32} />
                                    <h3 className="font-teko text-xl text-white/40 uppercase">Ya reclamado hoy</h3>
                                    <p className="font-rubik text-xs text-white/30">
                                        Vuelve {accountSummary.nextClaimDate ? 'el ' + new Date(accountSummary.nextClaimDate).toLocaleDateString() : 'mañana'} para mantener tu racha.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}