import { useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";

interface AdminChatProps { session: Session; channel: any; isAdmin: boolean; }

const COMMANDS = [
    { name: "/announce", description: "Send an announcement", args: ["message"] },
    { name: "/kill", description: "Kill one or more players", args: ["playerNumber", "..."] },
    { name: "/launch", description: "Launch a game", args: ["gameId", "args?"] },
    { name: "/episode", description: "Show episode title", args: ["number"] },
    {
        name: "/journey", description: "Lock or unlock the journey", args: ["unlock|lock"], useAction: async (args: string[]) => {
            const action = args[0];
            if (action === 'unlock') {
                return actions.streamerWars.setDayAsAvailable();
            } else if (action === 'lock') {
                return actions.streamerWars.finishDay();
            } else {
                throw new Error('Invalid action. Use "unlock" or "lock"');
            }
        }
    },
    { name: "/team", description: "View team members", args: ["color"] },
    { name: "/waiting", description: "Show or hide waiting screen", args: ["show", "expected"] },
    { name: "/play-cinematic", description: "Play a cinematic", args: ["id"] },
    { name: "/waiting-room", description: "Send players to waiting room", args: [] },
    { name: "/chat", description: "Lock or unlock the chat", args: ["unlock|lock"] },
    { name: "/dalgona", description: "Control Dalgona minigame", args: ["start|end"] },
    { name: "/timer", description: "Show a timer for the specified seconds", args: ["seconds"] },
    { name: "/cuerda", description: "Control Tug of War game", args: ["start|end|next|clear"] },
    { name: "/bomb", description: "Control Bomb minigame", args: ["start|end|status"] },
    { name: "/fishing", description: "Control Fishing minigame", args: ["start|end|reset"] },
    { name: "/revive", description: "Revive a player", args: ["playerNumber"] },
    { name: "/instructions", description: "Send immersive instructions by ID", args: ["id"] }
];

export const AdminChat = ({ isAdmin }: AdminChatProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [command, setCommand] = useState("");
    const [suggestions, setSuggestions] = useState<typeof COMMANDS>([]);
    const [history, setHistory] = useState<{ type: 'command' | 'response' | 'error', text: string }[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const historyEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 't' || e.key === 'T') && !isOpen) {
                const active = document.activeElement as HTMLElement;
                if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
                e.preventDefault();
                setIsOpen(true);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
        if (historyEndRef.current) historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [isOpen, history]);

    useEffect(() => {
        if (command.startsWith('/')) {
            const query = command.split(' ')[0].slice(1).toLowerCase();
            setSuggestions(COMMANDS.filter(c => c.name.slice(1).startsWith(query)));
        } else {
            setSuggestions([]);
        }
    }, [command]);

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        if (command.trim()) {
            if (!command.startsWith('/')) {
                setHistory(prev => [...prev.slice(-19), { type: 'error', text: 'Error: Commands must start with /' }]);
                setCommand("");
                return;
            }

            const parts = command.trim().split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);

            const commandExists = COMMANDS.some(c => c.name === cmd);
            if (!commandExists) {
                setHistory(prev => [...prev.slice(-19), { type: 'error', text: `Error: Command ${cmd} not found` }]);
                setCommand("");
                return;
            }

            const commandObj = COMMANDS.find(c => c.name === cmd)!;

            // Call the action
            const actionPromise = commandObj.useAction
                ? commandObj.useAction(args)
                : actions.streamerWars.executeAdminCommand({ command: cmd, args });

            actionPromise.then(result => {
                if (result.error) {
                    setHistory(prev => [...prev.slice(-19), { type: 'error', text: result.error.message || 'EXECUTION FAILED' }]);
                } else if (commandObj.useAction) {
                    setHistory(prev => [...prev.slice(-19), { type: 'command', text: `> ${cmd.trim()}` }, { type: 'response', text: 'SUCCESS' }]);
                } else if (result.data?.success) {
                    setHistory(prev => [...prev.slice(-19), { type: 'command', text: `> ${cmd.trim()}` }, { type: 'response', text: 'SUCCESS' }]);
                } else {
                    setHistory(prev => [...prev.slice(-19), { type: 'error', text: 'EXECUTION FAILED' }]);
                }
                setCommand("");

            }).catch(error => {
                setHistory(prev => [...prev.slice(-19), { type: 'error', text: 'SYSTEM ERROR' }]);
                setCommand("");
            });
        }
    };

    if (!isAdmin || !isOpen) return null;

    return (
        <div class="fixed inset-0 z-[10000] flex items-end justify-start p-6 pointer-events-none">
            <div class="w-full max-w-xl bg-[#0a0a0a] border-4 border-[#b4cd02] shadow-[12px_12px_0px_0px_rgba(0,0,0,0.7)] pointer-events-auto flex flex-col overflow-hidden">

                {/* CABECERA MÁS LIMPIA */}
                <div class="bg-[#b4cd02] px-3 py-1.5 flex justify-between items-center">
                    <span class="font-atomic italic text-black text-xl tracking-tighter">GUERRA DE STREAMERS</span>
                    <span class="font-anton text-black text-xs tracking-widest px-2 border border-black/20">ADMIN CONSOLE</span>
                </div>

                {/* LOGS: Sin efectos agresivos, máxima legibilidad */}
                <div class="h-64 overflow-y-auto p-4 font-mono text-[13px] bg-black scrollbar-thin scrollbar-thumb-[#b4cd02]">
                    <div class="space-y-1">
                        {history.map((msg, i) => (
                            <div key={i} class={`py-1 px-2 ${msg.type === 'error' ? 'bg-red-900/40 text-red-400 border-l-2 border-red-500' :
                                msg.type === 'command' ? 'text-white border-l-2 border-[#b4cd02] bg-white/5' :
                                    'text-[#b4cd02]/80'
                                }`}>
                                {msg.text}
                            </div>
                        ))}
                        <div ref={historyEndRef} />
                    </div>
                </div>

                {/* SUGERENCIAS: Estilo tarjetas horizontales */}
                {suggestions.length > 0 && (
                    <div class="bg-[#111] border-t border-[#b4cd02]/20 p-2 flex gap-2 overflow-x-auto">
                        {suggestions.map(s => (
                            <div class="bg-black border border-neutral-800 p-2 text-[11px]">
                                <span class="font-anton text-[#b4cd02] block uppercase">{s.name}</span>
                                <span class="text-neutral-500 font-mono italic">{s.args.join(' ')}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ÁREA DE INPUT: Sin text-transform uppercase */}
                <div class="p-4 bg-[#0a0a0a] border-t-4 border-[#b4cd02]">
                    <form onSubmit={handleSubmit} class="flex items-center gap-3">
                        <span class="font-anton text-[#b4cd02] text-2xl select-none">{'>'}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={command}
                            onInput={(e) => setCommand((e.target as HTMLInputElement).value)}
                            placeholder="Escribe un comando..."
                            class="w-full bg-transparent text-white outline-none font-anton text-xl tracking-wide"
                            autoComplete="off"
                        />
                    </form>

                    <div class="mt-2 flex justify-end gap-4 font-teko text-neutral-500 text-sm tracking-widest">
                        <span>[ESC] CERRAR</span>
                        <span>[ENTER] ENVIAR</span>
                    </div>
                </div>
            </div>
        </div>
    );
};