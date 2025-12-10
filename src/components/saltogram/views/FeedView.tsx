import { useEffect } from "preact/hooks";
import StoriesRail from "../stories/StoriesRail";
import SaltogramFeed from "../SaltogramFeed";
import type { Session } from "@auth/core/types";

interface FeedViewProps {
    view: "home" | "explore";
    user?: Session["user"];
    path?: string;
}

export default function FeedView({ view, user }: FeedViewProps) {
    useEffect(() => {
        if (view === "home") {
            document.title = "Saltogram";
        } else {
            document.title = "Explorar - Saltogram";
        }
    }, [view]);

    return (
        <section className="space-y-6">
            <StoriesRail user={user} />
            <SaltogramFeed user={user} />
        </section>
    );
}
