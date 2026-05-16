"use client";

import { updateProfile } from "firebase/auth";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Heart, Loader2, PawPrint, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";

import { MediaSourcePicker } from "@/components/ar-farmhouse/media-source-picker";
import { validateRawImageFile } from "@/lib/image-input";
import { deferMediaCpuWork } from "@/lib/image-scheduler";
import { enqueueMediaUploadTask } from "@/lib/media-upload-queue";
import {
  uploadOptimizedFamilyMemberPhoto,
  uploadOptimizedPetPhoto,
} from "@/lib/profile-photo-upload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ar-farmhouse/user-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { AVATAR_COLOR_PRESETS } from "@/lib/avatar-colors";
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
import { profileHandle, saveUserProfile, subscribeUserProfile } from "@/services/user-profile";
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
    <motion.div
      role="status"
      className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-center text-[13px] leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]"
    >
      {children}
    </motion.div>
  );
}

const REL_OPTIONS: FamilyRelationship[] = ["spouse", "partner", "child", "relative", "other"];

export function ProfileView() {
  const reduceMotion = useReducedMotion();
  const { user, profile: authProfile, refreshProfile, configured } = useAuth();
  const [profile, setProfile] = useState<AppUser | null>(authProfile);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stagingMemberPhotoUrl, setStagingMemberPhotoUrl] = useState<Record<string, string>>({});
  const [stagingPetPhotoUrl, setStagingPetPhotoUrl] = useState<Record<string, string>>({});
  const [photoPickerTarget, setPhotoPickerTarget] = useState<
    { kind: "member"; id: string } | { kind: "pet"; id: string } | null
  >(null);

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
      startTransition(() => {
        setProfile(authProfile);
        syncForm(authProfile);
      });
    }
  }, [authProfile, syncForm]);

  const persist = useCallback(
    async (patch: Parameters<typeof saveUserProfile>[1]) => {
      if (!user) return;
      if (!configured) {
        setSaveError("Wait until sign-in finishes, then try again.");
        return;
      }
      setSaving(true);
      setSaveError(null);
      try {
        const next = await saveUserProfile(user.uid, patch);
        setProfile(next);
        syncForm(next);
        await refreshProfile();
        const auth = tryGetFirebaseAuth();
        if (auth?.currentUser && patch.displayName !== undefined) {
          await updateProfile(auth.currentUser, {
            displayName: next?.displayName ?? auth.currentUser.displayName,
          });
        }
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Could not save profile.");
      } finally {
        setSaving(false);
      }
    },
    [configured, refreshProfile, syncForm, user]
  );

  const members = useMemo(() => profile?.familyMembers ?? [], [profile?.familyMembers]);
  const pets = useMemo(() => profile?.pets ?? [], [profile?.pets]);
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

  const updateMember = useCallback(
    (id: string, patch: Partial<FamilyMember>) => {
      void persist({
        familyMembers: members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
    },
    [members, persist]
  );

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

  const updatePet = useCallback(
    (id: string, patch: Partial<FamilyPet>) => {
      void persist({ pets: pets.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    },
    [pets, persist]
  );

  const removePet = (id: string) => {
    void persist({ pets: pets.filter((p) => p.id !== id) });
  };

  const photoPickerOpen = photoPickerTarget !== null;

  const onPhotoPickerFiles = useCallback(
    (files: File[]) => {
      const file = files[0];
      const target = photoPickerTarget;
      if (!file || !target || !user) return;
      setPhotoPickerTarget(null);

      setSaveError(null);
      try {
        validateRawImageFile(file);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "That file is not supported.");
        return;
      }

      if (target.kind === "member") {
        const memberId = target.id;
        const previousPhoto = members.find((m) => m.id === memberId)?.photoUrl ?? null;
        const localPreview = URL.createObjectURL(file);
        setStagingMemberPhotoUrl((prev) => ({ ...prev, [memberId]: localPreview }));

        void enqueueMediaUploadTask(async () => {
          await deferMediaCpuWork();
          try {
            const url = await uploadOptimizedFamilyMemberPhoto(user.uid, memberId, file);
            updateMember(memberId, { photoUrl: url });
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Upload failed.");
            updateMember(memberId, { photoUrl: previousPhoto ?? null });
          } finally {
            URL.revokeObjectURL(localPreview);
            setStagingMemberPhotoUrl((prev) => {
              const next = { ...prev };
              delete next[memberId];
              return next;
            });
          }
        });
        return;
      }

      const petId = target.id;
      const previousPhoto = pets.find((p) => p.id === petId)?.photoUrl ?? null;
      const localPreview = URL.createObjectURL(file);
      setStagingPetPhotoUrl((prev) => ({ ...prev, [petId]: localPreview }));

      void enqueueMediaUploadTask(async () => {
        await deferMediaCpuWork();
        try {
          const url = await uploadOptimizedPetPhoto(user.uid, petId, file);
          updatePet(petId, { photoUrl: url });
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : "Upload failed.");
          updatePet(petId, { photoUrl: previousPhoto ?? null });
        } finally {
          URL.revokeObjectURL(localPreview);
          setStagingPetPhotoUrl((prev) => {
            const next = { ...prev };
            delete next[petId];
            return next;
          });
        }
      });
    },
    [members, pets, photoPickerTarget, updateMember, updatePet, user]
  );

  const photoPickerCopy =
    photoPickerTarget?.kind === "member"
        ? {
            title: "Family member photo",
            subtitle: "Capture or upload a photo for this person",
            takePhotoLabel: "Take Photo",
            uploadLabel: "Upload Photo",
          }
        : photoPickerTarget?.kind === "pet"
          ? {
              title: "Pet photo",
              subtitle: "Capture or upload a photo for your pet",
              takePhotoLabel: "Take Photo",
              uploadLabel: "Upload Photo",
            }
          : {
              title: "Add photo",
              subtitle: "Choose how you want to add an image",
              takePhotoLabel: "Take Photo",
              uploadLabel: "Upload From Library",
            };

  if (!user) {
    return (
      <div className="pb-20 pt-1">
        <EmptyHint>Sign in to view and edit your household profile.</EmptyHint>
      </div>
    );
  }

  const onboarding = !profile?.displayName?.trim();

  return (
    <div className="pb-24 pt-1">
      <MediaSourcePicker
        sheetOpen={photoPickerOpen}
        onSheetOpenChange={(open) => {
          if (!open) setPhotoPickerTarget(null);
        }}
        onFiles={(files) => void onPhotoPickerFiles(files)}
        disabled={false}
        sheetTitle={photoPickerCopy.title}
        sheetSubtitle={photoPickerCopy.subtitle}
        takePhotoLabel={photoPickerCopy.takePhotoLabel}
        uploadLabel={photoPickerCopy.uploadLabel}
      />

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
            Add your name so posts and bookings show the real you.
          </EmptyHint>
        </div>
      ) : null}

      <div className="mt-8 flex max-w-3xl flex-col gap-5">
        <section className={cn(surface, "p-5")}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <UserAvatar
              name={displayName || "Member"}
              colorId={profile?.avatarColor}
              uid={user.uid}
              className="size-24 rounded-[1.25rem] ring-2 ring-background sm:size-28"
              fallbackClassName="rounded-[1.25rem] text-2xl"
            />
            <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
              <div>
                <p className="font-heading text-xl font-semibold text-foreground">{displayName || "Member"}</p>
                {handle ? <p className="mt-0.5 text-sm text-muted-foreground">@{handle}</p> : null}
                {user.email ? <p className="mt-1 text-[13px] text-muted-foreground">{user.email}</p> : null}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Avatar color</p>
                <motion.div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {AVATAR_COLOR_PRESETS.map((preset) => {
                    const selected = profile?.avatarColor === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-label={`${preset.label} background`}
                        aria-pressed={selected}
                        disabled={saving}
                        onClick={() => void persist({ avatarColor: preset.id })}
                        className={cn(
                          "size-9 rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                          preset.bg,
                          selected ? preset.ring : "ring-transparent opacity-75 hover:opacity-100"
                        )}
                      />
                    );
                  })}
                </motion.div>
              </div>
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
                      onClick={() => setPhotoPickerTarget({ kind: "member", id: m.id })}
                      aria-label={`Change photo for ${m.name}`}
                    >
                      <Avatar className="size-14 rounded-xl">
                        <AvatarImage src={stagingMemberPhotoUrl[m.id] ?? m.photoUrl ?? undefined} alt="" />
                        <AvatarFallback className="rounded-xl">{m.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <Camera className="absolute -bottom-0.5 -right-0.5 size-3.5 text-primary" aria-hidden />
                    </button>
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
                <button
                  type="button"
                  className="relative shrink-0"
                  onClick={() => setPhotoPickerTarget({ kind: "pet", id: pet.id })}
                  aria-label={`Change photo for ${pet.name}`}
                >
                  <Avatar className="size-14 rounded-xl">
                    <AvatarImage src={stagingPetPhotoUrl[pet.id] ?? pet.photoUrl ?? undefined} alt="" />
                    <AvatarFallback className="rounded-xl">{pet.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <Camera className="absolute -bottom-0.5 -right-0.5 size-3.5 text-primary" aria-hidden />
                </button>
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
