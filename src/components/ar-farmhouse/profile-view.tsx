"use client";

import { updateProfile } from "firebase/auth";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Heart, Loader2, PawPrint, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { tryGetFirebaseAuth } from "@/lib/firebase";
import {
  createFamilyMemberId,
  createPetId,
  RELATIONSHIP_LABELS,
  type FamilyMember,
  type FamilyPet,
  type FamilyRelationship,
} from "@/models/family-profile";
import type { AppUser } from "@/models/user";
import { profileHandle } from "@/services/user-profile";
import {
  uploadFamilyMemberPhoto,
  uploadPetPhoto,
  uploadProfilePhoto,
} from "@/services/profile-storage";
import { saveUserProfile, subscribeUserProfile } from "@/services/user-profile";
import { cn } from "@/lib/utils";

const surface = "ar-surface-raised overflow-hidden rounded-[1.35rem]";

function ProfileSection({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn(surface)}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      <div className="space-y-4 px-4 pb-5">{children}</div>
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/45 px-4 py-3.5 dark:border-white/[0.06]">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
        {subtitle ? <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-center text-[13px] leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]">
      {children}
    </p>
  );
}

const REL_OPTIONS: FamilyRelationship[] = ["spouse", "partner", "child", "relative", "other"];

export function ProfileView() {
  const reduceMotion = useReducedMotion();
  const photoInputId = useId();
  const { user, profile: authProfile, refreshProfile, configured } = useAuth();
  const [profile, setProfile] = useState<AppUser | null>(authProfile);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [hometown, setHometown] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  const syncForm = useCallback((p: AppUser | null) => {
    if (!p) return;
    setDisplayName(p.displayName);
    setUsername(p.username ?? "");
    setBio(p.bio ?? "");
    setHometown(p.hometown ?? "");
    setPhone(p.phone ?? "");
    setBirthday(p.birthday ?? "");
  }, []);

  useEffect(() => {
    if (!user?.uid || !configured) return;
    const unsub = subscribeUserProfile(user.uid, (p) => {
      setProfile(p);
      syncForm(p);
    });
    return unsub;
  }, [configured, syncForm, user?.uid]);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      syncForm(authProfile);
    }
  }, [authProfile, syncForm]);

  const persist = useCallback(
    async (patch: Parameters<typeof saveUserProfile>[1]) => {
      if (!user) return;
      setSaving(true);
      setSaveError(null);
      try {
        const next = await saveUserProfile(user.uid, patch);
        setProfile(next);
        syncForm(next);
        await refreshProfile();
        const auth = tryGetFirebaseAuth();
        if (auth?.currentUser && (patch.displayName !== undefined || patch.avatar !== undefined)) {
          await updateProfile(auth.currentUser, {
            displayName: next?.displayName ?? auth.currentUser.displayName,
            photoURL: next?.avatar ?? auth.currentUser.photoURL,
          });
        }
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Could not save profile.");
      } finally {
        setSaving(false);
      }
    },
    [refreshProfile, syncForm, user]
  );

  const onProfilePhoto = useCallback(
    async (file: File) => {
      if (!user) return;
      setUploadingPhoto(true);
      setSaveError(null);
      try {
        const url = await uploadProfilePhoto(user.uid, file);
        await persist({ avatar: url });
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Photo upload failed.");
      } finally {
        setUploadingPhoto(false);
      }
    },
    [persist, user]
  );

  const members = profile?.familyMembers ?? [];
  const pets = profile?.pets ?? [];
  const handle = profile ? profileHandle(profile) : "";

  const addMember = (relationship: FamilyRelationship) => {
    const member: FamilyMember = {
      id: createFamilyMemberId(),
      name: relationship === "child" ? "Child" : "Family member",
      relationship,
      photoUrl: null,
      birthday: null,
      notes: null,
    };
    void persist({ familyMembers: [...members, member] });
  };

  const updateMember = (id: string, patch: Partial<FamilyMember>) => {
    void persist({
      familyMembers: members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  };

  const removeMember = (id: string) => {
    void persist({ familyMembers: members.filter((m) => m.id !== id) });
  };

  const addPet = () => {
    const pet: FamilyPet = {
      id: createPetId(),
      name: "Pet",
      species: "Dog",
      breed: null,
      notes: null,
      photoUrl: null,
    };
    void persist({ pets: [...pets, pet] });
  };

  const updatePet = (id: string, patch: Partial<FamilyPet>) => {
    void persist({ pets: pets.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };

  const removePet = (id: string) => {
    void persist({ pets: pets.filter((p) => p.id !== id) });
  };

  const memberPhotoRef = useRef<Record<string, HTMLInputElement | null>>({});
  const petPhotoRef = useRef<Record<string, HTMLInputElement | null>>({});

  if (!user) {
    return (
      <div className="pb-20 pt-1">
        <EmptyHint>Sign in to view and edit your household profile.</EmptyHint>
      </div>
    );
  }

  const onboarding = !profile?.avatar || !profile.displayName?.trim();

  return (
    <div className="pb-24 pt-1">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl space-y-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Household
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Profile</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Your identity for the feed, calendar bookings, and family stays — photos stay private to signed-in members.
        </p>
      </motion.header>

      {onboarding ? (
        <div className="mt-6 max-w-3xl">
          <EmptyHint>
            <Heart className="mx-auto mb-2 size-5 text-primary/80" aria-hidden />
            Complete your family profile — add a photo and name so posts and bookings show the real you.
          </EmptyHint>
        </div>
      ) : null}

      <div className="mt-8 flex max-w-3xl flex-col gap-5">
        <section className={cn(surface, "p-5")}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative">
              <Avatar className="size-24 rounded-[1.25rem] ring-2 ring-background sm:size-28">
                <AvatarImage src={profile?.avatar ?? undefined} alt="" className="object-cover" />
                <AvatarFallback className="rounded-[1.25rem] text-2xl font-semibold">
                  {displayName.slice(0, 1) || "?"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor={photoInputId}
                className="absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm dark:border-white/12 dark:bg-background"
              >
                {uploadingPhoto ? (
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                ) : (
                  <Camera className="size-4 text-primary" aria-hidden />
                )}
                <span className="sr-only">Upload profile photo</span>
              </label>
              <input
                id={photoInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onProfilePhoto(f);
                }}
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-heading text-xl font-semibold text-foreground">{displayName || "Member"}</p>
              {handle ? <p className="mt-0.5 text-sm text-muted-foreground">@{handle}</p> : null}
              {user.email ? <p className="mt-1 text-[13px] text-muted-foreground">{user.email}</p> : null}
            </div>
          </div>
        </section>

        <ProfileSection title="About you" subtitle="Shown on posts and booking requests when you travel.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="profile-name">
                Display name
              </label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="profile-username">
                Username
              </label>
              <Input
                id="profile-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. austin"
                className="h-11 rounded-2xl"
              />
            </div>
            <Field id="profile-birthday" label="Birthday" type="date" value={birthday} onChange={setBirthday} />
            <Field id="profile-hometown" label="Hometown" value={hometown} onChange={setHometown} />
            <Field id="profile-phone" label="Phone" value={phone} onChange={setPhone} />
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="profile-bio">
                Bio
              </label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A line about you at the farmhouse…"
                className="min-h-[88px] rounded-2xl"
              />
            </div>
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-2xl sm:w-auto"
            disabled={saving}
            onClick={() =>
              void persist({
                displayName: displayName.trim() || "Member",
                username: username.trim() || null,
                bio,
                hometown,
                phone,
                birthday,
              })
            }
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
          {saveError ? <p className="text-center text-xs text-red-400/95 sm:text-left">{saveError}</p> : null}
        </ProfileSection>

        <ProfileSection
          title="Family"
          subtitle="Partner, children, and relatives — pick them when you book a stay."
          action={
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => addMember("child")}>
              <Plus className="mr-1 size-3.5" aria-hidden />
              Add
            </Button>
          }
        >
          {members.length === 0 ? (
            <EmptyHint>
              <UserRound className="mx-auto mb-2 size-5 text-primary/70" aria-hidden />
              Add your first family member — spouse, kids, or relatives who visit the farmhouse.
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(["spouse", "child", "relative"] as const).map((rel) => (
                  <Button key={rel} type="button" size="sm" variant="secondary" className="rounded-xl" onClick={() => addMember(rel)}>
                    {RELATIONSHIP_LABELS[rel]}
                  </Button>
                ))}
              </div>
            </EmptyHint>
          ) : (
            <AnimatePresence initial={false}>
              {members.map((m) => (
                <motion.div
                  key={m.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                  className="ar-nested-well space-y-3 rounded-2xl p-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="relative shrink-0"
                      onClick={() => memberPhotoRef.current[m.id]?.click()}
                    >
                      <Avatar className="size-14 rounded-xl">
                        <AvatarImage src={m.photoUrl ?? undefined} alt="" />
                        <AvatarFallback className="rounded-xl">{m.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <Camera className="absolute -bottom-0.5 -right-0.5 size-3.5 text-primary" aria-hidden />
                    </button>
                    <input
                      ref={(el) => {
                        memberPhotoRef.current[m.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f || !user) return;
                        try {
                          const url = await uploadFamilyMemberPhoto(user.uid, m.id, f);
                          updateMember(m.id, { photoUrl: url });
                        } catch (err) {
                          setSaveError(err instanceof Error ? err.message : "Upload failed.");
                        }
                      }}
                    />
                    <Field
                      id={`member-name-${m.id}`}
                      label="Name"
                      value={m.name}
                      onChange={(v) => updateMember(m.id, { name: v })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => removeMember(m.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Relationship</label>
                      <select
                        value={m.relationship}
                        onChange={(e) =>
                          updateMember(m.id, { relationship: e.target.value as FamilyRelationship })
                        }
                        className="h-10 w-full rounded-xl border border-border/60 bg-card/80 px-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        {REL_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {RELATIONSHIP_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field
                      id={`member-bday-${m.id}`}
                      label="Birthday"
                      type="date"
                      value={m.birthday ?? ""}
                      onChange={(v) => updateMember(m.id, { birthday: v || null })}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </ProfileSection>

        <ProfileSection
          title="Pets"
          subtitle="Dogs, cats, and barn friends — included on bookings when they travel with you."
          action={
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={addPet}>
              <Plus className="mr-1 size-3.5" aria-hidden />
              Pet
            </Button>
          }
        >
          {pets.length === 0 ? (
            <EmptyHint>
              <PawPrint className="mx-auto mb-2 size-5 text-primary/70" aria-hidden />
              No pets yet — add one if they join you at the farmhouse.
            </EmptyHint>
          ) : (
            pets.map((pet) => (
              <div key={pet.id} className="ar-nested-well flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-start">
                <button type="button" className="relative shrink-0" onClick={() => petPhotoRef.current[pet.id]?.click()}>
                  <Avatar className="size-14 rounded-xl">
                    <AvatarImage src={pet.photoUrl ?? undefined} alt="" />
                    <AvatarFallback className="rounded-xl">{pet.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <Camera className="absolute -bottom-0.5 -right-0.5 size-3.5 text-primary" aria-hidden />
                </button>
                <input
                  ref={(el) => {
                    petPhotoRef.current[pet.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f || !user) return;
                    try {
                      const url = await uploadPetPhoto(user.uid, pet.id, f);
                      updatePet(pet.id, { photoUrl: url });
                    } catch (err) {
                      setSaveError(err instanceof Error ? err.message : "Upload failed.");
                    }
                  }}
                />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Field id={`pet-name-${pet.id}`} label="Name" value={pet.name} onChange={(v) => updatePet(pet.id, { name: v })} />
                  <Field id={`pet-species-${pet.id}`} label="Species" value={pet.species} onChange={(v) => updatePet(pet.id, { species: v })} />
                  <Field id={`pet-breed-${pet.id}`} label="Breed" value={pet.breed ?? ""} onChange={(v) => updatePet(pet.id, { breed: v || null })} />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 self-start text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${pet.name}`}
                  onClick={() => removePet(pet.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </ProfileSection>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-2xl" />
    </div>
  );
}
