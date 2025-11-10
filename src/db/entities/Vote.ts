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
import { User } from "./User";

@Entity("votes")
@Unique(["userId", "nomineeId", "categoryId"])
export class Vote {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "nominee_id", type: "text" })
    nomineeId: string;

    @Column({ name: "category_id", type: "text" })
    categoryId: string;

    @Column()
    ranking: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.votes)
    @JoinColumn({ name: "user_id" })
    user: User;
}
