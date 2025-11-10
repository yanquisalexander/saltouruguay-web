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
import { Achievement } from "./Achievement";

@Entity("user_achievements")
@Unique(["userId", "achievementId"])
export class UserAchievement {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "achievement_id", type: "text", nullable: true })
    achievementId?: string;

    @Column({ name: "unlocked_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    unlockedAt: Date;

    @ManyToOne(() => User, user => user.achievements, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user?: User;

    @ManyToOne(() => Achievement, achievement => achievement.userAchievements, { nullable: true })
    @JoinColumn({ name: "achievement_id" })
    achievement?: Achievement;
}
