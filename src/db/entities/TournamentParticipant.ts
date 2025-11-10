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
import { User } from "./User";
import { TournamentTeam } from "./TournamentTeam";
import { TournamentGroupParticipant } from "./TournamentGroupParticipant";
import { TournamentMatchParticipant } from "./TournamentMatchParticipant";
import { TournamentGame } from "./TournamentGame";

@Entity("tournament_participants")
export class TournamentParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "tournament_id" })
    tournamentId: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "team_id", nullable: true })
    teamId?: number;

    @Column({ name: "display_name", length: 255 })
    displayName: string;

    @Column({ nullable: true })
    seed?: number;

    @Column({ default: "pending" })
    status: string;

    @Column({ name: "checked_in", default: false })
    checkedIn: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => Tournament, tournament => tournament.participants)
    @JoinColumn({ name: "tournament_id" })
    tournament: Tournament;

    @ManyToOne(() => User, user => user.tournamentParticipations, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;

    @ManyToOne(() => TournamentTeam, team => team.participants, { nullable: true })
    @JoinColumn({ name: "team_id" })
    team?: TournamentTeam;

    @OneToMany(() => TournamentGroupParticipant, groupParticipant => groupParticipant.participant)
    groupParticipants: TournamentGroupParticipant[];

    @OneToMany(() => TournamentMatchParticipant, matchParticipant => matchParticipant.participant)
    matchParticipants: TournamentMatchParticipant[];

    @OneToMany(() => TournamentGame, game => game.winner)
    wonGames: TournamentGame[];
}
