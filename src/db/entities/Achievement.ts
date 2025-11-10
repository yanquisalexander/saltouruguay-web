import {
    Entity,
    PrimaryColumn,
    Column,
    OneToMany,
} from "typeorm";
import { UserAchievement } from "./UserAchievement";

@Entity("achievements")
export class Achievement {
    @PrimaryColumn({ name: "achievement_id", type: "text" })
    achievementId: string;

    @Column({ name: "created_at", type: "text", nullable: true })
    createdAt?: string;

    @Column({ name: "updated_at", type: "text", nullable: true })
    updatedAt?: string;

    @OneToMany(() => UserAchievement, userAchievement => userAchievement.achievement)
    userAchievements: UserAchievement[];
}
