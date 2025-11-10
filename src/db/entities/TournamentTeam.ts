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
import { TournamentTeamMember } from "./TournamentTeamMember";
import { TournamentParticipant } from "./TournamentParticipant";

@Entity("tournament_teams")
export class TournamentTeam {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ nullable: true })
    logo?: string;

    @Column({ name: "captain_id" })
    captainId: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.captainedTeams)
    @JoinColumn({ name: "captain_id" })
    captain: User;

    @OneToMany(() => TournamentTeamMember, member => member.team)
    members: TournamentTeamMember[];

    @OneToMany(() => TournamentParticipant, participant => participant.team)
    participants: TournamentParticipant[];
}
