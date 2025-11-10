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
import { Extremo3Player } from "./Extremo3Player";

@Entity("extremo3_repechaje_votes")
@Unique(["userId", "playerId"])
export class Extremo3RepechajeVote {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "player_id" })
    playerId: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => User, user => user.extremo3RepechajeVotes)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => Extremo3Player, player => player.repechajeVotes)
    @JoinColumn({ name: "player_id" })
    player: Extremo3Player;
}
