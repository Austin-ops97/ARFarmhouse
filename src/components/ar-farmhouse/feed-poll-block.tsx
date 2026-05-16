"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Check, Clock } from "lucide-react";
import { useMemo } from "react";

import { isPollExpired, pollOptionPercent } from "@/lib/poll-vote-counts";
import type { UiPollData } from "@/models/feed-post";
import { cn } from "@/lib/utils";

function formatExpiresLabel(expiresAtMs: number | null): string | null {
  if (expiresAtMs == null) return null;
  const d = new Date(expiresAtMs);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function FeedPollBlock({
  poll,
  myOptionIds,
  canVote,
  voteBusy,
  voteError,
  onVote,
}: {
  poll: UiPollData;
  myOptionIds: string[];
  canVote: boolean;
  voteBusy: boolean;
  voteError: string | null;
  onVote: (optionId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const expired = poll.expired || isPollExpired(poll.expiresAtMs);
  const total = poll.totalVotes;
  const hasVoted = myOptionIds.length > 0;
  const showResults = hasVoted || expired || total > 0;
  const expiresLabel = formatExpiresLabel(poll.expiresAtMs);

  const statusLine = useMemo(() => {
    if (expired) return "Poll ended — results are final";
    if (poll.allowMultiple) return "Select one or more options";
    return hasVoted ? "Tap another option to change your vote" : "Tap an option to vote";
  }, [expired, hasVoted, poll.allowMultiple]);

  return (
    <motion.div
      layout={false}
      className="ar-surface-inset rounded-[1.5rem] px-4 py-5 sm:rounded-[1.75rem] sm:px-5 sm:py-6"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          <BarChart3 className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">{poll.question}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{statusLine}</p>
        </div>
      </motion.div>

      {(expired || expiresLabel) && (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs",
            expired
              ? "border-amber-500/25 bg-amber-500/10 text-amber-100/95"
              : "border-white/10 bg-white/[0.03] text-muted-foreground"
          )}
        >
          <Clock className="size-3.5 shrink-0 opacity-80" aria-hidden />
          {expired ? (
            <span>Poll ended{expiresLabel ? ` · ${expiresLabel}` : ""}</span>
          ) : (
            <span>Ends {expiresLabel}</span>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {poll.options.map((option) => {
          const selected = myOptionIds.includes(option.id);
          const pct = pollOptionPercent(option.voteCount, total);
          const barWidth = showResults ? Math.max(selected ? 6 : 4, pct) : 0;

          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={!canVote || voteBusy}
                onClick={() => onVote(option.id)}
                className={cn(
                  "group relative w-full overflow-hidden rounded-2xl border text-left transition-colors",
                  "min-h-11 px-3.5 py-2.5 sm:min-h-10",
                  selected
                    ? "border-primary/40 bg-primary/[0.12]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]",
                  (!canVote || voteBusy) && "cursor-default",
                  expired && !selected && "opacity-90"
                )}
              >
                <AnimatePresence initial={false}>
                  {showResults && (
                    <motion.span
                      key={`bar-${option.id}-${barWidth}`}
                      className={cn(
                        "pointer-events-none absolute inset-y-0 left-0 rounded-2xl",
                        selected ? "bg-primary/20" : "bg-white/[0.06]"
                      )}
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                      aria-hidden
                    />
                  )}
                </AnimatePresence>

                <span className="relative z-[1] flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/20 bg-transparent group-hover:border-white/30"
                    )}
                    aria-hidden
                  >
                    {selected && <Check className="size-3" strokeWidth={2.5} />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{option.text}</span>
                  {showResults && (
                    <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground/90">{pct}%</span>
                      <span className="mx-1 opacity-40">·</span>
                      {option.voteCount}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        {total === 0
          ? "No votes yet"
          : `${total.toLocaleString()} ${total === 1 ? "vote" : "votes"}`}
        {poll.allowMultiple ? " · Multiple choice" : ""}
      </p>

      {voteError && (
        <p className="mt-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-100/95">
          {voteError}
        </p>
      )}
    </motion.div>
  );
}
