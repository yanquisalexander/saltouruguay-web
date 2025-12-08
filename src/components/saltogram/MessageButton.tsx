import { h, Fragment } from 'preact';
import { useChatStore } from '@/stores/chatStore';
import { LucideMessageCircle } from 'lucide-preact';

interface MessageButtonProps {
    user: any;
}

export default function MessageButton({ user }: MessageButtonProps) {
    const { openChat } = useChatStore();

    return (
        <Fragment>
            {/* Desktop Button */}
            <button
                onClick={() => openChat(user)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
            >
                <LucideMessageCircle size={20} />
                <span>Mensaje</span>
            </button>

            {/* Mobile Button */}
            <a
                href={`/saltogram/direct/${user.id}`}
                className="md:hidden flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
            >
                <LucideMessageCircle size={20} />
                <span>Mensaje</span>
            </a>
        </Fragment>
    );
}
