import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToOne,
    JoinColumn,
} from "typeorm";
import { StreamerWarsTeam } from "./StreamerWarsTeam";
import { StreamerWarsPlayer } from "./StreamerWarsPlayer";

@Entity("streamer_wars_team_players")
export class StreamerWarsTeamPlayer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "team_id", nullable: true })
    teamId?: number;

    @Column({ name: "player_number", nullable: true })
    playerNumber?: number;

    @Column({ name: "is_captain", default: false })
    isCaptain: boolean;

    @ManyToOne(() => StreamerWarsTeam, team => team.players, { nullable: true })
    @JoinColumn({ name: "team_id" })
    team?: StreamerWarsTeam;

    @OneToOne(() => StreamerWarsPlayer, player => player.teamPlayer, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "player_number" })
    player?: StreamerWarsPlayer;
}
