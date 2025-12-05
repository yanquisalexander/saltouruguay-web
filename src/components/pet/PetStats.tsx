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
    const getStatColor = (value: number) => {
        if (value < 20) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
        if (value < 40) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
        if (value < 60) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
        return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
    };

    const renderStatBar = (label: string, icon: string, value: number) => {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80 flex items-center gap-2 font-medium">
                        <span className="text-lg">{icon}</span>
                        {label}
                    </span>
                    <span className="text-white font-bold">
                        {Math.round(value)}%
                    </span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                        className={`h-full rounded-full ${getStatColor(value)} transition-all duration-1000 ease-out`}
                        style={{ width: `${value}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-violet-500 rounded-full"></span>
                Estadísticas
            </h3>
            <div className="space-y-5">
                {renderStatBar('Hambre', '🍔', stats.hunger)}
                {renderStatBar('Energía', '⚡', stats.energy)}
                {renderStatBar('Higiene', '🧼', stats.hygiene)}
                {renderStatBar('Felicidad', '😊', stats.happiness)}
            </div>
        </div>
    );
}
