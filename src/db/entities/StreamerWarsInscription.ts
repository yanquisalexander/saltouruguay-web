import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from "typeorm";
import { User } from "./User";

@Entity("streamer_wars_inscriptions")
@Unique(["userId"])
export class StreamerWarsInscription {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "discord_username", nullable: true })
    discordUsername?: string;

    @Column({ name: "accepted_terms", default: false })
    acceptedTerms: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.streamerWarsInscriptions, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;
}
