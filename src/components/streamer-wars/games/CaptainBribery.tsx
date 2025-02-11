import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import type Pusher from "pusher-js";

interface Props {
    session: Session;
    players: any;
    pusher: Pusher;
    channel: Channel;
}

export const CaptainBribery = ({ session, players, pusher, channel }: Props) => {
    return (
        <div>
            <h1>Captain Bribery</h1>
        </div>
    );
}