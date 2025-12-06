import { h } from 'preact';

interface PetStatsProps {
    stats: {
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    };
}

export default function PetStats({ stats }: PetStatsProps) {
    const renderStat = (icon: string, value: number, colorClass: string) => (
        <div className="flex flex-col items-center gap-1 group cursor-help transition-transform hover:scale-105">
            <div className="relative w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 overflow-hidden backdrop-blur-sm">
                <div
                    className={`absolute bottom-0 left-0 right-0 ${colorClass} opacity-30 transition-all duration-1000`}
                    style={{ height: `${value}%` }}
                />
                <span className="text-2xl z-10 drop-shadow-md filter">{icon}</span>
            </div>
            <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div
                    className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="bg-black/20 backdrop-blur-md rounded-3xl p-3 shadow-lg border border-white/5">
            <div className="grid grid-cols-4 gap-3">
                {renderStat('🍔', stats.hunger, 'bg-red-500')}
                {renderStat('⚡', stats.energy, 'bg-yellow-500')}
                {renderStat('🧼', stats.hygiene, 'bg-blue-500')}
                {renderStat('😊', stats.happiness, 'bg-green-500')}
            </div>
        </div>
    );
}