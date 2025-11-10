import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { TournamentMatch } from "./TournamentMatch";
import { TournamentParticipant } from "./TournamentParticipant";

@Entity("tournament_match_participants")
export class TournamentMatchParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "match_id" })
    matchId: number;

    @Column({ name: "participant_id" })
    participantId: number;

    @Column({ default: 0 })
    position: number;

    @Column({ default: 0 })
    score: number;

    @Column({ name: "is_winner", default: false })
    isWinner: boolean;

    @Column({ default: "pending" })
    status: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => TournamentMatch, match => match.participants)
    @JoinColumn({ name: "match_id" })
    match: TournamentMatch;

    @ManyToOne(() => TournamentParticipant, participant => participant.matchParticipants)
    @JoinColumn({ name: "participant_id" })
    participant: TournamentParticipant;
}
