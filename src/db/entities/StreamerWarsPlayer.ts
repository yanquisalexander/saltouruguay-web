import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
    Unique,
} from "typeorm";
import { User } from "./User";
import { StreamerWarsChatMessage } from "./StreamerWarsChatMessage";
import { StreamerWarsTeamPlayer } from "./StreamerWarsTeamPlayer";
import { NegativeVoteStreamer } from "./NegativeVoteStreamer";

@Entity("streamer_wars_players")
@Unique(["userId", "playerNumber"])
export class StreamerWarsPlayer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "player_number", unique: true })
    playerNumber: number;

    @Column({ default: false })
    eliminated: boolean;

    @Column({ default: false })
    aislated: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.streamerWarsPlayer, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;

    @OneToMany(() => StreamerWarsChatMessage, message => message.user)
    messages: StreamerWarsChatMessage[];

    @OneToOne(() => StreamerWarsTeamPlayer, teamPlayer => teamPlayer.player)
    teamPlayer: StreamerWarsTeamPlayer;

    @OneToMany(() => NegativeVoteStreamer, vote => vote.player)
    negativeVotes: NegativeVoteStreamer[];
}
