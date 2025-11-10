import {
    Entity,
    PrimaryColumn,
    Column,
    UpdateDateColumn,
} from "typeorm";

@Entity("member_cards")
export class MemberCard {
    @PrimaryColumn({ name: "user_id" })
    userId: string;

    @Column({ type: "text", array: true })
    stickers: string[];

    @Column({ default: "classic" })
    skin: string;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}
