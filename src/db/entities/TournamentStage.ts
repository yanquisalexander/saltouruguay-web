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
import { TournamentGroup } from "./TournamentGroup";
import { TournamentMatch } from "./TournamentMatch";

@Entity("tournament_stages")
export class TournamentStage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "tournament_id" })
    tournamentId: number;

    @Column({ length: 255 })
    name: string;

    @Column({ name: "stage_type" })
    stageType: string;

    @Column()
    order: number;

    @Column({ default: "pending" })
    status: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => Tournament, tournament => tournament.stages)
    @JoinColumn({ name: "tournament_id" })
    tournament: Tournament;

    @OneToMany(() => TournamentGroup, group => group.stage)
    groups: TournamentGroup[];

    @OneToMany(() => TournamentMatch, match => match.stage)
    matches: TournamentMatch[];
}
