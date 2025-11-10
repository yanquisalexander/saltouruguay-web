import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
} from "typeorm";
import { StreamerWarsTeamPlayer } from "./StreamerWarsTeamPlayer";

@Entity("streamer_wars_teams")
export class StreamerWarsTeam {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    color: string;

    @OneToMany(() => StreamerWarsTeamPlayer, player => player.team)
    players: StreamerWarsTeamPlayer[];
}
