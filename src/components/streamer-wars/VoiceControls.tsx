import { useState } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideVolume2, LucideVolumeX, LucideMicOff } from "lucide-preact";
import { toast } from "sonner";

interface VoiceControlsProps {
  isAdmin: boolean;
}

const TEAMS = ["red", "blue", "green", "yellow"] as const;

export const VoiceControls = ({ isAdmin }: VoiceControlsProps) => {
  const [loading, setLoading] = useState(false);
  const [enabledTeams, setEnabledTeams] = useState<Record<string, boolean>>({});

  if (!isAdmin) {
    return null;
  }

  const handleEnableVoice = async (teamId: string) => {
    setLoading(true);
    try {
      const { error } = await actions.voice.enable({ teamId });
      if (error) {
        toast.error(`Error: ${error.message}`);
      } else {
        setEnabledTeams(prev => ({ ...prev, [teamId]: true }));
        toast.success(`Voice habilitado para equipo ${teamId}`);
      }
    } catch (err) {
      toast.error("Error al habilitar voice chat");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableVoice = async (teamId: string) => {
    setLoading(true);
    try {
      const { error } = await actions.voice.disable({ teamId });
      if (error) {
        toast.error(`Error: ${error.message}`);
      } else {
        setEnabledTeams(prev => ({ ...prev, [teamId]: false }));
        toast.success(`Voice deshabilitado para equipo ${teamId}`);
      }
    } catch (err) {
      toast.error("Error al deshabilitar voice chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-20 left-4 z-50 bg-black/90 p-4 rounded-lg border border-gray-700 max-w-xs">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <LucideVolume2 className="w-4 h-4" />
        Control de Voice Chat
      </h3>
      
      <div className="space-y-2">
        {TEAMS.map(team => (
          <div key={team} className="flex items-center justify-between gap-2 p-2 bg-gray-800/50 rounded">
            <span className="text-xs text-white capitalize">{team}</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleEnableVoice(team)}
                disabled={loading || enabledTeams[team]}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded flex items-center gap-1"
              >
                <LucideVolume2 className="w-3 h-3" />
                ON
              </button>
              <button
                onClick={() => handleDisableVoice(team)}
                disabled={loading || !enabledTeams[team]}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded flex items-center gap-1"
              >
                <LucideVolumeX className="w-3 h-3" />
                OFF
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          Los jugadores deben mantener presionada la tecla <kbd className="px-1 py-0.5 bg-gray-700 rounded text-white">V</kbd> para hablar
        </p>
      </div>
    </div>
  );
};
