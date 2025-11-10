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
import { TournamentGroupParticipant } from "./TournamentGroupParticipant";
import { TournamentMatch } from "./TournamentMatch";

@Entity("tournament_groups")
export class TournamentGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "tournament_id" })
    tournamentId: number;

    @Column({ name: "stage_id", nullable: true })
    stageId?: number;

    @Column({ length: 255 })
    name: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => Tournament, tournament => tournament.groups)
    @JoinColumn({ name: "tournament_id" })
    tournament: Tournament;

    @ManyToOne(() => TournamentStage, stage => stage.groups, { nullable: true })
    @JoinColumn({ name: "stage_id" })
    stage?: TournamentStage;

    @OneToMany(() => TournamentGroupParticipant, participant => participant.group)
    participants: TournamentGroupParticipant[];

    @OneToMany(() => TournamentMatch, match => match.group)
    matches: TournamentMatch[];
}
