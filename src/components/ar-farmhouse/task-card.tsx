"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check, GripVertical, MessageSquare } from "lucide-react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HouseTask, TaskPriority } from "@/lib/property-operations";
import { cn } from "@/lib/utils";

const priorityRing: Record<TaskPriority, string> = {
  low: "ring-emerald-400/35",
  medium: "ring-amber-300/40",
  high: "ring-orange-400/45",
  emergency: "ring-rose-400/55",
};

const priorityDot: Record<TaskPriority, string> = {
  low: "bg-emerald-400/80",
  medium: "bg-amber-300/85",
  high: "bg-orange-400/90",
  emergency: "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.45)]",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export type TaskCardProps = {
  task: HouseTask;
  dragHandle?: boolean;
  dragListeners?: DraggableSyntheticListeners;
  dragAttributes?: DraggableAttributes;
  isDragging?: boolean;
  onToggleDone?: (id: string) => void;
};

export function TaskCard({
  task,
  dragHandle,
  dragListeners,
  dragAttributes,
  isDragging,
  onToggleDone,
}: TaskCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: isDragging ? 0.92 : 1, scale: isDragging ? 1.02 : 1 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_18px_50px_-32px_rgba(0,0,0,0.72)] backdrop-blur-xl",
        "ring-1 ring-inset ring-transparent",
        priorityRing[task.priority],
        task.done && "opacity-75",
        isDragging && "z-20 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.85)]"
      )}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1 rounded-l-2xl", priorityDot[task.priority])} aria-hidden />

      <div className="flex gap-3 pl-4 pr-3 pt-4 sm:gap-2 sm:pl-4 sm:pr-3.5 sm:pt-3">
        {dragHandle && (
          <button
            type="button"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground sm:h-8 sm:w-6"
            aria-label="Drag to reorder"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm" className="ring-2 ring-background/80">
                <AvatarImage src={task.assignee.avatar} alt="" />
                <AvatarFallback>{initials(task.assignee.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold leading-snug text-foreground", task.done && "line-through")}>
                  {task.title}
                </p>
                <p className="text-sm text-muted-foreground sm:text-[11px]">{task.dueLabel}</p>
              </div>
            </div>
            {onToggleDone && (
              <motion.button
                type="button"
                onClick={() => onToggleDone(task.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                className={cn(
                  "ar-touch-press flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors sm:size-9",
                  task.done
                    ? "border-primary/40 bg-primary/20 text-primary"
                    : "border-white/12 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:text-foreground"
                )}
                aria-label={task.done ? "Mark not done" : "Mark done"}
              >
                <Check className="size-4" strokeWidth={2.5} />
              </motion.button>
            )}
          </div>

          {task.photoThumbs && task.photoThumbs.length > 0 && (
            <div className="flex gap-1.5">
              {task.photoThumbs.map((src) => (
                <div key={src} className="relative size-14 overflow-hidden rounded-xl border border-white/10 sm:size-16">
                  <Image src={src} alt="" fill className="object-cover" sizes="64px" />
                </div>
              ))}
            </div>
          )}

          {task.commentsPreview.length > 0 && (
            <div className="flex items-start gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[11px] text-muted-foreground">
              <MessageSquare className="mt-0.5 size-3 shrink-0 text-primary/80" aria-hidden />
              <p>
                <span className="font-medium text-foreground">{task.commentsPreview[0].author}</span>{" "}
                {task.commentsPreview[0].text}
                {task.commentsPreview.length > 1 && (
                  <span className="text-muted-foreground/80"> · +{task.commentsPreview.length - 1}</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
