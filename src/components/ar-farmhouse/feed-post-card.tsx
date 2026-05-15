"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  ChevronDown,
  Flag,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { PostShareSheet } from "@/components/ar-farmhouse/post-share-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { usePostSocial } from "@/hooks/use-post-social";
import { buildPostDeepLink } from "@/lib/app-url";
import { FEED_IMAGE_SIZES, FEED_MEDIA_BLEED } from "@/lib/feed-layout";
import { hubSlugFromLinkedEventLabel } from "@/lib/linked-event-hub";
import type { UiFeedPost } from "@/models/feed-post";
import { deleteFeedPost } from "@/services/feed-posts";
import { cn } from "@/lib/utils";

const categoryLabel: Record<UiFeedPost["category"], string> = {
  memory: "Memory",
  update: "Update",
  event: "Event",
  wildlife: "Wildlife",
  project: "Project",
  weekend_recap: "Weekend",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function useAlbumIndex(length: number) {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => (v + 1) % length), [length]);
  const prev = useCallback(() => setI((v) => (v - 1 + length) % length), [length]);
  return { i, next, prev, setI };
}

type LightboxState = { urls: string[]; index: number } | null;

function FeedLightbox({
  state,
  onClose,
  onPrev,
  onNext,
  reduceMotion,
}: {
  state: LightboxState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  reduceMotion: boolean | null;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose, onPrev, onNext]);

  if (!mounted) return null;

  const activeSrc = state?.urls[state.index];

  return createPortal(
    <AnimatePresence>
      {state && activeSrc ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          key="feed-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:p-4"
          onClick={onClose}
        >
          <button
            type="button"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full border border-white/15 bg-white/10 p-2.5 text-white hover:bg-white/20 sm:right-4 sm:top-4"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          {state.urls.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20 sm:left-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20 sm:right-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
          <motion.div
            key={activeSrc}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[min(90dvh,900px)] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/5] w-full sm:aspect-auto sm:max-h-[85vh] sm:min-h-[320px]">
              <Image src={activeSrc} alt="" fill className="object-contain" sizes="(max-width: 768px) 100vw, 1200px" priority />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export function FeedPostCard({
  post,
  highlightId,
  suppressMedia = false,
}: {
  post: UiFeedPost;
  highlightId?: string | null;
  suppressMedia?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const { user, displayName, avatarUrl, configured } = useAuth();
  const interactionsLive = configured && !!user?.uid;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const social = usePostSocial({
    postId: post.id,
    uid: user?.uid,
    displayName,
    avatarUrl,
    commentsOpen,
    remoteEnabled: interactionsLive,
  });

  const displayReactions = useMemo(
    () => social.reactionChips.map((c) => ({ emoji: c.emoji, count: c.count, active: c.active })),
    [social.reactionChips]
  );

  const mergedReactionState = useMemo(
    () => Object.fromEntries(social.reactionChips.map((c) => [c.emoji, { count: c.count, on: c.active }])),
    [social.reactionChips]
  );

  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const albumNav = useAlbumIndex(Math.max((post.album ?? []).length, 1));

  const albumUrls = useMemo(() => {
    const album = post.album ?? [];
    if (post.kind === "image" && post.cover) return [post.cover];
    if (post.kind === "album" && album.length) return album;
    if (post.kind === "video" && post.video) return [post.video.poster];
    if (post.kind === "event_recap" && post.cover) return [post.cover];
    return [];
  }, [post]);

  const album = post.album ?? [];

  const openLightboxAt = (index: number) => {
    if (!albumUrls.length) return;
    setLightbox({ urls: albumUrls, index: Math.min(index, albumUrls.length - 1) });
  };

  const lightboxPrev = () =>
    setLightbox((s) => {
      if (!s) return s;
      const n = (s.index - 1 + s.urls.length) % s.urls.length;
      return { ...s, index: n };
    });

  const lightboxNext = () =>
    setLightbox((s) => {
      if (!s) return s;
      const n = (s.index + 1) % s.urls.length;
      return { ...s, index: n };
    });

  const { toggleReaction: commitRemoteReaction, submitComment, toggleSaved, saved: savedRemote, socialError } = social;
  const [commentError, setCommentError] = useState<string | null>(null);

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!interactionsLive) return;
      await commitRemoteReaction(emoji);
    },
    [commitRemoteReaction, interactionsLive]
  );

  const totalEngagement = useMemo(
    () => Object.values(mergedReactionState).reduce((acc, r) => acc + r.count, 0),
    [mergedReactionState]
  );

  const primaryKey =
    displayReactions.find((r) => r.emoji === "❤️")?.emoji ?? displayReactions[0]?.emoji ?? "❤️";
  const heartActive = mergedReactionState[primaryKey]?.on ?? false;
  const isOwner = !!user?.uid && user.uid === post.authorId;
  const isHighlighted = !!highlightId && highlightId === post.id;

  const hasMedia =
    !suppressMedia &&
    ((post.kind === "image" && post.cover) ||
      (post.kind === "album" && album.length > 0) ||
      (post.kind === "video" && post.video) ||
      (post.kind === "event_recap" && post.cover));

  const mediaShell = cn(
    "relative overflow-hidden bg-muted/30 dark:bg-zinc-950/40",
    FEED_MEDIA_BLEED,
    "rounded-none sm:rounded-[1.35rem]",
    "ring-1 ring-inset ring-border/55 dark:ring-white/[0.06]",
    "shadow-[var(--ar-panel-elevate)] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)]"
  );

  const commentLines = useMemo(() => {
    if (interactionsLive && commentsOpen) return social.commentsPreview;
    return post.commentsPreview;
  }, [commentsOpen, post.commentsPreview, interactionsLive, social.commentsPreview]);

  const commentCountLabel = useMemo(() => {
    if (interactionsLive && commentsOpen) {
      return Math.max(post.commentCount, social.commentRows.length);
    }
    return post.commentCount;
  }, [commentsOpen, interactionsLive, post.commentCount, social.commentRows.length]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setDeleteConfirm(false);
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen || !menuBtnRef.current) return;
    const r = menuBtnRef.current.getBoundingClientRect();
    setMenuCoords({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuPanelRef.current?.contains(t) || menuBtnRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const copyPostLink = useCallback(async () => {
    const url = buildPostDeepLink(post.id);
    if (!url) {
      setToast("Link unavailable in this environment.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
      closeMenu();
    } catch {
      setToast("Could not copy link.");
    }
  }, [closeMenu, post.id]);

  const onDeletePost = useCallback(async () => {
    if (!user?.uid) return;
    setDeleteBusy(true);
    try {
      await deleteFeedPost(post.id, user.uid, post.authorId);
      closeMenu();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not delete post.");
    } finally {
      setDeleteBusy(false);
    }
  }, [closeMenu, post.authorId, post.id, user]);

  const shareSummary = useMemo(() => {
    const t = post.title ? `${post.title} — ${post.body}` : post.body;
    return t.slice(0, 280);
  }, [post.body, post.title]);

  const menuMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const onAlbumTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < 52 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) albumNav.next();
    else albumNav.prev();
  };

  return (
    <>
      <motion.article
        id={`feed-post-${post.id}`}
        layout={false}
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-4% 0px" }}
        transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "touch-manipulation scroll-mt-28 pb-10 sm:scroll-mt-32 sm:pb-12",
          isHighlighted && "rounded-2xl ring-2 ring-primary/35 ring-offset-2 ring-offset-background sm:rounded-[1.35rem]"
        )}
      >
        <header className="flex items-start gap-3 px-1 pb-3 sm:px-0">
          <Avatar size="lg" className="ring-2 ring-border/60 dark:ring-white/10">
            <AvatarImage src={post.author.avatar} alt="" />
            <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">{post.author.name}</span>
              <span className="text-[13px] text-muted-foreground">{post.timeLabel}</span>
              <span className="text-[11px] font-medium text-primary/90">· {categoryLabel[post.category]}</span>
            </div>
            {post.location && (
              <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                <span>{post.location}</span>
              </p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
              className={cn(
                "rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:bg-white/[0.06]",
                menuOpen && "bg-muted/70 text-foreground dark:bg-white/[0.08]"
              )}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Post options"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </header>

        {/* Media — dominant, immersive */}
        {post.kind === "image" && post.cover && (
          <button type="button" className={cn("group/media block w-full text-left", mediaShell)} onClick={() => openLightboxAt(0)}>
            <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full sm:aspect-[4/5] sm:max-h-[min(82vh,680px)]">
              <motion.div
                className="relative h-full w-full"
                whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={post.cover} alt="" fill sizes={FEED_IMAGE_SIZES} className="object-cover" loading="lazy" />
              </motion.div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent opacity-80 sm:opacity-100" />
            </div>
          </button>
        )}

        {post.kind === "album" && album.length > 0 && (
          <div className={mediaShell}>
            {/* Mobile: swipe carousel */}
            <div
              className="relative sm:hidden"
              onTouchStart={(e) => {
                touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={onAlbumTouchEnd}
            >
              <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full">
                <motion.div
                  key={albumNav.i}
                  initial={reduceMotion ? false : { opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-full w-full"
                >
                  <button type="button" className="relative block h-full w-full" onClick={() => openLightboxAt(albumNav.i)}>
                    <Image
                      src={album[albumNav.i] ?? album[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="100vw"
                      loading="lazy"
                    />
                  </button>
                </motion.div>
              </div>
              {album.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {album.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Photo ${idx + 1}`}
                      onClick={() => albumNav.setI(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === albumNav.i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/35 dark:bg-white/40"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: IG-style grid */}
            <div className="hidden sm:block">
              {album.length === 1 && (
                <button type="button" className="relative block w-full" onClick={() => openLightboxAt(0)}>
                  <div className="relative aspect-[4/5] max-h-[min(82vh,680px)] w-full">
                    <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.45 }}>
                      <Image src={album[0]} alt="" fill className="object-cover" sizes={FEED_IMAGE_SIZES} loading="lazy" />
                    </motion.div>
                  </div>
                </button>
              )}
              {album.length === 2 && (
                <div className="grid grid-cols-2 gap-1">
                  {album.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      className="relative aspect-[4/5] overflow-hidden first:rounded-l-[1.25rem] last:rounded-r-[1.25rem]"
                      onClick={() => openLightboxAt(idx)}
                    >
                      <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.4 }}>
                        <Image src={src} alt="" fill className="object-cover" sizes="260px" loading="lazy" />
                      </motion.div>
                    </button>
                  ))}
                </div>
              )}
              {album.length >= 3 && (
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[1.25rem]">
                  {album.slice(0, 3).map((src, idx) => (
                    <button key={src} type="button" className="relative aspect-square" onClick={() => openLightboxAt(idx)}>
                      <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.03 }} transition={{ duration: 0.35 }}>
                        <Image src={src} alt="" fill className="object-cover" sizes="180px" loading="lazy" />
                      </motion.div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {post.kind === "video" && post.video && (
          <div className={mediaShell}>
            <button type="button" className="relative block w-full" onClick={() => openLightboxAt(0)}>
              <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full">
                <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.45 }}>
                  <Image src={post.video.poster} alt="" fill className="object-cover" sizes={FEED_IMAGE_SIZES} loading="lazy" />
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="flex size-16 items-center justify-center rounded-full border border-white/25 bg-background/50 text-white shadow-xl backdrop-blur-md">
                    <Play className="size-7 translate-x-0.5" aria-hidden />
                  </span>
                </div>
                <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                  {post.video.duration}
                </span>
              </div>
            </button>
          </div>
        )}

        {post.kind === "event_recap" && post.cover && (
          <button type="button" className={cn("block w-full text-left", mediaShell)} onClick={() => openLightboxAt(0)}>
            <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full">
              <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.45 }}>
                <Image src={post.cover} alt="" fill className="object-cover" sizes={FEED_IMAGE_SIZES} loading="lazy" />
              </motion.div>
              <div className="absolute bottom-3 left-3 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-md dark:border-white/15 dark:bg-background/55">
                Event recap
              </div>
            </div>
          </button>
        )}

        {post.kind === "text" && !hasMedia && (
          <div className="ar-surface-inset rounded-2xl px-4 py-5 sm:px-5 sm:py-6">
            <p className="text-[15px] leading-relaxed text-foreground/95 sm:text-base">{post.body}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 px-1 pt-3 sm:px-0 sm:pt-4">
          <motion.button
            type="button"
            aria-label={heartActive ? "Unlike" : "Like"}
            disabled={!interactionsLive}
            title={!configured ? "Connect the app to enable likes." : !user ? "Sign in to like posts." : undefined}
            onClick={() => void toggleReaction(primaryKey)}
            whileTap={reduceMotion || !interactionsLive ? undefined : { scale: 0.86 }}
            className={cn(
              "rounded-full p-2.5 text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]",
              heartActive && "text-red-400",
              !interactionsLive && "pointer-events-none opacity-45"
            )}
          >
            <Heart className={cn("size-7", heartActive && "fill-current")} strokeWidth={1.6} />
          </motion.button>
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="rounded-full p-2.5 text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
            aria-label="Comment"
          >
            <MessageCircle className="size-7" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="rounded-full p-2.5 text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
            aria-label="Share"
          >
            <Send className="size-7" strokeWidth={1.6} />
          </button>
          <span className="flex-1" />
          <motion.button
            type="button"
            aria-label={savedRemote ? "Remove bookmark" : "Save post"}
            disabled={!interactionsLive}
            title={!configured ? "Connect the app to save posts." : !user ? "Sign in to save posts." : undefined}
            onClick={() => void toggleSaved()}
            whileTap={reduceMotion || !interactionsLive ? undefined : { scale: 0.86 }}
            className={cn(
              "rounded-full p-2.5 text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]",
              savedRemote && "text-primary",
              !interactionsLive && "pointer-events-none opacity-45"
            )}
          >
            <Bookmark className={cn("size-7", savedRemote && "fill-current text-primary")} strokeWidth={1.6} />
          </motion.button>
        </div>

        <div className={cn("flex flex-wrap gap-1.5 px-1 pt-1 sm:px-0", !interactionsLive && "opacity-45")}>
          {displayReactions.map((r) => {
            const state = mergedReactionState[r.emoji] ?? { count: r.count, on: !!r.active };
            return (
              <motion.button
                key={r.emoji}
                type="button"
                disabled={!interactionsLive}
                onClick={() => void toggleReaction(r.emoji)}
                whileTap={reduceMotion || !interactionsLive ? undefined : { scale: 0.88 }}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] transition-colors sm:min-h-0 sm:min-w-0",
                  state.on ? "bg-primary/15 text-foreground" : "hover:bg-muted/70 dark:hover:bg-white/[0.06]",
                  !interactionsLive && "pointer-events-none"
                )}
              >
                <motion.span
                  key={`${r.emoji}-${state.on}`}
                  initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  {r.emoji}
                </motion.span>
                <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{Math.max(0, state.count)}</span>
              </motion.button>
            );
          })}
        </div>

        {totalEngagement > 0 && (
          <p className="px-1 pt-2 text-sm font-semibold text-foreground sm:px-0">
            {totalEngagement.toLocaleString()} {totalEngagement === 1 ? "reaction" : "reactions"}
          </p>
        )}

        {post.kind !== "text" && (
          <div className="space-y-1.5 px-1 pt-2 sm:px-0 sm:pt-3">
            {post.title && <p className="text-[15px] font-semibold leading-snug text-foreground">{post.title}</p>}
            <p className="text-[15px] leading-relaxed text-foreground/90 sm:text-base">
              <span className="font-semibold text-foreground">{post.author.name.split(" ")[0]} </span>
              {post.body}
            </p>
          </div>
        )}

        {post.linkedEvent && (
          <button
            type="button"
            onClick={() => {
              const slug = hubSlugFromLinkedEventLabel(post.linkedEvent!);
              if (slug) openWeekendHub(slug);
            }}
            className="mx-1 mt-3 flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.09] px-3 py-2 text-left text-xs text-primary-foreground/95 transition-colors hover:border-primary/35 hover:bg-primary/[0.12] sm:mx-0"
          >
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="font-medium">{post.linkedEvent}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Open hub</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          className="mt-2 flex w-full items-center justify-between gap-2 px-1 py-1 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-0"
        >
          <span>
            {commentsOpen ? "Hide" : "View"} {commentCountLabel}{" "}
            {commentCountLabel === 1 ? "comment" : "comments"}
          </span>
          <motion.span animate={{ rotate: commentsOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {commentsOpen && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-2 border-l border-primary/25 py-2 pl-3 sm:pl-4">
                {commentLines.length === 0 && (
                  <p className="text-[13px] text-muted-foreground">No comments yet — say hello.</p>
                )}
                {commentLines.map((c, idx) => (
                  <p key={`${idx}-${c.author}-${c.text.slice(0, 24)}`} className="text-[14px] leading-relaxed text-foreground/90">
                    <span className="font-semibold text-foreground">{c.author}</span> {c.text}
                  </p>
                ))}
                {interactionsLive && user && (
                  <form
                    className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!commentDraft.trim() || commentBusy) return;
                      setCommentBusy(true);
                      void (async () => {
                        setCommentError(null);
                        try {
                          await submitComment(commentDraft);
                          setCommentDraft("");
                        } catch (e) {
                          setCommentError(e instanceof Error ? e.message : "Could not post comment.");
                        } finally {
                          setCommentBusy(false);
                        }
                      })();
                    }}
                  >
                    <Input
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder="Write a comment…"
                      className="rounded-xl border-border/60 bg-muted/50 text-[14px] dark:border-white/10 dark:bg-white/[0.04]"
                      disabled={commentBusy}
                    />
                    <Button type="submit" size="sm" className="shrink-0 rounded-xl" disabled={commentBusy}>
                      Send
                    </Button>
                  </form>
                )}
                {(commentError || socialError) && (
                  <p className="text-[12px] text-red-400/95">{commentError ?? socialError}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      <PostShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        postId={post.id}
        title={post.title}
        summary={shareSummary}
      />

      {menuMounted && menuOpen
        ? createPortal(
            <motion.div
              ref={menuPanelRef}
              role="menu"
              initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[95] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border/60 bg-card/95 py-1.5 text-sm shadow-[var(--ar-modal-elevate)] backdrop-blur-xl dark:border-white/12 dark:bg-zinc-950/95"
              style={{ top: menuCoords.top, right: menuCoords.right }}
            >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left font-medium text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
                  onClick={() => {
                    void toggleSaved();
                    closeMenu();
                  }}
                >
                  <Bookmark className={cn("size-4", savedRemote && "fill-current text-primary")} aria-hidden />
                  {savedRemote ? "Unsave post" : "Save post"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left font-medium text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
                  onClick={() => void copyPostLink()}
                >
                  <Link2 className="size-4 opacity-80" aria-hidden />
                  Copy link
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left font-medium text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
                  onClick={() => {
                    setToast("Thanks — reporting will be available in a future update.");
                    closeMenu();
                  }}
                >
                  <Flag className="size-4 opacity-80" aria-hidden />
                  Report an issue
                </button>
                {isOwner && (
                  <>
                    <div className="my-1 h-px bg-border/60 dark:bg-white/10" />
                    <button
                      type="button"
                      role="menuitem"
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-left font-medium text-muted-foreground/70"
                      title="Editing posts is not available yet."
                    >
                      <Pencil className="size-4 opacity-50" aria-hidden />
                      Edit post
                    </button>
                    {deleteConfirm ? (
                      <div className="space-y-2 px-3 py-2">
                        <p className="text-xs leading-relaxed text-muted-foreground">Remove this post for everyone? This cannot be undone.</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-xl"
                            disabled={deleteBusy}
                            onClick={() => setDeleteConfirm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="flex-1 rounded-xl"
                            disabled={deleteBusy}
                            onClick={() => void onDeletePost()}
                          >
                            {deleteBusy ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left font-medium text-red-500 transition-colors hover:bg-red-500/10"
                        onClick={() => setDeleteConfirm(true)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Delete post
                      </button>
                    )}
                  </>
                )}
            </motion.div>,
            document.body
          )
        : null}

      <AnimatePresence initial={false}>
        {toast ? (
          <motion.p
            key={toast}
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 z-[120] max-w-sm -translate-x-1/2 rounded-2xl border border-border/55 bg-card/95 px-4 py-2.5 text-center text-sm text-foreground shadow-lg backdrop-blur-md dark:border-white/12 dark:bg-zinc-950/95"
          >
            {toast}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <FeedLightbox
        state={lightbox}
        onClose={() => setLightbox(null)}
        onPrev={lightboxPrev}
        onNext={lightboxNext}
        reduceMotion={reduceMotion}
      />
    </>
  );
}
