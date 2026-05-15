"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, UserPlus } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";

import { ArFarmhouseLogo } from "@/components/ar-farmhouse/ar-farmhouse-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { readRegistrationPolicy } from "@/lib/auth-gate";
import { PROPERTY_HERO_IMAGE_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LEN = 6;

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type AuthView = "signIn" | "register" | "forgotPassword";

export function LoginScreen() {
  const reduceMotion = useReducedMotion();
  const { signInWithEmail, signUpWithEmail, sendPasswordResetForEmail, clearError, registrationAvailable } =
    useAuth();
  const registrationPolicy = readRegistrationPolicy();
  const showRegistrationCta = registrationAvailable;
  const [view, setView] = useState<AuthView>("signIn");
  const [pending, setPending] = useState<null | "auth" | "reset">(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
  }>({});
  const [resetSent, setResetSent] = useState(false);

  const busy = pending !== null;

  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);

  const transitionTo = useCallback(
    (next: AuthView) => {
      if (next === "register" && !registrationAvailable) return;
      setFormError(null);
      clearFieldErrors();
      clearError();
      if (next !== "forgotPassword") {
        setResetSent(false);
        setConfirmPassword("");
      }
      if (next === "signIn") {
        setConfirmPassword("");
      }
      setView(next);
    },
    [clearError, clearFieldErrors, registrationAvailable]
  );

  const activeView: AuthView = view === "register" && !registrationAvailable ? "signIn" : view;

  function validateCredentials(forRegister: boolean): boolean {
    const next: typeof fieldErrors = {};
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      next.email = "Enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    } else if (forRegister && password.length < MIN_PASSWORD_LEN) {
      next.password = `Use at least ${MIN_PASSWORD_LEN} characters.`;
    }
    if (forRegister && !displayName.trim()) {
      next.displayName = "Add a display name for your profile.";
    }
    if (forRegister && password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateForgot(): boolean {
    const next: typeof fieldErrors = {};
    if (!email.trim()) {
      next.email = "Enter the email for your account.";
    } else if (!isValidEmail(email)) {
      next.email = "Enter a valid email address.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleAuthSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const forRegister = activeView === "register";
    if (!validateCredentials(forRegister)) return;

    setPending("auth");
    try {
      if (forRegister) {
        await signUpWithEmail(email, password, displayName.trim());
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleResetSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setResetSent(false);
    if (!validateForgot()) return;

    setPending("reset");
    try {
      await sendPasswordResetForEmail(email);
      setResetSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setPending(null);
    }
  }

  const showRegisterFields = activeView === "register";
  const showPasswordField = activeView === "signIn" || activeView === "register";

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
            src={PROPERTY_HERO_IMAGE_URL}
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
              className="mb-6"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
            >
              <ArFarmhouseLogo size={72} priority className="shadow-[0_12px_40px_-16px_rgba(0,0,0,0.35)]" />
            </motion.div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              {activeView === "forgotPassword" ? "Reset password" : "AR Farmhouse"}
            </h1>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              {activeView === "forgotPassword"
                ? "We will email you a secure link to choose a new password."
                : "Private family property network"}
            </p>
          </div>

          {activeView !== "forgotPassword" && (
            <>
              {showRegistrationCta ? (
                <motion.div
                  className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1"
                  layout={!reduceMotion}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => transitionTo("signIn")}
                    className={cn(
                      "rounded-[0.85rem] py-2 text-xs font-medium transition-colors",
                      activeView === "signIn"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => transitionTo("register")}
                    className={cn(
                      "rounded-[0.85rem] py-2 text-xs font-medium transition-colors",
                      activeView === "register"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Create account
                  </button>
                </motion.div>
              ) : (
                <p className="mb-4 rounded-2xl border border-primary/20 bg-primary/[0.08] px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
                  Secure sign-in · your session stays signed in on this device until you sign out.
                </p>
              )}
            </>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {activeView === "forgotPassword" ? (
              <motion.form
                key="forgot"
                onSubmit={handleResetSubmit}
                className="space-y-4"
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="space-y-2">
                  <label className="sr-only" htmlFor="reset-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="Email"
                      value={email}
                      onChange={(ev) => {
                        setEmail(ev.target.value);
                        if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                      }}
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors.email)}
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-[15px] placeholder:text-muted-foreground/80"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="px-1 text-xs text-amber-200/95" role="status">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {resetSent && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="flex gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-100/95">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
                        <span>
                          If that address is registered, you will receive reset instructions shortly. Check your inbox
                          and spam folder, then return here to sign in.
                        </span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {formError && (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200/95">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  className="mt-1 h-11 w-full rounded-2xl text-[15px] font-medium shadow-[0_12px_40px_-16px_oklch(0.55_0.08_158_/_0.65)]"
                  size="lg"
                >
                  {pending === "reset" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => transitionTo("signIn")}
                  className="flex w-full items-center justify-center gap-2 text-center text-xs font-medium text-primary/90 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Back to sign in
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="auth"
                onSubmit={handleAuthSubmit}
                className="space-y-4"
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <AnimatePresence initial={false}>
                  {showRegisterFields && (
                    <motion.div
                      className="space-y-2"
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="sr-only" htmlFor="displayName">
                        Display name
                      </label>
                      <div className="relative">
                        <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="displayName"
                          name="displayName"
                          type="text"
                          autoComplete="name"
                          placeholder="Display name"
                          value={displayName}
                          onChange={(ev) => {
                            setDisplayName(ev.target.value);
                            if (fieldErrors.displayName) setFieldErrors((f) => ({ ...f, displayName: undefined }));
                          }}
                          disabled={busy}
                          aria-invalid={Boolean(fieldErrors.displayName)}
                          className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-[15px] placeholder:text-muted-foreground/80"
                        />
                      </div>
                      {fieldErrors.displayName && (
                        <p className="px-1 text-xs text-amber-200/95" role="status">
                          {fieldErrors.displayName}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      value={email}
                      onChange={(ev) => {
                        setEmail(ev.target.value);
                        if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                      }}
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors.email)}
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-[15px] placeholder:text-muted-foreground/80"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="px-1 text-xs text-amber-200/95" role="status">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {showPasswordField && (
                    <motion.div
                      className="space-y-2"
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="sr-only" htmlFor="password">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type={passwordRevealed ? "text" : "password"}
                          autoComplete={activeView === "register" ? "new-password" : "current-password"}
                          placeholder="Password"
                          value={password}
                          onChange={(ev) => {
                            setPassword(ev.target.value);
                            if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                            if (fieldErrors.confirmPassword) {
                              setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
                            }
                          }}
                          disabled={busy}
                          aria-invalid={Boolean(fieldErrors.password)}
                          className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 pr-11 text-[15px] placeholder:text-muted-foreground/80"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          disabled={busy}
                          onClick={() => setPasswordRevealed((v) => !v)}
                          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-50"
                          aria-label={passwordRevealed ? "Hide password" : "Show password"}
                        >
                          {passwordRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="px-1 text-xs text-amber-200/95" role="status">
                          {fieldErrors.password}
                        </p>
                      )}
                      {activeView === "register" && !fieldErrors.password && (
                        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/80">
                          At least {MIN_PASSWORD_LEN} characters. Use a phrase only your family would guess.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {showRegisterFields && (
                    <motion.div
                      className="space-y-2"
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="sr-only" htmlFor="confirmPassword">
                        Confirm password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={passwordRevealed ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(ev) => {
                            setConfirmPassword(ev.target.value);
                            if (fieldErrors.confirmPassword) {
                              setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
                            }
                          }}
                          disabled={busy}
                          aria-invalid={Boolean(fieldErrors.confirmPassword)}
                          className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-[15px] placeholder:text-muted-foreground/80"
                        />
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="px-1 text-xs text-amber-200/95" role="status">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeView === "signIn" && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => transitionTo("forgotPassword")}
                      className="text-xs font-medium text-primary/90 underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {formError && (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200/95">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  className="mt-1 h-11 w-full rounded-2xl text-[15px] font-medium shadow-[0_12px_40px_-16px_oklch(0.55_0.08_158_/_0.65)]"
                  size="lg"
                >
                  {pending === "auth" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      {activeView === "register" ? "Creating account…" : "Signing in…"}
                    </>
                  ) : activeView === "register" ? (
                    "Create account"
                  ) : (
                    "Sign in"
                  )}
                </Button>

                {!showRegistrationCta ? (
                  activeView === "register" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => transitionTo("signIn")}
                      className="w-full text-center text-xs font-medium text-primary/90 underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Back to sign in
                    </button>
                  ) : (
                    <p className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-2.5 text-center text-xs leading-relaxed text-muted-foreground">
                      New accounts are invite-only. Sign in if you already have access, or contact your family admin
                      for an invite.
                    </p>
                  )
                ) : null}

                {activeView === "register" && registrationAvailable && registrationPolicy.allowlistEmails.size > 0 && (
                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground/85">
                    Registration is limited to invited family emails.
                  </p>
                )}

                <p className="pt-2 text-center text-xs text-muted-foreground/90">
                  Encrypted session · family-only feed and storage
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
