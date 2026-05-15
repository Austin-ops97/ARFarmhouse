export type FamilyRelationship = "spouse" | "partner" | "child" | "relative" | "other";

export type FamilyMember = {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  photoUrl: string | null;
  birthday: string | null;
  notes: string | null;
};

export type FamilyPet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  notes: string | null;
  photoUrl: string | null;
};

export type BookingAttendeeRef = {
  type: "self" | "member" | "pet";
  id: string;
};

export const RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
  spouse: "Spouse",
  partner: "Partner",
  child: "Child",
  relative: "Relative",
  other: "Family",
};

export function createFamilyMemberId(): string {
  return `fm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createPetId(): string {
  return `pet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type BookingAttendeeSelection = {
  includeSelf: boolean;
  memberIds: string[];
  petIds: string[];
};

export function countBookingGuests(selection: BookingAttendeeSelection): number {
  const people = (selection.includeSelf ? 1 : 0) + selection.memberIds.length;
  return Math.max(people, 1);
}

export function buildAttendeeLabels(
  profile: { displayName: string; familyMembers: FamilyMember[]; pets: FamilyPet[] },
  selection: BookingAttendeeSelection
): string[] {
  const labels: string[] = [];
  if (selection.includeSelf) labels.push(profile.displayName);
  for (const id of selection.memberIds) {
    const m = profile.familyMembers.find((x) => x.id === id);
    if (m) labels.push(m.name);
  }
  for (const id of selection.petIds) {
    const p = profile.pets.find((x) => x.id === id);
    if (p) labels.push(`${p.name} (pet)`);
  }
  return labels;
}
