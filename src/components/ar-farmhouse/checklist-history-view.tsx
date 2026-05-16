"use client";

import { memo, useEffect, useState } from "react";

import { ChecklistImageLightbox } from "@/components/ar-farmhouse/checklist-image-lightbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { checklistSubmissionToHistoryRows } from "@/lib/checklist-fields";
import { formatLocalDateTime } from "@/lib/datetime/time";
import type { ChecklistHistoryRow } from "@/lib/checklist-fields";
import type { ChecklistSubmission } from "@/models/checklist";
import { subscribeChecklistSubmissions } from "@/services/checklists";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

const cardSurface = cn(
  "rounded-[1.35rem] border border-border/50 bg-card/80 shadow-[var(--ar-float-subtle)] backdrop-blur-sm",
  "dark:border-white/[0.08] dark:bg-white/[0.04]"
);

const HistoryThumbnail = memo(function HistoryThumbnail({
  url,
  label,
  onOpen,
}: {
  url: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-border/50 dark:ring-white/10"
      aria-label={`View photo for ${label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
    </button>
  );
});

const HistoryRow = memo(function HistoryRow({
  row,
  onOpenImage,
}: {
  row: ChecklistHistoryRow;
  onOpenImage: (url: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{row.label}</p>
        <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">{row.value}</p>
      </div>
      {row.imageUrl ? <HistoryThumbnail url={row.imageUrl} label={row.label} onOpen={() => onOpenImage(row.imageUrl!)} /> : null}
    </div>
  );
});

const SubmissionCard = memo(function SubmissionCard({
  submission,
  onOpenImage,
}: {
  submission: ChecklistSubmission;
  onOpenImage: (url: string) => void;
}) {
  const rows = checklistSubmissionToHistoryRows(submission);
  const when = submission.createdAt ? formatLocalDateTime(submission.createdAt) : "Just now";

  return (
    <article className={cn(cardSurface, "overflow-hidden")}>
      <header className="border-b border-border/45 px-4 py-3.5 dark:border-white/[0.06]">
        <p className="text-[15px] font-semibold text-foreground">{submission.submittedByName || "Family member"}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{when}</p>
      </header>
      <div className="divide-y divide-border/45 dark:divide-white/[0.06]">
        {rows.map((row) => (
          <HistoryRow key={row.key} row={row} onOpenImage={onOpenImage} />
        ))}
      </div>
    </article>
  );
});

export function ChecklistHistoryView() {
  const [submissions, setSubmissions] = useState<ChecklistSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeChecklistSubmissions(
      (rows) => {
        setSubmissions(rows);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-[1.35rem]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No walkthroughs yet"
        description="Submitted Last Man Out checklists will appear here in real time."
      />
    );
  }

  return (
  <>
      <div className="space-y-4">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.submissionId}
            submission={submission}
            onOpenImage={setLightboxUrl}
          />
        ))}
      </div>
      <ChecklistImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  );
}
