"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Mail, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginBackdrop } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type LoginScreenProps = {
  onLogin: () => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    window.requestAnimationFrame(() => onLogin());
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={reduceMotion ? false : { scale: 1.08 }}
          animate={reduceMotion ? undefined : { scale: 1 }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 28, ease: [0.25, 0.1, 0.25, 1], repeat: Infinity, repeatType: "reverse" }
          }
        >
          <Image
            src={loginBackdrop}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/55 to-background/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.55_0.08_158_/_0.12),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_oklch(0.2_0.02_250_/_0.35),_transparent_50%)]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-[420px]"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={cn(
            "rounded-[2rem] border border-white/12 bg-white/[0.05] p-8 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.85)] backdrop-blur-2xl backdrop-saturate-150",
            "sm:p-10"
          )}
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-inner shadow-white/5"
              whileHover={reduceMotion ? undefined : { scale: 1.04, rotate: -1.5 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Sparkles className="size-7 text-primary" aria-hidden />
            </motion.div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              AR Farmhouse
            </h1>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              Private family property network
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  defaultValue="family@arfarmhouse.co"
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-[15px] placeholder:text-muted-foreground/80"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="sr-only" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  defaultValue="demo-only"
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-[15px] placeholder:text-muted-foreground/80"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-2xl text-[15px] font-medium shadow-[0_12px_40px_-16px_oklch(0.55_0.08_158_/_0.65)]"
              size="lg"
            >
              Enter property
            </Button>

            <p className="pt-2 text-center text-xs text-muted-foreground/90">
              Demo experience · no authentication
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
