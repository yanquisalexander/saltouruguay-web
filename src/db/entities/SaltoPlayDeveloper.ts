import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { User } from "./User";
import { SaltoPlayGame } from "./SaltoPlayGame";

@Entity("salto_play_developers")
export class SaltoPlayDeveloper {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "user_id", unique: true })
    userId: number;

    @Column({ name: "developer_name" })
    developerName: string;

    @Column({ name: "developer_url" })
    developerUrl: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @OneToOne(() => User, user => user.saltoPlayDeveloper, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @OneToMany(() => SaltoPlayGame, game => game.developer)
    games: SaltoPlayGame[];
}
