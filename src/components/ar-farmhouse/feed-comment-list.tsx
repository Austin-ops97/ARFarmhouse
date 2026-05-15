"use client";

import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeedComment } from "@/services/post-engagement";
import { commentTimeLabel } from "@/services/post-engagement";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

type FeedCommentListProps = {
  comments: FeedComment[];
  currentUid: string | undefined;
  busy: boolean;
  onSubmit: (text: string, parentId?: string | null) => Promise<void>;
  onEdit: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  error?: string | null;
};

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

  return (
    <div className={cn("flex gap-2.5", depth > 0 && "ml-6 border-l border-primary/20 pl-3")}>
      <Avatar className="size-8 shrink-0 rounded-lg">
        <AvatarImage src={comment.authorAvatarUrl ?? undefined} alt="" />
        <AvatarFallback className="rounded-lg text-[10px]">{initials(comment.author)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">{comment.author}</p>
            <p className="text-[11px] text-muted-foreground">
              {commentTimeLabel(comment.createdAtMs)}
              {comment.edited ? " · edited" : ""}
              {isPending ? " · sending…" : ""}
            </p>
          </div>
          {isOwn && !isPending && (
            <div className="relative">
              <button
                type="button"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted/60"
                aria-label="Comment options"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MoreHorizontal className="size-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-border/60 bg-popover py-1 shadow-lg dark:border-white/12">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60"
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
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10"
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
        {editing ? (
          <div className="mt-2 space-y-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9 rounded-xl text-[13px]"
              disabled={rowBusy}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" className="rounded-lg" disabled={rowBusy} onClick={() => void saveEdit()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-[14px] leading-relaxed text-foreground/90">{comment.text}</p>
        )}
        {!isPending && depth === 0 && (
          <button
            type="button"
            className="mt-1 text-[12px] font-medium text-muted-foreground hover:text-primary"
            onClick={() => onReply(comment.id)}
          >
            Reply
          </button>
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
    <div className="space-y-3">
      {topLevel.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/50 bg-muted/15 px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground dark:border-white/10">
          No comments yet — share a warm note for the family.
        </p>
      )}
      {topLevel.map((c) => (
        <div key={c.id} className="space-y-2">
          <CommentRow
            comment={c}
            currentUid={currentUid}
            depth={0}
            onReply={setReplyToId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {(repliesByParent[c.id] ?? []).map((reply) => (
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
      ))}

      {currentUid && (
        <form
          className="flex flex-col gap-2 border-t border-border/40 pt-3 dark:border-white/[0.06]"
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
            <p className="text-[12px] text-muted-foreground">
              Replying ·{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => setReplyToId(null)}>
                Cancel
              </button>
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={replyToId ? "Write a reply…" : "Write a comment…"}
              className="rounded-xl border-border/60 bg-muted/50 text-[14px] dark:border-white/10 dark:bg-white/[0.04]"
              disabled={busy}
            />
            <Button type="submit" size="sm" className="shrink-0 rounded-xl" disabled={busy || !draft.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Send"}
            </Button>
          </div>
        </form>
      )}
      {error ? <p className="text-[12px] text-red-400/95">{error}</p> : null}
    </div>
  );
}
