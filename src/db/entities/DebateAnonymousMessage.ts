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

@Entity("debate_anonymous_messages")
export class DebateAnonymousMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ type: "text" })
    message: string;

    @Column({ name: "approved_at", type: "timestamp", nullable: true })
    approvedAt?: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.debateMessages, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;
}
