import { useEffect, useRef } from "preact/hooks";

type PollResult = Record<string, unknown>;

interface CoordinatedPollOptions {
  pollFn: () => Promise<PollResult | null>;
  onResult: (data: PollResult) => void;
  intervalMs: number;
  channelName: string;
  enabled: boolean;
  staleThresholdMs?: number;
}

export function useCoordinatedPoll({
  pollFn,
  onResult,
  intervalMs,
  channelName,
  enabled,
  staleThresholdMs = 15000,
}: CoordinatedPollOptions) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const lastResultRef = useRef<PollResult | null>(null);
  const pollFnRef = useRef(pollFn);
  const onResultRef = useRef(onResult);

  pollFnRef.current = pollFn;
  onResultRef.current = onResult;

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data?.type === "poll-result") {
        lastBroadcastRef.current = Date.now();
        lastResultRef.current = event.data.payload;
        onResultRef.current(event.data.payload);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [channelName, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const doPoll = async () => {
      // If another tab broadcasted recently, skip this poll
      if (Date.now() - lastBroadcastRef.current < staleThresholdMs) {
        return;
      }

      try {
        const result = await pollFnRef.current();
        if (result) {
          lastResultRef.current = result;
          lastBroadcastRef.current = Date.now();
          channelRef.current?.postMessage({
            type: "poll-result",
            payload: result,
          });
          onResultRef.current(result);
        }
      } catch {
        // Silencio
      }
    };

    doPoll();
    const id = setInterval(doPoll, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled, staleThresholdMs]);
}
