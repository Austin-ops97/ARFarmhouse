"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useInViewReady } from "@/lib/use-in-view-ready";
import type { UiFeedPost } from "@/models/feed-post";
import { useFeedPosts } from "@/contexts/feed-posts-context";

function previewLine(post: UiFeedPost) {
  const line = (post.title ? `${post.title} — ${post.body}` : post.body).trim();
  if (line.length <= 120) return line;
  return `${line.slice(0, 120)}…`;
}

export function HomeFeedPreview() {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();
  const { ref, inView } = useInViewReady("240px 0px");
  const { posts: allPosts, loading, error } = useFeedPosts();
  const posts = inView ? allPosts.slice(0, 5) : [];

  return (
    <section ref={ref} className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Family feed</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Latest from everyone
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            A short snapshot of recent posts. Open the feed for the full thread, reactions, and comments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => goTo("feed")}
          className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-primary/85"
        >
          Open feed
          <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
          Feed preview could not sync: {error}
        </p>
      )}

      <div className="mt-8 divide-y divide-white/[0.06] rounded-3xl bg-white/[0.02] px-2 ring-1 ring-white/[0.05] backdrop-blur-sm sm:px-4">
        {!inView || loading ? (
          <div className="space-y-4 py-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md bg-white/[0.06]" />
                  <Skeleton className="h-3 w-full max-w-lg rounded-md bg-white/[0.05]" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0 rounded-md bg-white/[0.05] sm:mt-1" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-foreground">No family updates yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Post a photo from the property to start the thread.</p>
          </div>
        ) : (
          posts.map((post, idx) => (
            <motion.article
              key={post.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ delay: reduceMotion ? 0 : idx * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-2 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:py-6"
            >
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-foreground">{post.author.name}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{previewLine(post)}</p>
              </div>
              <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80 sm:pt-0.5">{post.timeLabel}</p>
            </motion.article>
          ))
        )}
      </div>
    </section>
  );
}
