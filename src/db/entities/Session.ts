import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("sessions")
export class Session {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "session_id", unique: true })
    sessionId: string;

    @Column({ name: "user_agent", type: "text" })
    userAgent: string;

    @Column({ type: "text" })
    ip: string;

    @Column({ name: "last_activity", type: "timestamp", nullable: true })
    lastActivity?: Date;

    @Column({ name: "two_factor_verified", default: false })
    twoFactorVerified: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.sessions)
    @JoinColumn({ name: "user_id" })
    user: User;
}
