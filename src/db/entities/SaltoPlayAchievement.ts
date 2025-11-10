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
import { SaltoPlayGame } from "./SaltoPlayGame";
import { SaltoTagAchievement } from "./SaltoTagAchievement";

@Entity("salto_play_achievements")
export class SaltoPlayAchievement {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "game_id" })
    gameId: string;

    @Column()
    name: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ nullable: true })
    icon?: string;

    @Column({ name: "xp_reward", default: 100 })
    xpReward: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => SaltoPlayGame, game => game.achievements, { onDelete: "CASCADE" })
    @JoinColumn({ name: "game_id" })
    game: SaltoPlayGame;

    @OneToMany(() => SaltoTagAchievement, tagAchievement => tagAchievement.achievement)
    saltoTagAchievements: SaltoTagAchievement[];
}
