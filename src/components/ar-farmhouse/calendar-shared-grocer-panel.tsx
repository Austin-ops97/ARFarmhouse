"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import {
  createSharedGroceryItem,
  subscribeSharedGroceryItems,
  updateSharedGroceryItem,
  deleteSharedGroceryItem,
  type SharedGroceryItemRow,
} from "@/services/property-data";
import { cn } from "@/lib/utils";

const surface =
  "ar-surface-raised relative min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl";

export function CalendarSharedGrocerPanel() {
  const { user, displayName, configured } = useAuth();
  const [items, setItems] = useState<SharedGroceryItemRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mealTitle, setMealTitle] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [grocerTitle, setGrocerTitle] = useState("");

  useEffect(() => {
    return subscribeSharedGroceryItems(
      (rows) => {
        setItems(rows);
        setLoadError(null);
      },
      (e) => setLoadError(e.message)
    );
  }, []);

  const meals = useMemo(() => items.filter((i) => i.kind === "meal"), [items]);
  const groceries = useMemo(() => items.filter((i) => i.kind === "grocery"), [items]);

  const toggleDone = async (row: SharedGroceryItemRow) => {
    if (!user || !configured) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateSharedGroceryItem(row.id, { done: !row.done });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  const claimToggle = async (row: SharedGroceryItemRow) => {
    if (!user || !configured) return;
    const mine = row.claimedByUid === user.uid;
    setBusy(true);
    setActionError(null);
    try {
      await updateSharedGroceryItem(row.id, {
        claimedByUid: mine ? "" : user.uid,
        claimedByName: mine ? "" : displayName,
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not claim.");
    } finally {
      setBusy(false);
    }
  };

  const addMeal = async () => {
    if (!user || !configured) return;
    const label = mealTitle.trim();
    if (!label) return;
    setBusy(true);
    setActionError(null);
    try {
      await createSharedGroceryItem({
        kind: "meal",
        label,
        assignmentHint: mealNotes.trim(),
        createdByUid: user.uid,
      });
      setMealTitle("");
      setMealNotes("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not add meal.");
    } finally {
      setBusy(false);
    }
  };

  const addGrocer = async () => {
    if (!user || !configured) return;
    const label = grocerTitle.trim();
    if (!label) return;
    setBusy(true);
    setActionError(null);
    try {
      await createSharedGroceryItem({
        kind: "grocery",
        label,
        createdByUid: user.uid,
      });
      setGrocerTitle("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not add item.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: SharedGroceryItemRow) => {
    if (!user) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteSharedGroceryItem(row.id, user.uid, row.createdByUid);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove.");
    } finally {
      setBusy(false);
    }
  };

  const canUse = Boolean(user && configured);

  return (
    <div className={cn(surface, "p-4 sm:p-5")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-primary/90">Trip coordination</p>
      <h3 className="mt-1 font-heading text-lg font-semibold tracking-tight text-foreground">
        Shared grocery & meal planning
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        One collaborative list — claim meals and groceries, check off what is covered.
      </p>

      {(loadError || actionError) && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError ?? loadError}
        </p>
      )}

      {!canUse && (
        <p className="mt-3 text-sm text-muted-foreground">Sign in to coordinate lists with everyone at the farmhouse.</p>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Meals</p>
          <ul className="mt-2 space-y-2">
            {meals.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border/50 px-3 py-4 text-sm text-muted-foreground dark:border-white/10">
                Who is covering dinner, brunch, snacks — add meals here so the house stays aligned.
              </li>
            ) : (
              meals.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/45 bg-white/[0.03] px-3 py-2.5 dark:border-white/[0.08]"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleDone(m)}
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                      m.done
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/55 bg-muted/40 dark:border-white/12"
                    )}
                    aria-label={m.done ? "Mark not done" : "Mark done"}
                  >
                    {m.done && <Check className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium text-foreground", m.done && "text-muted-foreground line-through")}>
                      {m.label}
                    </p>
                    {m.assignmentHint ? <p className="text-[11px] text-muted-foreground">{m.assignmentHint}</p> : null}
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !canUse}
                        onClick={() => void claimToggle(m)}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        {m.claimedByName ? `Hosted / claimed · ${m.claimedByName}` : "I am covering this meal"}
                      </button>
                      {canUse && user?.uid === m.createdByUid && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(m)}
                          className="text-[11px] text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
                placeholder="Meal (e.g. Saturday dinner)"
                className="rounded-xl sm:flex-1"
                disabled={!canUse}
              />
              <Input
                value={mealNotes}
                onChange={(e) => setMealNotes(e.target.value)}
                placeholder="Chef, theme, dietary notes…"
                className="rounded-xl sm:flex-1"
                disabled={!canUse}
              />
              <Button
                type="button"
                size="sm"
                className="rounded-xl sm:shrink-0"
                disabled={!canUse || busy || !mealTitle.trim()}
                onClick={() => void addMeal()}
              >
                <Plus className="size-4" data-icon="inline-start" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Groceries & supplies</p>
          <ul className="mt-2 space-y-2">
            {groceries.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border/50 px-3 py-4 text-sm text-muted-foreground dark:border-white/10">
                Eggs, firewood, propane — whoever is swinging by the store can claim items below.
              </li>
            ) : (
              groceries.map((g) => (
                <li
                  key={g.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/45 bg-white/[0.03] px-3 py-2.5 dark:border-white/[0.08]"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleDone(g)}
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                      g.done
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/55 bg-muted/40 dark:border-white/12"
                    )}
                    aria-label={g.done ? "Mark not purchased" : "Purchased"}
                  >
                    {g.done && <Check className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium text-foreground", g.done && "text-muted-foreground line-through")}>
                      {g.label}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !canUse}
                        onClick={() => void claimToggle(g)}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        {g.claimedByName ? `Bringing · ${g.claimedByName}` : "I will bring this"}
                      </button>
                      {canUse && user?.uid === g.createdByUid && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(g)}
                          className="text-[11px] text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input
              value={grocerTitle}
              onChange={(e) => setGrocerTitle(e.target.value)}
              placeholder="Add grocery item"
              className="rounded-xl"
              disabled={!canUse}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addGrocer();
              }}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-xl"
              disabled={!canUse || busy || !grocerTitle.trim()}
              onClick={() => void addGrocer()}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
