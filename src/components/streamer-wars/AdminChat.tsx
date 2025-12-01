import { useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";

interface AdminChatProps {
    session: Session;
    channel: any; // Pusher channel
    isAdmin: boolean;
}

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
    { name: "/revive", description: "Revive a player", args: ["playerNumber"] }
];

export const AdminChat = ({ session, channel, isAdmin }: AdminChatProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [command, setCommand] = useState("");
    const [suggestions, setSuggestions] = useState<typeof COMMANDS>([]);
    const [history, setHistory] = useState<{ type: 'command' | 'response' | 'error', text: string }[]>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number | null>(null);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 't' || e.key === 'T') {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.contentEditable === 'true')) {
                    return;
                }
                e.preventDefault();
                setIsOpen(true);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setCommand("");
                setSuggestions([]);
                setCurrentHistoryIndex(null);
            } else if (e.key === 'Tab' && isOpen && suggestions.length > 0) {
                e.preventDefault();
                setCommand(suggestions[0].name + ' ');
                setSuggestions([]);
            } else if (e.key === 'ArrowUp' && isOpen) {
                e.preventDefault();
                navigateHistory('up');
            } else if (e.key === 'ArrowDown' && isOpen) {
                e.preventDefault();
                navigateHistory('down');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, suggestions, commandHistory, currentHistoryIndex]);

    // Auto-scroll to bottom of history
    useEffect(() => {
        if (historyEndRef.current) {
            historyEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [history, isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (command.startsWith('/')) {
            const query = command.slice(1).toLowerCase();
            const filtered = COMMANDS.filter(cmd => cmd.name.slice(1).toLowerCase().startsWith(query));
            setSuggestions(filtered);
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
                setCurrentHistoryIndex(null);
                setCommandHistory(prev => {
                    const newHistory = [...prev];
                    if (command.trim() && (newHistory.length === 0 || newHistory[newHistory.length - 1] !== command.trim())) {
                        newHistory.push(command.trim());
                        if (newHistory.length > 20) newHistory.shift();
                    }
                    return newHistory;
                });
            }).catch(error => {
                setHistory(prev => [...prev.slice(-19), { type: 'error', text: 'SYSTEM ERROR' }]);
                setCommand("");
                setCurrentHistoryIndex(null);
            });
        }
    };

    const selectSuggestion = (cmd: string) => {
        setCommand(cmd + ' ');
        setSuggestions([]);
        inputRef.current?.focus();
    };

    const navigateHistory = (direction: 'up' | 'down') => {
        if (direction === 'up') {
            if (currentHistoryIndex === null) {
                if (commandHistory.length > 0) {
                    setCurrentHistoryIndex(commandHistory.length - 1);
                    setCommand(commandHistory[commandHistory.length - 1]);
                }
            } else if (currentHistoryIndex > 0) {
                setCurrentHistoryIndex(currentHistoryIndex - 1);
                setCommand(commandHistory[currentHistoryIndex - 1]);
            }
        } else {
            if (currentHistoryIndex !== null) {
                if (currentHistoryIndex < commandHistory.length - 1) {
                    setCurrentHistoryIndex(currentHistoryIndex + 1);
                    setCommand(commandHistory[currentHistoryIndex + 1]);
                } else {
                    setCurrentHistoryIndex(null);
                    setCommand('');
                }
            }
        }
    };

    if (!isAdmin || !isOpen) return null;

    return (
        <div class="fixed bottom-20 left-4 z-[10000] w-[400px] max-w-[90vw] flex flex-col font-mono">
            {/* Main Container */}
            <div class="bg-slate-900 border-4 border-slate-600 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">

                {/* Retro Header */}
                <div class="bg-slate-800 p-2 border-b-4 border-slate-600 flex justify-between items-center select-none">
                    <h2 class="text-yellow-400 text-xs font-bold flex items-center gap-2 font-press-start-2p uppercase tracking-widest">
                        <span class="animate-pulse text-green-500">_</span>CMD.EXE
                    </h2>
                    <div class="flex gap-2 text-[10px]">
                        <span class="text-slate-400">ADMIN</span>
                        <span class="text-slate-600">|</span>
                        <span class="text-slate-400">v1.0</span>
                    </div>
                </div>

                {/* Terminal Output Window */}
                <div class="bg-black p-3 min-h-[200px] max-h-[300px] overflow-y-auto font-mono text-xs border-b-4 border-slate-700">
                    {history.length === 0 && (
                        <div class="text-slate-600 italic mb-2">System ready... Waiting for input.</div>
                    )}
                    {history.map((msg, i) => (
                        <div key={i} class={`mb-1 break-all ${msg.type === 'error' ? 'text-red-500 bg-red-950/30' :
                            msg.type === 'command' ? 'text-yellow-300 font-bold mt-2' :
                                'text-green-400 pl-2 border-l-2 border-green-900'
                            }`}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={historyEndRef} />
                </div>

                {/* Input Area */}
                <div class="bg-slate-800 p-2 relative">
                    <form onSubmit={handleSubmit} class="flex items-center gap-2 bg-slate-900 border-2 border-slate-600 p-2 shadow-inner focus-within:border-green-500 transition-colors">
                        <span class="text-green-500 font-bold animate-pulse">{'>'}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={command}
                            onInput={(e) => setCommand((e.target as HTMLInputElement).value)}
                            placeholder="Enter command..."
                            class="w-full bg-transparent text-white placeholder-slate-600 outline-none font-mono text-sm"
                            autoComplete="off"
                        />
                    </form>

                    {/* Suggestions Popover - Retro Style */}
                    {suggestions.length > 0 && (
                        <div class="absolute bottom-full left-0 w-full mb-1 px-2 z-20">
                            <ul class="bg-slate-900 border-2 border-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] max-h-48 overflow-y-auto">
                                <li class="bg-slate-800 text-yellow-400 px-2 py-1 text-[10px] border-b border-slate-700 font-press-start-2p uppercase">
                                    SUGGESTIONS ({suggestions.length})
                                </li>
                                {suggestions.map((sug, idx) => (
                                    <li
                                        key={sug.name}
                                        class="px-3 py-2 hover:bg-green-900/50 cursor-pointer border-b border-slate-800 last:border-0 group transition-colors"
                                        onClick={() => selectSuggestion(sug.name)}
                                    >
                                        <div class="flex justify-between items-center">
                                            <span class="font-bold text-white group-hover:text-green-400">{sug.name}</span>
                                            <span class="text-[10px] text-slate-500 font-mono bg-slate-950 px-1 rounded border border-slate-800">
                                                TAB
                                            </span>
                                        </div>
                                        <div class="text-[10px] text-slate-400 mt-1 flex gap-2">
                                            <span>{sug.description}</span>
                                            {sug.args.length > 0 && (
                                                <span class="text-yellow-600 font-mono">
                                                    [{sug.args.join('] [')}]
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer Hint */}
                <div class="bg-slate-800 px-2 pb-1 text-[10px] text-slate-500 text-center font-mono uppercase">
                    [ESC] Close • [↑/↓] History • [TAB] Auto
                </div>
            </div>
        </div>
    );
};