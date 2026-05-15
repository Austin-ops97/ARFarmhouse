"use client";

import { PawPrint, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FamilyMember } from "@/models/family-profile";
import { RELATIONSHIP_LABELS } from "@/models/family-profile";
import type { AppUser } from "@/models/user";
import { cn } from "@/lib/utils";

import type { BookingAttendeeSelection } from "@/models/family-profile";

export type { BookingAttendeeSelection };

type BookingAttendeePickerProps = {
  profile: AppUser;
  value: BookingAttendeeSelection;
  onChange: (next: BookingAttendeeSelection) => void;
};

function Chip({
  active,
  onClick,
  label,
  sub,
  photoUrl,
  fallback,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  photoUrl?: string | null;
  fallback: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/40 bg-primary/12"
          : "border-border/60 bg-muted/30 hover:border-border dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/16"
      )}
    >
      <Avatar className="size-9 shrink-0 rounded-xl">
        {photoUrl ? <AvatarImage src={photoUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback className="rounded-xl text-xs font-semibold">{fallback}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {sub ? <span className="block truncate text-[11px] text-muted-foreground">{sub}</span> : null}
      </span>
      {icon}
    </button>
  );
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function MemberGroup({
  title,
  members,
  selectedIds,
  onToggle,
}: {
  title: string;
  members: FamilyMember[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (members.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <AttendeeGrid>
        {members.map((m) => (
          <Chip
            key={m.id}
            active={selectedIds.includes(m.id)}
            onClick={() => onToggle(m.id)}
            label={m.name}
            sub={RELATIONSHIP_LABELS[m.relationship]}
            photoUrl={m.photoUrl}
            fallback={m.name.slice(0, 1)}
          />
        ))}
      </AttendeeGrid>
    </div>
  );
}

function AttendeeGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>;
}

export function BookingAttendeePicker({ profile, value, onChange }: BookingAttendeePickerProps) {
  const spouse = profile.familyMembers.filter(
    (m) => m.relationship === "spouse" || m.relationship === "partner"
  );
  const children = profile.familyMembers.filter((m) => m.relationship === "child");
  const relatives = profile.familyMembers.filter(
    (m) => m.relationship === "relative" || m.relationship === "other"
  );

  const toggleMember = (id: string) => {
    onChange({ ...value, memberIds: toggleId(value.memberIds, id) });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Who is coming?</p>
      <AttendeeGrid>
        <Chip
          active={value.includeSelf}
          onClick={() => onChange({ ...value, includeSelf: !value.includeSelf })}
          label={profile.displayName}
          sub="You"
          photoUrl={profile.avatar}
          fallback={profile.displayName.slice(0, 1)}
          icon={<UserRound className="size-4 shrink-0 text-primary/80" aria-hidden />}
        />
      </AttendeeGrid>

      <MemberGroup title="Partner" members={spouse} selectedIds={value.memberIds} onToggle={toggleMember} />
      <MemberGroup title="Children" members={children} selectedIds={value.memberIds} onToggle={toggleMember} />
      <MemberGroup title="Family" members={relatives} selectedIds={value.memberIds} onToggle={toggleMember} />

      {profile.familyMembers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-[12px] text-muted-foreground dark:border-white/10">
          Add family members on your Profile tab to pick them here.
        </p>
      ) : null}

      {profile.pets.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Pets</p>
          <AttendeeGrid>
            {profile.pets.map((pet) => (
              <Chip
                key={pet.id}
                active={value.petIds.includes(pet.id)}
                onClick={() => onChange({ ...value, petIds: toggleId(value.petIds, pet.id) })}
                label={pet.name}
                sub={[pet.species, pet.breed].filter(Boolean).join(" · ")}
                photoUrl={pet.photoUrl}
                fallback={pet.name.slice(0, 1)}
                icon={<PawPrint className="size-4 shrink-0 text-primary/80" aria-hidden />}
              />
            ))}
          </AttendeeGrid>
        </div>
      ) : null}
    </div>
  );
}
