import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { SaltoTag } from "./SaltoTag";
import { SaltoPlayAchievement } from "./SaltoPlayAchievement";

@Entity("salto_tag_achievements")
export class SaltoTagAchievement {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "salto_tag_id" })
    saltoTagId: number;

    @Column({ name: "achievement_id" })
    achievementId: string;

    @Column({ name: "unlocked_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    unlockedAt: Date;

    @ManyToOne(() => SaltoTag, saltoTag => saltoTag.achievements, { onDelete: "CASCADE" })
    @JoinColumn({ name: "salto_tag_id" })
    saltoTag: SaltoTag;

    @ManyToOne(() => SaltoPlayAchievement, achievement => achievement.saltoTagAchievements, { onDelete: "CASCADE" })
    @JoinColumn({ name: "achievement_id" })
    achievement: SaltoPlayAchievement;
}
