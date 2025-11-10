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

@Entity("tournament_games")
export class TournamentGame {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "match_id" })
    matchId: number;

    @Column({ name: "game_number" })
    gameNumber: number;

    @Column({ name: "winner_id", nullable: true })
    winnerId?: number;

    @Column({ type: "jsonb", default: {} })
    details: Record<string, any>;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => TournamentMatch, match => match.games)
    @JoinColumn({ name: "match_id" })
    match: TournamentMatch;

    @ManyToOne(() => TournamentParticipant, participant => participant.wonGames, { nullable: true })
    @JoinColumn({ name: "winner_id" })
    winner?: TournamentParticipant;
}
