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
import { User } from "./User";
import { TournamentParticipant } from "./TournamentParticipant";
import { TournamentStage } from "./TournamentStage";
import { TournamentGroup } from "./TournamentGroup";
import { TournamentRound } from "./TournamentRound";
import { TournamentMatch } from "./TournamentMatch";

@Entity("tournaments")
export class Tournament {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ name: "tournament_type" })
    tournamentType: string;

    @Column({ name: "max_participants", default: 100, nullable: true })
    maxParticipants?: number;

    @Column({ name: "organizer_id" })
    organizerId: number;

    @Column({ name: "is_public", default: false })
    isPublic: boolean;

    @Column({ name: "signup_end_date", type: "timestamp", nullable: true })
    signupEndDate?: Date;

    @Column({ name: "start_date", type: "timestamp", nullable: true })
    startDate?: Date;

    @Column({ name: "end_date", type: "timestamp", nullable: true })
    endDate?: Date;

    @Column({ default: "draft" })
    status: string;

    @Column({ type: "jsonb", default: {} })
    config: Record<string, any>;

    @Column({ name: "game_name", length: 255, nullable: true })
    gameName?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.organizedTournaments)
    @JoinColumn({ name: "organizer_id" })
    organizer: User;

    @OneToMany(() => TournamentParticipant, participant => participant.tournament)
    participants: TournamentParticipant[];

    @OneToMany(() => TournamentStage, stage => stage.tournament)
    stages: TournamentStage[];

    @OneToMany(() => TournamentGroup, group => group.tournament)
    groups: TournamentGroup[];

    @OneToMany(() => TournamentRound, round => round.tournament)
    rounds: TournamentRound[];

    @OneToMany(() => TournamentMatch, match => match.tournament)
    matches: TournamentMatch[];
}
