import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { TournamentTeam } from "./TournamentTeam";
import { User } from "./User";

@Entity("tournament_team_members")
export class TournamentTeamMember {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "team_id" })
    teamId: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ length: 50, default: "member", nullable: true })
    role?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => TournamentTeam, team => team.members)
    @JoinColumn({ name: "team_id" })
    team: TournamentTeam;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;
}
