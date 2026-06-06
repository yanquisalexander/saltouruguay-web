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
    LucideSparkles,
} from 'lucide-preact';

interface AccountSummary {
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalTransfers: number;
    canClaimDailyBonus: boolean;
    currentStreak: number;
    nextClaimDate?: Date | string;
}

interface Transaction {
    id: number;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date | string;
}

interface ClaimBonusResult {
    success: boolean;
    amount: number;
    streak: number;
    transaction: unknown;
}

type ViewMode = 'summary' | 'transactions' | 'daily-bonus';

interface Props {
    initialSummary: AccountSummary;
}

export default function BancoSaltanoApp({ initialSummary }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>('summary');
    const [accountSummary, setAccountSummary] = useState<AccountSummary>(initialSummary);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [claimingBonus, setClaimingBonus] = useState(false);
    const [transactionFilter, setTransactionFilter] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadAccountData();
    }, []);

    const loadAccountData = async () => {
        try {
            const result = await actions.banco.getAccountSummary();
            if (result.data) {
                setAccountSummary(result.data as AccountSummary);
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar los datos');
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
        const baseClass = "p-2 rounded-lg backdrop-blur-md";
        switch (type) {
            case 'deposit':
            case 'game_reward':
                return <div className={`${baseClass} bg-green-500/10 text-green-400`}><LucideTrendingUp size={18} /></div>;
            case 'withdrawal':
            case 'purchase':
                return <div className={`${baseClass} bg-red-500/10 text-red-400`}><LucideTrendingDown size={18} /></div>;
            case 'daily_bonus':
                return <div className={`${baseClass} bg-yellow-500/10 text-yellow-400`}><LucideGift size={18} /></div>;
            case 'transfer':
                return <div className={`${baseClass} bg-blue-500/10 text-blue-400`}><LucideArrowRightLeft size={18} /></div>;
            default:
                return <div className={`${baseClass} bg-gray-500/10 text-gray-400`}><LucideCoins size={18} /></div>;
        }
    };

    const getTransactionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            deposit: 'Depósito',
            withdrawal: 'Retiro',
            game_reward: 'Premio de Juego',
            daily_bonus: 'Bonus Diario',
            purchase: 'Compra',
            transfer: 'Transferencia',
            refund: 'Reembolso',
        };
        return labels[type] || type;
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
    };

    const isPositiveType = (type: string) =>
        ['deposit', 'game_reward', 'daily_bonus', 'refund'].includes(type);

    const tabs = [
        { id: 'summary' as ViewMode, icon: LucideWallet, label: 'Resumen' },
        { id: 'transactions' as ViewMode, icon: LucideHistory, label: 'Historial' },
        { id: 'daily-bonus' as ViewMode, icon: LucideGift, label: 'Bonus Diario' },
    ];

    return (
        <div class="flex flex-col gap-6 w-full pb-6">

            {/* HEADER */}
            <header class="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-gray-900 via-gray-900 to-black p-6 md:p-8 shadow-2xl">
                <div class="absolute inset-0 bg-[url('/images/pattern-grid.svg')] opacity-5 pointer-events-none" />
                <div class="absolute top-0 right-0 w-72 h-72 bg-yellow-500/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div class="flex items-center gap-4">
                        <div class="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 shadow-lg shadow-yellow-500/5">
                            <LucidePiggyBank size={28} class="text-yellow-400" />
                        </div>
                        <div>
                            <h1 class="text-3xl md:text-4xl font-teko font-bold text-white uppercase tracking-wide leading-none">
                                Banco <span class="text-yellow-400">Saltano</span>
                            </h1>
                            <p class="text-sm font-rubik text-white/40">Gestioná tus SaltoCoins y recompensas diarias</p>
                        </div>
                    </div>

                    <div class="w-full md:w-auto bg-white/[0.03] px-5 py-3 rounded-xl border border-white/[0.06] backdrop-blur-md">
                        <span class="text-[10px] font-rubik text-white/40 uppercase tracking-[0.15em] block mb-0.5">Saldo disponible</span>
                        <div class="flex items-baseline gap-1.5">
                            <span class="text-4xl md:text-5xl font-teko font-bold text-white tracking-tight tabular-nums">
                                {accountSummary.balance.toLocaleString()}
                            </span>
                            <span class="text-lg md:text-xl font-teko text-yellow-400 font-semibold">SC</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* TABS */}
            <div class="flex p-1 bg-white/[0.03] backdrop-blur-xs rounded-xl border border-white/[0.06] w-full md:w-max mx-auto overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setViewMode(tab.id);
                            if (tab.id === 'transactions') loadTransactions(transactionFilter);
                        }}
                        class={`
                            relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-teko text-lg tracking-wide transition-all duration-300 whitespace-nowrap
                            ${viewMode === tab.id
                                ? 'bg-white/10 text-yellow-400 shadow-sm border border-white/[0.08]'
                                : 'text-white/40 hover:text-white/70'}
                        `}
                    >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                        {tab.id === 'daily-bonus' && accountSummary.canClaimDailyBonus && (
                            <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* SUMMARY */}
                {viewMode === 'summary' && (
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                        <MetricCard
                            icon={<LucideTrendingUp size={22} />}
                            label="Ingresos totales"
                            value={`+${accountSummary.totalDeposits.toLocaleString()}`}
                            accent="green"
                        />
                        <MetricCard
                            icon={<LucideTrendingDown size={22} />}
                            label="Gastos totales"
                            value={accountSummary.totalWithdrawals.toLocaleString()}
                            accent="red"
                        />
                        <MetricCard
                            icon={<LucideCalendar size={22} />}
                            label="Racha actual"
                            value={`${accountSummary.currentStreak} días`}
                            accent="yellow"
                        />

                        {accountSummary.canClaimDailyBonus && (
                            <div class="md:col-span-3 relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-linear-to-r from-yellow-900/20 via-yellow-900/10 to-black p-6 flex flex-col sm:flex-row items-center justify-between gap-5 group">
                                <div class="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                                <div class="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                                <div class="relative z-10 flex items-center gap-5">
                                    <div class="p-3.5 bg-yellow-500 text-black rounded-xl shadow-lg shadow-yellow-500/20">
                                        <LucideGift size={26} />
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-teko font-bold text-white uppercase tracking-wide">¡Bonus diario disponible!</h3>
                                        <p class="text-sm font-rubik text-yellow-200/70">Reclamá tu recompensa y mantené la racha activa</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClaimDailyBonus}
                                    disabled={claimingBonus}
                                    class="relative z-10 px-7 py-2.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-teko text-lg font-bold uppercase rounded-lg transition-all shadow-lg hover:shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {claimingBonus ? 'Reclamando...' : 'Reclamar'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* TRANSACTIONS */}
                {viewMode === 'transactions' && (
                    <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md overflow-hidden flex flex-col">
                        <div class="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h2 class="font-teko text-xl text-white/80 uppercase tracking-wide flex items-center gap-2">
                                <LucideHistory size={18} class="text-white/30" />
                                Últimos movimientos
                            </h2>
                            <select
                                value={transactionFilter || ''}
                                onChange={(e) => {
                                    const value = (e.target as HTMLSelectElement).value;
                                    setTransactionFilter(value || undefined);
                                    loadTransactions(value || undefined);
                                }}
                                class="bg-black/40 border border-white/[0.08] text-white/70 text-sm rounded-lg px-3 py-1.5 font-rubik focus:outline-hidden focus:border-yellow-500/50 w-full sm:w-auto"
                            >
                                <option value="">Todos</option>
                                <option value="game_reward">Premios</option>
                                <option value="daily_bonus">Bonus</option>
                                <option value="deposit">Depósitos</option>
                                <option value="withdrawal">Retiros</option>
                            </select>
                        </div>

                        <div class="flex-1 overflow-y-auto max-h-[500px] p-2 space-y-0.5">
                            {transactions.length === 0 ? (
                                <div class="flex flex-col items-center justify-center py-16 text-white/20">
                                    <LucideHistory size={40} class="mb-3 opacity-50" />
                                    <p class="font-rubik text-sm">No hay movimientos todavía</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        class="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.04] group"
                                    >
                                        <div class="flex items-center gap-3.5 min-w-0">
                                            {getTransactionIcon(tx.type)}
                                            <div class="min-w-0">
                                                <p class="font-teko text-lg text-white/90 leading-tight truncate">
                                                    {tx.description || getTransactionTypeLabel(tx.type)}
                                                </p>
                                                <p class="text-[11px] font-rubik text-white/30">
                                                    {formatDate(tx.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div class="text-right shrink-0 ml-4">
                                            <p class={`font-teko text-lg font-bold tracking-tight tabular-nums ${isPositiveType(tx.type) ? 'text-green-400' : 'text-white/80'}`}>
                                                {isPositiveType(tx.type) ? '+' : ''}
                                                {tx.amount.toLocaleString()}
                                            </p>
                                            <p class="text-[10px] font-rubik text-white/20 tabular-nums">
                                                Saldo: {tx.balanceAfter.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* DAILY BONUS */}
                {viewMode === 'daily-bonus' && (
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-5">
                        <div class="md:col-span-2 relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-linear-to-b from-yellow-900/10 to-black/60 p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
                            <div class="absolute inset-0 bg-[url('/images/pattern-grid.svg')] opacity-[0.03] pointer-events-none" />
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/8 rounded-full blur-2xl pointer-events-none" />

                            <div class="relative z-10 flex flex-col items-center">
                                <div class="relative mb-5">
                                    <LucideSparkles size={48} class="text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                                    {accountSummary.currentStreak > 0 && (
                                        <span class="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-40" />
                                            <span class="relative inline-flex rounded-full h-4 w-4 bg-yellow-400" />
                                        </span>
                                    )}
                                </div>

                                <p class="font-rubik text-[11px] text-yellow-200/40 uppercase tracking-[0.2em] font-semibold mb-1">Racha actual</p>
                                <p class="font-teko text-7xl md:text-8xl font-bold text-white drop-shadow-lg leading-none">
                                    {accountSummary.currentStreak}
                                </p>
                                <p class="font-teko text-lg md:text-xl text-yellow-500/80 uppercase tracking-wide mt-1">Días consecutivos</p>
                            </div>
                        </div>

                        <div class="md:col-span-3 flex flex-col gap-4">
                            <div class="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md">
                                <h3 class="font-teko text-xl text-white/80 uppercase tracking-wide mb-4 pb-3 border-b border-white/[0.06]">Detalle de recompensa</h3>

                                <div class="space-y-3 font-rubik text-sm">
                                    <div class="flex justify-between items-center text-white/50">
                                        <span>Base diaria</span>
                                        <span class="font-mono text-white/80">100 SC</span>
                                    </div>
                                    <div class="flex justify-between items-center text-yellow-400/70">
                                        <span class="flex items-center gap-1.5">
                                            <LucideTrendingUp size={13} /> Bonus por racha
                                        </span>
                                        <span class="font-mono text-yellow-400">+{accountSummary.currentStreak * 10} SC</span>
                                    </div>

                                    <div class="h-px bg-white/[0.06]" />

                                    <div class="flex justify-between items-center bg-yellow-500/[0.04] p-3 rounded-lg border border-yellow-500/10">
                                        <span class="text-white/80 font-semibold uppercase text-xs tracking-wide">Total a recibir</span>
                                        <span class="font-teko text-2xl text-yellow-400 font-bold tabular-nums">
                                            {100 + (accountSummary.currentStreak * 10)} SC
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {accountSummary.canClaimDailyBonus ? (
                                <button
                                    onClick={handleClaimDailyBonus}
                                    disabled={claimingBonus}
                                    class="w-full py-4 rounded-2xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-teko text-xl font-bold uppercase tracking-wide shadow-lg shadow-yellow-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {claimingBonus ? (
                                        <span class="flex items-center justify-center gap-2">
                                            <span class="w-4 h-4 rounded-full border-2 border-black/30 border-t-transparent animate-spin" />
                                            Reclamando...
                                        </span>
                                    ) : '¡Reclamar bonus!'}
                                </button>
                            ) : (
                                <div class="p-5 rounded-2xl border border-white/[0.04] bg-black/30 text-center flex flex-col items-center justify-center gap-2">
                                    <LucideCalendar class="text-white/15" size={28} />
                                    <p class="font-teko text-lg text-white/30 uppercase">Ya reclamaste hoy</p>
                                    <p class="font-rubik text-xs text-white/20">
                                        Volvé {accountSummary.nextClaimDate ? formatDate(accountSummary.nextClaimDate) : 'mañana'} para mantener la racha
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

function MetricCard({ icon, label, value, accent }: {
    icon: any;
    label: string;
    value: string;
    accent: 'green' | 'red' | 'yellow';
}) {
    const accentStyles = {
        green: { border: 'hover:border-green-500/30', icon: 'bg-green-500/10 text-green-400' },
        red: { border: 'hover:border-red-500/30', icon: 'bg-red-500/10 text-red-400' },
        yellow: { border: 'hover:border-yellow-500/30', icon: 'bg-yellow-500/10 text-yellow-400' },
    };
    const a = accentStyles[accent];

    return (
        <div class={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${a.border}`}>
            <div class="flex items-center justify-between mb-3">
                <div class={`p-2 rounded-lg ${a.icon}`}>
                    {icon}
                </div>
            </div>
            <p class="font-teko text-2xl md:text-3xl font-bold text-white tabular-nums leading-tight">{value}</p>
            <p class="text-xs font-rubik text-white/40 mt-0.5">{label}</p>
        </div>
    );
}
