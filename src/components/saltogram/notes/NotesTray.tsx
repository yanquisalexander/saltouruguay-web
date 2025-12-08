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

                // Filter out my note from the list to avoid duplication if I want to show it separately
                // But usually it's just in the list. However, for "Leave a note" UI, it's better to handle it explicitly.
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
        <div className="mb-2">
            <div className="flex gap-4 overflow-x-auto pt-14 pb-4 px-4 no-scrollbar">
                {/* My Note / Create Note */}
                <NoteBubble
                    user={user}
                    note={myNote}
                    isCurrentUser={true}
                    onClick={() => myNote ? setSelectedNote({ ...myNote, user }) : setIsModalOpen(true)}
                />

                {/* Friends Notes */}
                {notes.map(note => (
                    <NoteBubble
                        key={note.id}
                        user={note.user}
                        note={note}
                        onClick={() => setSelectedNote(note)}
                    />
                ))}
            </div>

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
                onDelete={fetchNotes}
                onReplace={() => {
                    setSelectedNote(null);
                    setIsModalOpen(true);
                }}
            />
        </div>
    );
}