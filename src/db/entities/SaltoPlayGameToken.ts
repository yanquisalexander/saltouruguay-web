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
import { SaltoPlayGame } from "./SaltoPlayGame";
import { User } from "./User";

@Entity("salto_play_game_tokens")
@Unique("game_user_idx", ["gameId", "userId"])
export class SaltoPlayGameToken {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "game_id" })
    gameId: string;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "access_token", unique: true })
    accessToken: string;

    @Column({ name: "refresh_token", unique: true })
    refreshToken: string;

    @Column()
    scopes: string;

    @Column({ name: "expires_at", type: "timestamp" })
    expiresAt: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => SaltoPlayGame, game => game.tokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "game_id" })
    game: SaltoPlayGame;

    @ManyToOne(() => User, user => user.saltoPlayGameTokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;
}
