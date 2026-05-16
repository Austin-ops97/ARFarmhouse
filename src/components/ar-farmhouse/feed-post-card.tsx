"use client";

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
  Loader2,
  RotateCw,
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

import { FeedPollBlock } from "@/components/ar-farmhouse/feed-poll-block";
import { FeedMediaFrame } from "@/components/ar-farmhouse/feed-media-frame";
import { FeedMediaLightbox, type FeedMediaLightboxState } from "@/components/ar-farmhouse/feed-media-lightbox";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { PostShareSheet } from "@/components/ar-farmhouse/post-share-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { FeedCommentList } from "@/components/ar-farmhouse/feed-comment-list";
import { usePollVote } from "@/hooks/use-poll-vote";
import { usePostSocial } from "@/hooks/use-post-social";
import { useInViewReady } from "@/lib/use-in-view-ready";
import { reactionTotal } from "@/lib/reaction-counts";
import { useSavedPosts } from "@/contexts/saved-posts-context";
import { setPostSaved } from "@/services/post-engagement";
import { buildPostDeepLink } from "@/lib/app-url";
import { type FeedMediaDims } from "@/lib/feed-media-aspect";
import { useLockedAlbumCarouselLayout } from "@/lib/use-locked-feed-media-layout";
import { FEED_IMAGE_SIZES, FEED_MEDIA_BLEED } from "@/lib/feed-layout";
import { hubSlugFromLinkedEventLabel } from "@/lib/linked-event-hub";
import { isEphemeralLocalImageUrl } from "@/lib/image-display-url";
import type { UiFeedPost } from "@/models/feed-post";
import { canDeleteFeedPost } from "@/lib/permissions";
import { deleteFeedPost } from "@/services/feed-posts";
import { cn } from "@/lib/utils";

function ephemeralImageProps(src: string) {
  return isEphemeralLocalImageUrl(src)
    ? { unoptimized: true as const, placeholder: "empty" as const }
    : { placeholder: "empty" as const };
}

const categoryLabel: Record<UiFeedPost["category"], string> = {
  memory: "Memory",
  update: "Update",
  event: "Event",
  wildlife: "Wildlife",
  project: "Project",
  weekend_recap: "Weekend",
  poll: "Poll",
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

function mediaDimsAt(post: UiFeedPost, idx: number): FeedMediaDims | null {
  const slot = post.mediaDimensions?.[idx];
  if (!slot?.width || !slot.height) return null;
  if (slot.width <= 0 || slot.height <= 0) return null;
  return { width: slot.width, height: slot.height };
}

export function FeedPostCard({
  post,
  highlightId,
  suppressMedia = false,
  onRetryOptimisticFeed,
  onDismissOptimisticFeed,
}: {
  post: UiFeedPost;
  highlightId?: string | null;
  suppressMedia?: boolean;
  onRetryOptimisticFeed?: () => void;
  onDismissOptimisticFeed?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const { user, profile, displayName, avatarUrl, configured } = useAuth();
  const { isSaved } = useSavedPosts();
  const { ref: inViewRef, inView: engagementActive } = useInViewReady("280px 0px");
  const interactionsLive = configured && !!user?.uid && !post.optimistic;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const savedForPost = isSaved(post.id);

  const onSavedChange = useCallback(
    async (next: boolean) => {
      if (!user?.uid) return;
      await setPostSaved(post.id, user.uid, next);
    },
    [post.id, user]
  );

  const social = usePostSocial({
    postId: post.id,
    uid: user?.uid,
    displayName,
    avatarUrl,
    reactionCounts: post.reactionCounts,
    commentsOpen,
    engagementActive: engagementActive || commentsOpen,
    remoteEnabled: interactionsLive,
    saved: savedForPost,
    onSavedChange,
  });

  const pollVote = usePollVote({
    postId: post.id,
    poll: post.poll,
    uid: user?.uid,
    engagementActive: engagementActive || commentsOpen,
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

  const [lightbox, setLightbox] = useState<FeedMediaLightboxState>(null);
  /** Mobile album swipe — lock axis early so vertical feed scroll wins. */
  const albumTouch = useRef<{ x: number; y: number; lock: "h" | "v" | null; suppressTap: boolean }>({
    x: 0,
    y: 0,
    lock: null,
    suppressTap: false,
  });

  const albumNav = useAlbumIndex(Math.max((post.album ?? []).length, 1));

  const albumUrls = useMemo(() => {
    const album = post.album ?? [];
    if (post.kind === "image" && post.cover) return [post.cover];
    if (post.kind === "album" && album.length) return album;
    if (post.kind === "video" && post.video) return [post.video.poster];
    if (post.kind === "event_recap" && post.cover) return [post.cover];
    return [];
  }, [post]);

  const lightboxUrls = useMemo(() => {
    const overlay = post.mediaFullUrls;
    if (!overlay?.some((u) => typeof u === "string" && u.length > 0)) return albumUrls;
    return albumUrls.map((u, i) => overlay[i] ?? u);
  }, [albumUrls, post.mediaFullUrls]);

  const album = post.album ?? [];

  const albumCarouselLayout = useLockedAlbumCarouselLayout(
    Array.from({ length: album.length }, (_, i) => mediaDimsAt(post, i)),
    album.length
  );

  const openLightboxAt = (index: number) => {
    if (!lightboxUrls.length) return;
    setLightbox({ urls: lightboxUrls, index: Math.min(index, lightboxUrls.length - 1) });
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

  const {
    toggleReaction: commitRemoteReaction,
    submitComment,
    editComment,
    removeComment,
    toggleSaved,
    saved: savedRemote,
    socialError,
  } = social;
  const [commentError, setCommentError] = useState<string | null>(null);

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!interactionsLive) return;
      await commitRemoteReaction(emoji);
    },
    [commitRemoteReaction, interactionsLive]
  );

  const totalEngagement = useMemo(
    () => reactionTotal(post.reactionCounts),
    [post.reactionCounts]
  );

  const primaryKey =
    displayReactions.find((r) => r.emoji === "❤️")?.emoji ?? displayReactions[0]?.emoji ?? "❤️";
  const heartActive = mergedReactionState[primaryKey]?.on ?? false;
  const permissionUser = useMemo(
    () => (user?.uid ? { uid: user.uid, role: profile?.role ?? "user" } : null),
    [profile?.role, user?.uid]
  );
  const canDelete = canDeleteFeedPost(permissionUser, post);
  const isHighlighted = !!highlightId && highlightId === post.id;

  const hasMedia =
    !suppressMedia &&
    ((post.kind === "image" && post.cover) ||
      (post.kind === "album" && album.length > 0) ||
      (post.kind === "video" && post.video) ||
      (post.kind === "event_recap" && post.cover));

  const mediaShell = cn(
    "relative overflow-hidden bg-muted/25 dark:bg-zinc-950/45",
    FEED_MEDIA_BLEED,
    "rounded-[1.5rem] sm:rounded-[1.75rem]",
    "ring-1 ring-inset ring-border/50 dark:ring-white/[0.07]",
    "shadow-[var(--ar-panel-elevate)] dark:shadow-[0_20px_70px_-38px_rgba(0,0,0,0.82)]",
    "touch-pan-y"
  );

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
    const onOutside = (e: Event) => {
      const t = e.target as Node;
      if (menuPanelRef.current?.contains(t) || menuBtnRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const copyPostLink = useCallback(async () => {
    if (post.optimistic) {
      setToast("Link is available after the post finishes syncing.");
      closeMenu();
      return;
    }
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
  }, [closeMenu, post.id, post.optimistic]);

  const onDeletePost = useCallback(async () => {
    if (!user?.uid) return;
    if (post.optimistic) {
      onDismissOptimisticFeed?.();
      closeMenu();
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteFeedPost(post.id, permissionUser, post.authorId, albumUrls);
      closeMenu();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not delete post.");
    } finally {
      setDeleteBusy(false);
    }
  }, [albumUrls, closeMenu, onDismissOptimisticFeed, permissionUser, post.authorId, post.id, post.optimistic, user]);

  const shareSummary = useMemo(() => {
    if (post.kind === "poll" && post.poll) return post.poll.question.slice(0, 280);
    const t = post.title ? `${post.title} — ${post.body}` : post.body;
    return t.slice(0, 280);
  }, [post.body, post.poll, post.kind, post.title]);

  const menuMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const onAlbumTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    albumTouch.current = { x: t.clientX, y: t.clientY, lock: null, suppressTap: false };
  }, []);

  const onAlbumTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (album.length <= 1 || albumTouch.current.lock) return;
      const t = e.touches[0];
      const dx = t.clientX - albumTouch.current.x;
      const dy = t.clientY - albumTouch.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      // Favor vertical page scroll as soon as intent is mostly vertical.
      if (ady > 10 && ady > adx * 1.25) {
        albumTouch.current.lock = "v";
        return;
      }
      // Require a clear horizontal intent before album swipe can activate.
      if (adx > 18 && adx > ady * 1.4) {
        albumTouch.current.lock = "h";
      }
    },
    [album.length]
  );

  const onAlbumTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - albumTouch.current.x;
      const dy = t.clientY - albumTouch.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx > 14 || ady > 14) albumTouch.current.suppressTap = true;
      if (albumTouch.current.lock === "v" || album.length <= 1) return;
      const horizontalLocked = albumTouch.current.lock === "h";
      const minSwipe = horizontalLocked ? 56 : 68;
      if (adx < minSwipe || adx <= ady * 1.45) return;
      albumTouch.current.suppressTap = true;
      if (dx < 0) albumNav.next();
      else albumNav.prev();
    },
    [album.length, albumNav]
  );

  const openAlbumLightbox = useCallback(() => {
    if (albumTouch.current.suppressTap) {
      albumTouch.current.suppressTap = false;
      return;
    }
    openLightboxAt(albumNav.i);
  }, [albumNav.i, lightboxUrls]);

  return (
    <>
      <article
        ref={inViewRef}
        id={`feed-post-${post.id}`}
        className={cn(
          "touch-pan-y scroll-mt-[calc(var(--ar-header-height)+0.75rem)] pb-7 sm:scroll-mt-[calc(var(--ar-header-height)+1rem)] sm:pb-9",
          isHighlighted && "rounded-[1.5rem] ring-2 ring-primary/35 ring-offset-2 ring-offset-background sm:rounded-[1.75rem]"
        )}
      >
        <header className="flex items-start gap-3 px-0.5 pb-3 sm:gap-2.5 sm:px-0 sm:pb-2.5">
          <Avatar className="size-11 ring-2 ring-border/55 dark:ring-white/10 sm:size-12">
            <AvatarImage src={post.author.avatar} alt="" />
            <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-base font-semibold tracking-tight text-foreground sm:text-[15px]">{post.author.name}</span>
              <span className="text-sm text-muted-foreground sm:text-[13px]">{post.timeLabel}</span>
              <span className="text-xs font-medium text-primary/90 sm:text-[11px]">· {categoryLabel[post.category]}</span>
            </div>
            {post.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground sm:text-[12px]">
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
                "ar-touch-press flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground sm:size-auto sm:p-2.5 dark:hover:bg-white/[0.06]",
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

        {post.optimistic && post.optimisticUpload?.phase === "failed" && (
          <div
            role="alert"
            className="mx-1 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 sm:mx-0"
          >
            <p className="min-w-0 flex-1 text-[12px] leading-snug text-red-100/95">
              {post.optimisticUpload.error ?? "Could not finish uploading."}
            </p>
            {onRetryOptimisticFeed ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full border-white/22 bg-background/55 text-xs"
                onClick={() => onRetryOptimisticFeed()}
              >
                <RotateCw className="mr-1.5 size-3.5" aria-hidden />
                Retry
              </Button>
            ) : null}
            {onDismissOptimisticFeed ? (
              <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full text-xs text-muted-foreground" onClick={onDismissOptimisticFeed}>
                Discard
              </Button>
            ) : null}
          </div>
        )}

        {post.optimistic && post.optimisticUpload && post.optimisticUpload.phase !== "failed" && (
          <div className="mx-1 mb-3 sm:mx-0">
            <div className="flex items-center gap-2.5 rounded-full border border-white/14 bg-black/36 px-3.5 py-2 text-[11px] font-medium text-white shadow-sm backdrop-blur-md dark:bg-zinc-950/72 dark:text-white/90">
              {reduceMotion ? (
                <span className="size-3.5 shrink-0 rounded-full bg-primary/85" aria-hidden />
              ) : (
                <Loader2 className="size-3.5 shrink-0 animate-spin opacity-90" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">{post.optimisticUpload.message ?? "Working…"}</span>
              <span className="shrink-0 tabular-nums opacity-85">{Math.min(100, post.optimisticUpload.progress)}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10 dark:bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-primary motion-reduce:transition-none"
                style={{
                  width: `${Math.min(100, post.optimisticUpload.progress)}%`,
                  transition: "width 0.62s cubic-bezier(0.25, 0.82, 0.35, 1)",
                }}
              />
            </div>
          </div>
        )}

        {/* Media — orientation-aware containment */}
        {post.kind === "image" && post.cover && (
          <button type="button" className={cn("group/media block w-full touch-pan-y text-left", mediaShell)} onClick={() => openLightboxAt(0)}>
            <FeedMediaFrame
              src={post.cover}
              alt=""
              sizes={FEED_IMAGE_SIZES}
              dims={mediaDimsAt(post, 0)}
              frameClassName="w-full"
              imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(post.cover) }}
              overlay={
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/42 via-transparent to-transparent opacity-[0.84] sm:opacity-100" />
              }
            />
          </button>
        )}

        {post.kind === "album" && album.length > 0 && (
          <div className={mediaShell}>
            {/* Mobile: swipe carousel */}
            <div
              className="relative touch-pan-y sm:hidden"
              onTouchStart={onAlbumTouchStart}
              onTouchMove={onAlbumTouchMove}
              onTouchEnd={onAlbumTouchEnd}
            >
              <div
                className="ar-feed-media-stable relative mx-auto w-full max-w-full overflow-hidden"
                style={albumCarouselLayout.boxStyle}
              >
                <button type="button" className="absolute inset-0 block" onClick={openAlbumLightbox}>
                  <FeedMediaFrame
                    src={album[albumNav.i] ?? album[0]}
                    alt=""
                    sizes="100vw"
                    dims={mediaDimsAt(post, albumNav.i)}
                    applyParentHeightCap
                    parentLayoutDims={albumCarouselLayout.layoutDims}
                    frameClassName="absolute inset-0 h-full min-h-0 w-full min-w-0"
                    imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(album[albumNav.i] ?? album[0]) }}
                  />
                </button>
              </div>
              {album.length > 1 && (
                <div className="pointer-events-auto absolute bottom-2.5 left-0 right-0 z-[1] flex justify-center gap-1.5">
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

            {/* Desktop: album grid */}
            <div className="hidden sm:block">
              {album.length === 1 && (
                <button type="button" className="relative block w-full" onClick={() => openLightboxAt(0)}>
                  <FeedMediaFrame
                    src={album[0]}
                    alt=""
                    sizes={FEED_IMAGE_SIZES}
                    dims={mediaDimsAt(post, 0)}
                    frameClassName="w-full"
                    imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(album[0]) }}
                  />
                </button>
              )}
              {album.length === 2 && (
                <div className="grid grid-cols-2 gap-1">
                  {album.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      className="relative aspect-[4/5] overflow-hidden first:rounded-l-[1.15rem] last:rounded-r-[1.15rem]"
                      onClick={() => openLightboxAt(idx)}
                    >
                      <div className="absolute inset-0 min-h-0 min-w-0">
                        <FeedMediaFrame
                          src={src}
                          alt=""
                          sizes="260px"
                          dims={mediaDimsAt(post, idx)}
                          applyParentHeightCap
                          frameClassName="absolute inset-0 h-full min-h-0 w-full min-w-0"
                          imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(src) }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {album.length >= 3 && (
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[1.15rem]">
                  {album.slice(0, 3).map((src, idx) => (
                    <button key={src} type="button" className="relative aspect-square" onClick={() => openLightboxAt(idx)}>
                      <div className="absolute inset-0 min-h-0 min-w-0">
                        <FeedMediaFrame
                          src={src}
                          alt=""
                          sizes="180px"
                          dims={mediaDimsAt(post, idx)}
                          applyParentHeightCap
                          frameClassName="absolute inset-0 h-full min-h-0 w-full min-w-0"
                          imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(src) }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {post.kind === "video" && post.video && (
          <div className={mediaShell}>
            <button type="button" className="relative block w-full touch-pan-y" onClick={() => openLightboxAt(0)}>
              <FeedMediaFrame
                src={post.video.poster}
                alt=""
                sizes={FEED_IMAGE_SIZES}
                dims={mediaDimsAt(post, 0)}
                frameClassName="w-full"
                imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(post.video.poster) }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/22">
                <span className="flex size-[3.25rem] items-center justify-center rounded-full border border-white/25 bg-background/45 text-white shadow-lg backdrop-blur-md sm:size-14 sm:border-white/28">
                  <Play className="size-6 translate-x-0.5 sm:size-7" aria-hidden />
                </span>
              </div>
              <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-black/62 px-2 py-1 text-[10px] font-medium text-white sm:bottom-3 sm:right-3 sm:text-[11px]">
                {post.video.duration}
              </span>
            </button>
          </div>
        )}

        {post.kind === "event_recap" && post.cover && (
          <button type="button" className={cn("relative block w-full touch-pan-y text-left", mediaShell)} onClick={() => openLightboxAt(0)}>
            <FeedMediaFrame
              src={post.cover}
              alt=""
              sizes={FEED_IMAGE_SIZES}
              dims={mediaDimsAt(post, 0)}
              frameClassName="w-full"
              imageProps={{ loading: "lazy" as const, ...ephemeralImageProps(post.cover) }}
            />
            <div className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full border border-border/55 bg-card/82 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md dark:border-white/14 dark:bg-background/55 sm:bottom-3 sm:left-3 sm:text-[11px]">
              Event recap
            </div>
          </button>
        )}

        {post.kind === "poll" && post.poll && (
          <FeedPollBlock
            poll={pollVote.poll ?? post.poll}
            myOptionIds={pollVote.myOptionIds}
            canVote={pollVote.canVote}
            voteBusy={pollVote.voteBusy}
            voteError={pollVote.voteError}
            onVote={(id) => void pollVote.vote(id)}
          />
        )}

        {post.kind === "text" && !hasMedia && (
          <motion.div className="ar-surface-inset rounded-2xl px-4 py-5 sm:px-5 sm:py-6">
            <p className="text-[15px] leading-relaxed text-foreground/95 sm:text-base">{post.body}</p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 px-0.5 pt-3 sm:gap-px sm:px-0 sm:pt-3.5">
          <motion.button
            type="button"
            aria-label={heartActive ? "Unlike" : "Like"}
            disabled={!interactionsLive}
            title={!configured ? "Connect the app to enable likes." : !user ? "Sign in to like posts." : undefined}
            onClick={() => void toggleReaction(primaryKey)}
            whileTap={reduceMotion || !interactionsLive ? undefined : { scale: 0.86 }}
            className={cn(
              "ar-touch-press flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/70 sm:size-auto sm:p-2 dark:hover:bg-white/[0.06]",
              heartActive && "text-red-400",
              !interactionsLive && "pointer-events-none opacity-45"
            )}
          >
            <Heart className={cn("size-6", heartActive && "fill-current")} strokeWidth={1.65} />
          </motion.button>
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            disabled={post.optimistic}
            title={post.optimistic ? "Comments unlock after the post syncs." : undefined}
            className={cn(
              "ar-touch-press flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/70 sm:size-auto sm:p-2 dark:hover:bg-white/[0.06]",
              post.optimistic && "pointer-events-none opacity-45"
            )}
            aria-label="Comment"
          >
            <MessageCircle className="size-6" strokeWidth={1.65} />
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={post.optimistic}
            title={post.optimistic ? "Sharing unlocks after the post syncs." : undefined}
            className={cn(
              "ar-touch-press flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/70 sm:size-auto sm:p-2 dark:hover:bg-white/[0.06]",
              post.optimistic && "pointer-events-none opacity-45"
            )}
            aria-label="Share"
          >
            <Send className="size-6" strokeWidth={1.65} />
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
              "ar-touch-press flex size-11 items-center justify-center rounded-full sm:size-auto sm:p-2 text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]",
              savedRemote && "text-primary",
              !interactionsLive && "pointer-events-none opacity-45"
            )}
          >
            <Bookmark className={cn("size-6", savedRemote && "fill-current text-primary")} strokeWidth={1.65} />
          </motion.button>
        </div>

        <div className={cn("flex flex-wrap gap-2 px-0.5 pt-2 sm:gap-1.5 sm:px-0 sm:pt-1 sm:px-0", !interactionsLive && "opacity-45")}>
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
                    "inline-flex min-h-10 min-w-10 items-center gap-1.5 rounded-full px-2 py-1 text-[13px] transition-colors sm:min-h-0 sm:min-w-0",
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
                <span className="text-sm font-medium tabular-nums text-muted-foreground sm:text-[12px]">{Math.max(0, state.count)}</span>
              </motion.button>
            );
          })}
        </div>

        {totalEngagement > 0 && (
          <p className="px-1 pt-2 text-sm font-semibold text-foreground sm:px-0">
            {totalEngagement.toLocaleString()} {totalEngagement === 1 ? "reaction" : "reactions"}
          </p>
        )}

        {post.kind !== "text" && post.kind !== "poll" && (
          <div className="space-y-2 px-0.5 pt-3 sm:space-y-1.5 sm:px-0 sm:pt-3">
            {post.title && <p className="text-base font-semibold leading-snug text-foreground sm:text-[15px]">{post.title}</p>}
            <p className="text-base leading-relaxed text-foreground/90 sm:text-[15px] md:text-base">
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
            className="mx-0 mt-3 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.09] px-4 py-2.5 text-left text-sm text-primary-foreground/95 transition-colors hover:border-primary/35 hover:bg-primary/[0.12] sm:mx-0 sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs"
          >
            <Sparkles className="size-4 shrink-0 text-primary sm:size-3.5" aria-hidden />
            <span className="font-medium">{post.linkedEvent}</span>
            <span className="ml-auto text-xs text-muted-foreground sm:text-[10px]">Open hub</span>
          </button>
        )}

        <button
          type="button"
          disabled={post.optimistic}
          onClick={() => setCommentsOpen((v) => !v)}
          title={post.optimistic ? "Comments unlock after the post syncs." : undefined}
          className={cn(
            "mt-3 flex min-h-11 w-full items-center justify-between gap-2 px-0.5 py-2 text-left text-base font-medium text-muted-foreground transition-colors hover:text-foreground sm:mt-2 sm:min-h-0 sm:px-0 sm:py-1 sm:text-sm",
            post.optimistic && "pointer-events-none opacity-45"
          )}
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
              <div className="border-l border-primary/25 py-2 pl-3 sm:pl-4">
                <FeedCommentList
                  comments={social.commentRows}
                  currentUid={user?.uid}
                  busy={commentBusy}
                  error={commentError ?? socialError}
                  onSubmit={async (text, parentId) => {
                    setCommentBusy(true);
                    setCommentError(null);
                    try {
                      await submitComment(text, parentId);
                    } catch (e) {
                      setCommentError(e instanceof Error ? e.message : "Could not post comment.");
                      throw e;
                    } finally {
                      setCommentBusy(false);
                    }
                  }}
                  onEdit={editComment}
                  onDelete={removeComment}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </article>

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
                {!post.optimistic && (
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
                )}
                {!post.optimistic && (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left font-medium text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
                    onClick={() => void copyPostLink()}
                  >
                    <Link2 className="size-4 opacity-80" aria-hidden />
                    Copy link
                  </button>
                )}
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
                {canDelete && (
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
                        <p className="text-sm font-medium text-foreground">
                          {post.optimistic ? "Discard this draft?" : "Delete this post?"}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {post.optimistic
                            ? "The upload will stop and this draft will be removed from your feed."
                            : "This action cannot be undone."}
                        </p>
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
                            {deleteBusy ? "Deleting…" : post.optimistic ? "Discard" : "Delete"}
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
                        {post.optimistic ? "Discard draft" : "Delete post"}
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

      <FeedMediaLightbox
        state={lightbox}
        onClose={() => setLightbox(null)}
        onPrev={lightboxPrev}
        onNext={lightboxNext}
        reduceMotion={reduceMotion}
      />
    </>
  );
}
