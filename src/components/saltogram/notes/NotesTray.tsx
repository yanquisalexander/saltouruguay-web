import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import NoteBubble from "./NoteBubble";
import CreateNoteModal from "./CreateNoteModal";
import NoteBottomSheet from "./NoteBottomSheet";

interface NotesTrayProps {
    user?: any;
}

export default function NotesTray({ user }: NotesTrayProps) {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [myNote, setMyNote] = useState<any | null>(null);
    const [selectedNote, setSelectedNote] = useState<any | null>(null);

    const fetchNotes = async () => {
        try {
            const { data, error } = await actions.notes.getFeed();
            if (data) {
                const allNotes = data.notes;
                const mine = allNotes.find((n: any) => n.userId === Number(user?.id));
                setMyNote(mine || null);
                setNotes(allNotes.filter((n: any) => n.userId !== Number(user?.id)));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotes();
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className="relative w-full z-10">
            {/* Contenedor con scroll horizontal y padding ajustado para las burbujas flotantes */}
            <div className="flex gap-2 overflow-x-auto pt-6 pb-2 px-4 no-scrollbar items-start scroll-smooth mask-linear-fade">

                {/* Skeleton Loader */}
                {loading && (
                    <div className="flex gap-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col items-center gap-3 w-[84px] pt-8">
                                <div className="w-[68px] h-[68px] rounded-full bg-white/5 border border-white/5"></div>
                                <div className="h-2 w-12 bg-white/5 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && (
                    <>
                        {/* My Note / Create Note */}
                        <NoteBubble
                            user={user}
                            note={myNote}
                            isCurrentUser={true}
                            onClick={() => myNote ? setSelectedNote({ ...myNote, user }) : setIsModalOpen(true)}
                        />

                        {/* Divider sutil si hay notas de amigos */}
                        {notes.length > 0 && (
                            <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center mx-1"></div>
                        )}

                        {/* Friends Notes */}
                        {notes.map(note => (
                            <NoteBubble
                                key={note.id}
                                user={note.user}
                                note={note}
                                onClick={() => setSelectedNote(note)}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Modals & Sheets */}
            <CreateNoteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => {
                    setIsModalOpen(false);
                    fetchNotes();
                }}
                existingNote={myNote}
            />

            <NoteBottomSheet
                note={selectedNote}
                onClose={() => setSelectedNote(null)}
                currentUser={user}
                onDelete={() => {
                    setSelectedNote(null);
                    fetchNotes();
                }}
                onReplace={() => {
                    setSelectedNote(null);
                    setIsModalOpen(true);
                }}
            />
        </div>
    );
}