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
import { StreamerWarsPlayer } from "./StreamerWarsPlayer";

@Entity("negative_votes_streamers")
@Unique(["userId", "playerNumber"])
export class NegativeVoteStreamer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "player_number", nullable: true })
    playerNumber?: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.negativeVotesStreamers, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;

    @ManyToOne(() => StreamerWarsPlayer, player => player.negativeVotes, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "player_number" })
    player?: StreamerWarsPlayer;
}
