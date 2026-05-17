"use client";

import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { UserAvatar } from "@/components/ar-farmhouse/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeedComment } from "@/services/post-engagement";
import { commentTimeLabel } from "@/services/post-engagement";
import { cn } from "@/lib/utils";

type FeedCommentListProps = {
  comments: FeedComment[];
  currentUid: string | undefined;
  busy: boolean;
  onSubmit: (text: string, parentId?: string | null) => Promise<void>;
  onEdit: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  error?: string | null;
};

const commentBubbleClass =
  "rounded-2xl bg-muted/55 px-3 py-2.5 ring-1 ring-inset ring-border/35 dark:bg-white/[0.06] dark:ring-white/[0.08] sm:rounded-[15px] sm:px-3 sm:py-2";

function CommentRow({
  comment,
  currentUid,
  depth,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: FeedComment;
  currentUid: string | undefined;
  depth: number;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const isOwn = currentUid === comment.authorId;
  const isPending = comment.id.startsWith("pending_");
  const isReply = depth > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [rowBusy, setRowBusy] = useState(false);

  const saveEdit = useCallback(async () => {
    if (!draft.trim() || rowBusy) return;
    setRowBusy(true);
    try {
      await onEdit(comment.id, draft);
      setEditing(false);
      setMenuOpen(false);
    } finally {
      setRowBusy(false);
    }
  }, [comment.id, draft, onEdit, rowBusy]);

  const timeMeta = [
    commentTimeLabel(comment.createdAtMs),
    comment.edited ? "edited" : null,
    isPending ? "sending…" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-w-0 items-start gap-3 sm:gap-2.5">
      <UserAvatar
        name={comment.author}
        colorId={comment.authorAvatarColor}
        uid={comment.authorId}
        className={cn("shrink-0", isReply ? "size-7 sm:size-6" : "size-9 sm:size-8")}
        fallbackClassName={cn("rounded-full", isReply ? "text-[8px]" : "text-[10px]")}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9 rounded-xl text-[15px] sm:h-8 sm:text-[13px]"
              disabled={rowBusy}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg px-2.5 text-[13px] font-semibold"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg px-3 text-[13px] font-semibold"
                disabled={rowBusy}
                onClick={() => void saveEdit()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-start gap-1">
              <div className={cn("min-w-0 flex-1", commentBubbleClass)}>
                <p className="text-[15px] font-bold leading-tight text-foreground sm:text-[14px]">{comment.author}</p>
                <p className="mt-1 text-[15px] font-normal leading-[1.4] text-foreground/90 [overflow-wrap:anywhere] whitespace-normal break-words sm:text-[14px]">
                  {comment.text}
                </p>
              </div>
              {isOwn && !isPending && (
                <div className="relative shrink-0 self-start">
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground/80 hover:bg-muted/60 hover:text-muted-foreground sm:size-8"
                    aria-label="Comment options"
                    onClick={() => setMenuOpen((o) => !o)}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-border/60 bg-popover py-1 shadow-lg dark:border-white/12">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium hover:bg-muted/60"
                        onClick={() => {
                          setEditing(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setMenuOpen(false);
                          void onDelete(comment.id);
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 pl-1 text-[13px] font-semibold text-muted-foreground sm:mt-1 sm:text-[12px]">
              <span>{timeMeta}</span>
              {!isPending && !isReply && (
                <button type="button" className="hover:text-foreground" onClick={() => onReply(comment.id)}>
                  Reply
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function FeedCommentList({
  comments,
  currentUid,
  busy,
  onSubmit,
  onEdit,
  onDelete,
  error,
}: FeedCommentListProps) {
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<string, FeedComment[]>>((acc, c) => {
    if (!c.parentId) return acc;
    (acc[c.parentId] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-3">
      {topLevel.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border/50 bg-muted/15 px-4 py-6 text-center text-[15px] leading-relaxed text-muted-foreground sm:text-[13px] dark:border-white/10">
          No comments yet — share a warm note for the family.
        </p>
      )}
      {topLevel.map((c) => {
        const replies = repliesByParent[c.id] ?? [];
        return (
          <div key={c.id} className="space-y-0">
            <CommentRow
              comment={c}
              currentUid={currentUid}
              depth={0}
              onReply={setReplyToId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            {replies.length > 0 && (
              <div className="ml-11 mt-2.5 space-y-3 border-l-2 border-border/45 pl-3.5 dark:border-white/10 sm:ml-10 sm:mt-2 sm:space-y-2.5 sm:pl-3">
                {replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    currentUid={currentUid}
                    depth={1}
                    onReply={setReplyToId}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {currentUid && (
        <form
          className="flex flex-col gap-3 border-t border-border/40 pt-4 dark:border-white/[0.06] sm:gap-2.5 sm:pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || busy) return;
            void (async () => {
              try {
                await onSubmit(draft, replyToId);
                setDraft("");
                setReplyToId(null);
              } catch {
                /* error prop */
              }
            })();
          }}
        >
          {replyToId && (
            <p className="text-[13px] font-semibold text-muted-foreground sm:text-[12px]">
              Replying ·{" "}
              <button type="button" className="font-semibold text-foreground hover:underline" onClick={() => setReplyToId(null)}>
                Cancel
              </button>
            </p>
          )}
          <div className="flex min-w-0 items-center gap-2.5">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={replyToId ? "Write a reply…" : "Write a comment…"}
              className="h-11 min-w-0 flex-1 rounded-full border-border/60 bg-muted/50 px-4 text-[15px] sm:h-9 sm:text-[13px] dark:border-white/10 dark:bg-white/[0.04]"
              disabled={busy}
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-11 min-w-11 shrink-0 px-3 text-[15px] font-bold text-primary hover:bg-transparent hover:text-primary/80 disabled:opacity-40 sm:h-9 sm:min-w-0 sm:px-2 sm:text-[13px]"
              disabled={busy || !draft.trim()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Post"}
            </Button>
          </div>
        </form>
      )}
      {error ? <p className="text-[13px] font-medium text-red-400/95">{error}</p> : null}
    </div>
  );
}
