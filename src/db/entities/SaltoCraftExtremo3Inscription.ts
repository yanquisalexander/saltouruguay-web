import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Unique,
} from "typeorm";
import { User } from "./User";
import { Extremo3Player } from "./Extremo3Player";

@Entity("salto_craft_extremo3_inscriptions")
@Unique(["userId"])
export class SaltoCraftExtremo3Inscription {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "discord_username", nullable: true })
    discordUsername?: string;

    @Column({ name: "accepted_terms", default: false })
    acceptedTerms: boolean;

    @Column({ nullable: true })
    instagram?: string;

    @Column({ name: "participated_sc", nullable: true })
    participated_sc?: string;

    @Column({ name: "minecraft_username", nullable: true })
    minecraft_username?: string;

    @Column({ name: "team_status", nullable: true })
    team_status?: string;

    @Column({ name: "content_channel", nullable: true })
    content_channel?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.extremo3Inscriptions, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;

    @OneToMany(() => Extremo3Player, player => player.inscription)
    players: Extremo3Player[];
}
