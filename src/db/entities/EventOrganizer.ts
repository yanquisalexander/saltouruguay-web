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

@Entity("event_organizers")
@Unique(["eventId", "userId"])
export class EventOrganizer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "event_id" })
    eventId: number;

    @Column({ name: "user_id" })
    userId: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => Event, event => event.additionalOrganizers)
    @JoinColumn({ name: "event_id" })
    event: Event;

    @ManyToOne(() => User, user => user.eventOrganizations)
    @JoinColumn({ name: "user_id" })
    user: User;
}
