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
import { User } from "./User";
import { SaltoTagAchievement } from "./SaltoTagAchievement";

@Entity("salto_tags")
export class SaltoTag {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "salto_tag", unique: true })
    saltoTag: string;

    @Column()
    discriminator: string;

    @Column({ nullable: true })
    avatar?: string;

    @Column({ name: "total_xp", default: 0 })
    totalXP: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.saltoTags, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user?: User;

    @OneToMany(() => SaltoTagAchievement, achievement => achievement.saltoTag)
    achievements: SaltoTagAchievement[];
}
