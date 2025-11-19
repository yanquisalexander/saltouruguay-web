import { cn } from "@/lib/utils";
import "./styles/retro.css";

export interface ProgressProps {
  value: number; // Value between -100 and 100
  teamAColor?: string;
  teamBColor?: string;
  teamAName?: string;
  teamBName?: string;
  className?: string;
}

export function Progress({
  value,
  teamAColor = "bg-blue-500",
  teamBColor = "bg-red-500",
  teamAName = "Equipo A",
  teamBName = "Equipo B",
  className,
}: ProgressProps) {
  // Clamp value between -100 and 100
  const clampedValue = Math.max(-100, Math.min(100, value));
  
  // Convert to percentage (0-100%)
  // -100 = 0%, 0 = 50%, 100 = 100%
  const percentage = ((clampedValue + 100) / 200) * 100;

  return (
    <div className={cn("flex flex-col gap-4 w-full max-w-4xl", className)}>
      {/* Team names */}
      <div className="flex justify-between text-sm font-bold font-atomic">
        <span className={cn("text-white px-2 py-1 rounded", teamAColor)}>
          {teamAName}
        </span>
        <span className={cn("text-white px-2 py-1 rounded", teamBColor)}>
          {teamBName}
        </span>
      </div>

      {/* Progress bar container */}
      <div className="relative h-12 bg-gray-800 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white z-10 transform -translate-x-1/2" />
        
        {/* Progress fill */}
        <div 
          className={cn(
            "absolute top-0 bottom-0 transition-all duration-200",
            percentage >= 50 ? teamAColor : teamBColor
          )}
          style={{
            left: percentage >= 50 ? '50%' : `${percentage}%`,
            right: percentage >= 50 ? `${100 - percentage}%` : '50%',
          }}
        />

        {/* Flag/indicator */}
        <div 
          className="absolute top-0 bottom-0 w-2 bg-yellow-400 border-2 border-black transition-all duration-200 z-20"
          style={{
            left: `${percentage}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Flag triangle */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-yellow-400" />
          </div>
        </div>
      </div>

      {/* Score display */}
      <div className="flex justify-center">
        <div className="text-2xl font-bold font-atomic bg-gray-800 px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className={cn(clampedValue > 0 ? teamAColor.replace('bg-', 'text-') : "text-white")}>
            {clampedValue > 0 ? '+' : ''}{clampedValue}
          </span>
        </div>
      </div>
    </div>
  );
}
