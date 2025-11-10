import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from "typeorm";
import { Event } from "./Event";
import { User } from "./User";

@Entity("event_assistants")
@Unique(["eventId", "userId"])
export class EventAssistant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "event_id" })
    eventId: number;

    @Column({ name: "user_id" })
    userId: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => Event, event => event.assistants)
    @JoinColumn({ name: "event_id" })
    event: Event;

    @ManyToOne(() => User, user => user.eventAssistances)
    @JoinColumn({ name: "user_id" })
    user: User;
}
