import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { SaltoPlayGame } from "./SaltoPlayGame";
import { User } from "./User";

@Entity("salto_play_authorization_codes")
export class SaltoPlayAuthorizationCode {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "game_id" })
    gameId: string;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ unique: true })
    code: string;

    @Column()
    scopes: string;

    @Column({ name: "redirect_uri" })
    redirectUri: string;

    @Column({ name: "expires_at", type: "timestamp" })
    expiresAt: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => SaltoPlayGame, game => game.authorizationCodes, { onDelete: "CASCADE" })
    @JoinColumn({ name: "game_id" })
    game: SaltoPlayGame;

    @ManyToOne(() => User, user => user.saltoPlayAuthorizationCodes, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;
}
