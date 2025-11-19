import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideVolume2, LucideVolumeX, LucideEye } from "lucide-preact";
import { toast } from "sonner";
import { TEAMS } from "@/consts/Teams";
import { useVoiceChatStore } from "@/stores/voiceChat";

interface VoiceControlsProps {
  isAdmin: boolean;
  show: boolean;
}

export const VoiceControls = ({ isAdmin, show }: VoiceControlsProps) => {
  const [loading, setLoading] = useState(false);
  const [enabledTeams, setEnabledTeams] = useState<Record<string, boolean>>({});
  const { spectatingTeams, setSpectatingTeam } = useVoiceChatStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isAdmin || !show) {
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

  const handleSpectate = async (teamId: string, enable: boolean) => {
    setLoading(true);
    try {
      const { error } = await actions.voice.spectate({ teamId, enable });
      if (error) {
        toast.error(`Error: ${error.message}`);
      } else {
        setSpectatingTeam(teamId, enable);
        toast.success(`${enable ? 'Specteando' : 'Dejando de spectear'} equipo ${teamId}`);
      }
    } catch (err) {
      toast.error("Error al spectear");
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      className="fixed z-50 bg-black/90 p-4 rounded-lg border border-gray-700 max-w-xs cursor-move select-none"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <LucideVolume2 className="w-4 h-4" />
          Control de Voice Chat
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:text-gray-300"
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-2">
            {Object.values(TEAMS).map(team => (
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
                  <button
                    onClick={() => handleSpectate(team, !spectatingTeams[team])}
                    disabled={loading}
                    className={`px-2 py-1 text-xs ${spectatingTeams[team] ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'} disabled:opacity-50 text-white rounded flex items-center gap-1`}
                  >
                    <LucideEye className="w-3 h-3" />
                    {spectatingTeams[team] ? 'SPECTEANDO' : 'SPECTEAR'}
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
        </>
      )}
    </div>
  );
};
