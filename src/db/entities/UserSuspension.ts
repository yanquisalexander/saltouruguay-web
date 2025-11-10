import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from "typeorm";
import { User } from "./User";

@Entity("user_suspensions")
@Unique(["userId"])
export class UserSuspension {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ type: "text" })
    reason: string;

    @Column({ name: "start_date", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    startDate: Date;

    @Column({ name: "end_date", type: "timestamp", nullable: true })
    endDate?: Date;

    @Column({ name: "appeal_date", type: "timestamp", nullable: true })
    appealDate?: Date;

    @Column({ name: "appeal_message", type: "text", nullable: true })
    appealMessage?: string;

    @Column({ type: "text", default: "active" })
    status: string;

    @ManyToOne(() => User, user => user.suspensions)
    @JoinColumn({ name: "user_id" })
    user: User;
}
