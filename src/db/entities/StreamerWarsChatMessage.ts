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

@Entity("streamer_wars_chat_messages")
export class StreamerWarsChatMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ type: "text" })
    message: string;

    @Column({ name: "is_announcement", default: false })
    isAnnouncement: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.streamerWarsChatMessages, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;
}
