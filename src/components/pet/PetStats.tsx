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
        if (value < 20) return 'bg-red-500';
        if (value < 40) return 'bg-orange-500';
        if (value < 60) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatBorderColor = (value: number) => {
        if (value < 20) return 'border-red-700';
        if (value < 40) return 'border-orange-700';
        if (value < 60) return 'border-yellow-700';
        return 'border-green-700';
    };

    const renderStatBar = (label: string, icon: string, value: number) => {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="pixel-text text-white flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        {label}
                    </span>
                    <span className="pixel-text text-white font-bold">
                        {Math.round(value)}%
                    </span>
                </div>
                <div className={`h-8 bg-gray-800 border-4 ${getStatBorderColor(value)} overflow-hidden`}>
                    <div
                        className={`h-full ${getStatColor(value)} transition-all duration-500`}
                        style={{ width: `${value}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="pixel-inset p-4 bg-gray-900/50 space-y-4">
            <h3 className="pixel-heading text-xl text-white text-center mb-4">
                Estadísticas
            </h3>
            {renderStatBar('Hambre', '🍔', stats.hunger)}
            {renderStatBar('Energía', '⚡', stats.energy)}
            {renderStatBar('Higiene', '🧼', stats.hygiene)}
            {renderStatBar('Felicidad', '😊', stats.happiness)}
        </div>
    );
}
