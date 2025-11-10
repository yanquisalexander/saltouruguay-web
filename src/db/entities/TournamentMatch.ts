import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { Tournament } from "./Tournament";
import { TournamentStage } from "./TournamentStage";
import { TournamentRound } from "./TournamentRound";
import { TournamentGroup } from "./TournamentGroup";
import { TournamentMatchParticipant } from "./TournamentMatchParticipant";
import { TournamentGame } from "./TournamentGame";

@Entity("tournament_matches")
export class TournamentMatch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "tournament_id" })
    tournamentId: number;

    @Column({ name: "stage_id", nullable: true })
    stageId?: number;

    @Column({ name: "round_id" })
    roundId: number;

    @Column({ name: "group_id", nullable: true })
    groupId?: number;

    @Column({ name: "match_number" })
    matchNumber: number;

    @Column({ name: "best_of", default: 1, nullable: true })
    bestOf?: number;

    @Column({ default: "pending" })
    status: string;

    @Column({ name: "scheduled_time", type: "timestamp", nullable: true })
    scheduledTime?: Date;

    @Column({ name: "next_match_id", nullable: true })
    nextMatchId?: number;

    @Column({ name: "next_match_for_loser_id", nullable: true })
    nextMatchForLoserId?: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => Tournament, tournament => tournament.matches)
    @JoinColumn({ name: "tournament_id" })
    tournament: Tournament;

    @ManyToOne(() => TournamentStage, stage => stage.matches, { nullable: true })
    @JoinColumn({ name: "stage_id" })
    stage?: TournamentStage;

    @ManyToOne(() => TournamentRound, round => round.matches)
    @JoinColumn({ name: "round_id" })
    round: TournamentRound;

    @ManyToOne(() => TournamentGroup, group => group.matches, { nullable: true })
    @JoinColumn({ name: "group_id" })
    group?: TournamentGroup;

    @OneToMany(() => TournamentMatchParticipant, participant => participant.match)
    participants: TournamentMatchParticipant[];

    @OneToMany(() => TournamentGame, game => game.match)
    games: TournamentGame[];
}
