import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { SaltoPlayDeveloper } from "./SaltoPlayDeveloper";
import { SaltoPlayGameToken } from "./SaltoPlayGameToken";
import { SaltoPlayAuthorizationCode } from "./SaltoPlayAuthorizationCode";
import { SaltoPlayAchievement } from "./SaltoPlayAchievement";

@Entity("salto_play_games")
export class SaltoPlayGame {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ name: "developer_id" })
    developerId: string;

    @Column({ nullable: true })
    icon?: string;

    @Column({ nullable: true })
    url?: string;

    @Column({ type: "varchar", default: "pending" })
    status: "pending" | "approved" | "banned";

    @Column({ name: "client_secret" })
    clientSecret: string;

    @Column({ name: "redirect_uri" })
    redirectUri: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => SaltoPlayDeveloper, developer => developer.games, { onDelete: "CASCADE" })
    @JoinColumn({ name: "developer_id" })
    developer: SaltoPlayDeveloper;

    @OneToMany(() => SaltoPlayGameToken, token => token.game)
    tokens: SaltoPlayGameToken[];

    @OneToMany(() => SaltoPlayAuthorizationCode, code => code.game)
    authorizationCodes: SaltoPlayAuthorizationCode[];

    @OneToMany(() => SaltoPlayAchievement, achievement => achievement.game)
    achievements: SaltoPlayAchievement[];
}
