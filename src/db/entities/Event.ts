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
import { EventOrganizer } from "./EventOrganizer";
import { EventAssistant } from "./EventAssistant";

@Entity("events")
export class Event {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ nullable: true })
    cover?: string;

    @Column({ type: "varchar", array: true, nullable: true })
    tags?: string[];

    @Column({ name: "main_organizer_id" })
    mainOrganizerId: number;

    @Column({ default: false })
    featured: boolean;

    @Column({ nullable: true })
    location?: string;

    @Column({ nullable: true })
    platform?: string;

    @Column({ nullable: true })
    url?: string;

    @Column({ name: "important_info", type: "text", nullable: true })
    importantInfo?: string;

    @Column({ name: "start_date", type: "timestamp" })
    startDate: Date;

    @Column({ name: "end_date", type: "timestamp", nullable: true })
    endDate?: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.organizedEvents)
    @JoinColumn({ name: "main_organizer_id" })
    mainOrganizer: User;

    @OneToMany(() => EventOrganizer, organizer => organizer.event)
    additionalOrganizers: EventOrganizer[];

    @OneToMany(() => EventAssistant, assistant => assistant.event)
    assistants: EventAssistant[];
}
