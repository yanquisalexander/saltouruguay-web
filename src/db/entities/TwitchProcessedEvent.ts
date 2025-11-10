import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
} from "typeorm";

@Entity("twitch_processed_events")
export class TwitchProcessedEvent {
    @PrimaryColumn({ name: "message_id", type: "text" })
    messageId: string;

    @Column({ name: "event_type", type: "text" })
    eventType: string;

    @Column({ name: "processed_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    processedAt: Date;

    @Column({ name: "user_id", nullable: true })
    userId?: number;

    @Column({ name: "event_data", type: "text", nullable: true })
    eventData?: string;
}
