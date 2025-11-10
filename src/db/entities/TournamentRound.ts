import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { Tournament } from "./Tournament";
import { TournamentStage } from "./TournamentStage";
import { TournamentMatch } from "./TournamentMatch";

@Entity("tournament_rounds")
export class TournamentRound {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "tournament_id" })
    tournamentId: number;

    @Column({ name: "stage_id", nullable: true })
    stageId?: number;

    @Column()
    number: number;

    @Column({ length: 255, nullable: true })
    name?: string;

    @Column({ default: "pending" })
    status: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => Tournament, tournament => tournament.rounds)
    @JoinColumn({ name: "tournament_id" })
    tournament: Tournament;

    @ManyToOne(() => TournamentStage, { nullable: true })
    @JoinColumn({ name: "stage_id" })
    stage?: TournamentStage;

    @OneToMany(() => TournamentMatch, match => match.round)
    matches: TournamentMatch[];
}
