import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from "typeorm";

@Entity("custom_pages")
@Unique("slug", ["slug"])
@Unique("permalink", ["permalink"])
export class CustomPage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ unique: true })
    slug: string;

    @Column({ unique: true })
    permalink: string;

    @Column({ type: "text" })
    content: string;

    @Column({ name: "is_public", default: false })
    isPublic: boolean;

    @Column({ name: "is_draft", default: true })
    isDraft: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
}
