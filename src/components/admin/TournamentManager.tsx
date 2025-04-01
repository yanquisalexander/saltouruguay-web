import { TournamentMatchStatus, TournamentStatus, TournamentType, TournamentParticipantStatus } from "@/consts/Torneos"



export const TournamentManager = () => {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Tournament Manager</h1>
            <p className="text-sm text-gray-500">Manage your tournaments here.</p>
            <div className="flex flex-col gap-4">
                <button className="btn btn-primary">Create Tournament</button>
                <button className="btn btn-secondary">View Tournaments</button>
            </div>
        </div>
    )
}