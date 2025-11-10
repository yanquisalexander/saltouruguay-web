import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    OneToOne,
} from "typeorm";
import { UserSuspension } from "./UserSuspension";
import { Session } from "./Session";
import { SaltoTag } from "./SaltoTag";
import { SaltoPlayDeveloper } from "./SaltoPlayDeveloper";
import { SaltoPlayGameToken } from "./SaltoPlayGameToken";
import { SaltoPlayAuthorizationCode } from "./SaltoPlayAuthorizationCode";
import { TournamentTeam } from "./TournamentTeam";
import { TournamentParticipant } from "./TournamentParticipant";
import { Tournament } from "./Tournament";
import { Event } from "./Event";
import { EventOrganizer } from "./EventOrganizer";
import { EventAssistant } from "./EventAssistant";
import { Vote } from "./Vote";
import { UserAchievement } from "./UserAchievement";
import { Loan } from "./Loan";
import { DebateAnonymousMessage } from "./DebateAnonymousMessage";
import { SaltoCraftExtremo3Inscription } from "./SaltoCraftExtremo3Inscription";
import { Extremo3RepechajeVote } from "./Extremo3RepechajeVote";
import { StreamerWarsInscription } from "./StreamerWarsInscription";
import { StreamerWarsPlayer } from "./StreamerWarsPlayer";
import { StreamerWarsChatMessage } from "./StreamerWarsChatMessage";
import { NegativeVoteStreamer } from "./NegativeVoteStreamer";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column({ name: "twitch_id", unique: true, nullable: true })
    twitchId?: string;

    @Column({ name: "display_name" })
    displayName: string;

    @Column()
    username: string;

    @Column({ nullable: true })
    avatar?: string;

    @Column({ name: "twitch_tier", nullable: true })
    twitchTier?: number;

    @Column({ name: "discord_id", unique: true, nullable: true })
    discordId?: string;

    @Column({ default: false })
    admin: boolean;

    @Column({ name: "played_system_cinematics", type: "text", array: true, default: [] })
    playedSystemCinematics: string[];

    @Column({ default: 0 })
    coins: number;

    @Column({ name: "two_factor_enabled", default: false })
    twoFactorEnabled: boolean;

    @Column({ name: "two_factor_secret", nullable: true })
    twoFactorSecret?: string;

    @Column({ name: "two_factor_recovery_codes", type: "text", array: true, nullable: true })
    twoFactorRecoveryCodes?: string[];

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    // Relations
    @OneToMany(() => UserSuspension, suspension => suspension.user)
    suspensions: UserSuspension[];

    @OneToMany(() => Session, session => session.user)
    sessions: Session[];

    @OneToMany(() => SaltoTag, saltoTag => saltoTag.user)
    saltoTags: SaltoTag[];

    @OneToOne(() => SaltoPlayDeveloper, developer => developer.user)
    saltoPlayDeveloper: SaltoPlayDeveloper;

    @OneToMany(() => SaltoPlayGameToken, token => token.user)
    saltoPlayGameTokens: SaltoPlayGameToken[];

    @OneToMany(() => SaltoPlayAuthorizationCode, code => code.user)
    saltoPlayAuthorizationCodes: SaltoPlayAuthorizationCode[];

    @OneToMany(() => TournamentTeam, team => team.captain)
    captainedTeams: TournamentTeam[];

    @OneToMany(() => TournamentParticipant, participant => participant.user)
    tournamentParticipations: TournamentParticipant[];

    @OneToMany(() => Tournament, tournament => tournament.organizer)
    organizedTournaments: Tournament[];

    @OneToMany(() => Event, event => event.mainOrganizer)
    organizedEvents: Event[];

    @OneToMany(() => EventOrganizer, organizer => organizer.user)
    eventOrganizations: EventOrganizer[];

    @OneToMany(() => EventAssistant, assistant => assistant.user)
    eventAssistances: EventAssistant[];

    @OneToMany(() => Vote, vote => vote.user)
    votes: Vote[];

    @OneToMany(() => UserAchievement, achievement => achievement.user)
    achievements: UserAchievement[];

    @OneToMany(() => Loan, loan => loan.lender)
    lentLoans: Loan[];

    @OneToMany(() => Loan, loan => loan.borrower)
    borrowedLoans: Loan[];

    @OneToMany(() => DebateAnonymousMessage, message => message.user)
    debateMessages: DebateAnonymousMessage[];

    @OneToMany(() => SaltoCraftExtremo3Inscription, inscription => inscription.user)
    extremo3Inscriptions: SaltoCraftExtremo3Inscription[];

    @OneToMany(() => Extremo3RepechajeVote, vote => vote.user)
    extremo3RepechajeVotes: Extremo3RepechajeVote[];

    @OneToMany(() => StreamerWarsInscription, inscription => inscription.user)
    streamerWarsInscriptions: StreamerWarsInscription[];

    @OneToOne(() => StreamerWarsPlayer, player => player.user)
    streamerWarsPlayer: StreamerWarsPlayer;

    @OneToMany(() => StreamerWarsChatMessage, message => message.user)
    streamerWarsChatMessages: StreamerWarsChatMessage[];

    @OneToMany(() => NegativeVoteStreamer, vote => vote.user)
    negativeVotesStreamers: NegativeVoteStreamer[];
}
