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
import { SaltoCraftExtremo3Inscription } from "./SaltoCraftExtremo3Inscription";
import { Extremo3RepechajeVote } from "./Extremo3RepechajeVote";

@Entity("extremo3_players")
@Unique(["inscriptionId"])
export class Extremo3Player {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "inscription_id", nullable: true })
    inscriptionId?: number;

    @Column({ name: "is_confirmed_player", default: false })
    isConfirmedPlayer: boolean;

    @Column({ name: "is_repechaje", default: false })
    isRepechaje: boolean;

    @Column({ name: "lives_count", default: 3 })
    livesCount: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => SaltoCraftExtremo3Inscription, inscription => inscription.players, { nullable: true })
    @JoinColumn({ name: "inscription_id" })
    inscription?: SaltoCraftExtremo3Inscription;

    @OneToMany(() => Extremo3RepechajeVote, vote => vote.player)
    repechajeVotes: Extremo3RepechajeVote[];
}
