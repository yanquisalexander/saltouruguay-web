import { useState } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideVolume2, LucideVolumeX, LucideEye } from "lucide-preact";
import { toast } from "sonner";
import { TEAMS } from "@/consts/Teams";
import { useVoiceChatStore } from "@/stores/voiceChat";

interface VoiceControlsProps {
  isAdmin: boolean;
}

export const VoiceControls = ({ isAdmin }: VoiceControlsProps) => {
  const [loading, setLoading] = useState(false);
  const [enabledTeams, setEnabledTeams] = useState<Record<string, boolean>>({});
  const { spectatingTeams, setSpectatingTeam } = useVoiceChatStore();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
      {/* Botón para abrir el popup */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-black/90 p-3 rounded-full border border-gray-700 hover:bg-black/95 transition-colors"
        title="Control de Voice Chat"
      >
        <LucideVolume2 className="w-5 h-5 text-white" />
      </button>

      {/* Modal popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-black/90 p-6 rounded-lg border border-gray-700 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LucideVolume2 className="w-5 h-5" />
                Control de Voice Chat
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-300 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {Object.values(TEAMS).map(team => (
                <div key={team} className="flex items-center justify-between gap-3 p-3 bg-gray-800/50 rounded">
                  <span className="text-sm text-white capitalize font-medium">{team}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEnableVoice(team)}
                      disabled={loading || enabledTeams[team]}
                      className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded flex items-center gap-1"
                    >
                      <LucideVolume2 className="w-3 h-3" />
                      ON
                    </button>
                    <button
                      onClick={() => handleDisableVoice(team)}
                      disabled={loading || !enabledTeams[team]}
                      className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded flex items-center gap-1"
                    >
                      <LucideVolumeX className="w-3 h-3" />
                      OFF
                    </button>
                    <button
                      onClick={() => handleSpectate(team, !spectatingTeams[team])}
                      disabled={loading}
                      className={`px-3 py-1.5 text-xs ${spectatingTeams[team] ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'} disabled:opacity-50 text-white rounded flex items-center gap-1`}
                    >
                      <LucideEye className="w-3 h-3" />
                      {spectatingTeams[team] ? 'SPECTEANDO' : 'SPECTEAR'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Los jugadores deben mantener presionada la tecla <kbd className="px-1 py-0.5 bg-gray-700 rounded text-white">V</kbd> para hablar
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
