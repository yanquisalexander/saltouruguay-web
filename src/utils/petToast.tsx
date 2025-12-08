import { toast } from 'sonner';

export const petToast = {
    success: (message: string, emoji: string = '✨') => {
        toast.custom((t) => (
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3 min-w-[300px] animate-fade-in-up">
                <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-inner backdrop-blur-sm">
                    {emoji}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">¡Éxito!</h3>
                    <p className="text-white/90 text-xs font-medium">{message}</p>
                </div>
            </div>
        ));
    },
    error: (message: string, emoji: string = '❌') => {
        toast.custom((t) => (
            <div className="bg-gradient-to-r from-red-600 to-pink-600 border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3 min-w-[300px] animate-fade-in-up">
                <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-inner backdrop-blur-sm">
                    {emoji}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">Ups...</h3>
                    <p className="text-white/90 text-xs font-medium">{message}</p>
                </div>
            </div>
        ));
    },
    info: (message: string, emoji: string = 'ℹ️') => {
        toast.custom((t) => (
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3 min-w-[300px] animate-fade-in-up">
                <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-inner backdrop-blur-sm">
                    {emoji}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">Info</h3>
                    <p className="text-white/90 text-xs font-medium">{message}</p>
                </div>
            </div>
        ));
    }
};
