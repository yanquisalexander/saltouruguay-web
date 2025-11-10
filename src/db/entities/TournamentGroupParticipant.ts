import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { TournamentGroup } from "./TournamentGroup";
import { TournamentParticipant } from "./TournamentParticipant";

@Entity("tournament_group_participants")
export class TournamentGroupParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "group_id" })
    groupId: number;

    @Column({ name: "participant_id" })
    participantId: number;

    @Column({ type: "jsonb", default: {} })
    stats: Record<string, any>;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => TournamentGroup, group => group.participants)
    @JoinColumn({ name: "group_id" })
    group: TournamentGroup;

    @ManyToOne(() => TournamentParticipant, participant => participant.groupParticipants)
    @JoinColumn({ name: "participant_id" })
    participant: TournamentParticipant;
}
