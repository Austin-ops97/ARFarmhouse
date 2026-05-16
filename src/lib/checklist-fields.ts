import type {
  ChecklistImageFieldKey,
  ChecklistMediaOnlyFieldKey,
  ChecklistSliderFieldKey,
  ChecklistSubmission,
  ChecklistToggleFieldKey,
} from "@/models/checklist";

export type ChecklistSliderFieldDef = {
  key: ChecklistSliderFieldKey;
  label: string;
  optionalImage: true;
};

export type ChecklistToggleFieldDef = {
  key: ChecklistToggleFieldKey;
  label: string;
  subtitle?: string;
  optionalImage: true;
};

export type ChecklistMediaFieldDef = {
  key: ChecklistMediaOnlyFieldKey;
  label: string;
  optionalImage: true;
};

export const CHECKLIST_SLIDER_FIELDS: readonly ChecklistSliderFieldDef[] = [
  { key: "propaneLevel", label: "Propane Level", optionalImage: true },
  { key: "deerFeederLevel", label: "Deer Feeder Level", optionalImage: true },
  { key: "fishFeederLevel", label: "Fish Feeder Level", optionalImage: true },
] as const;

export const CHECKLIST_TOGGLE_FIELDS: readonly ChecklistToggleFieldDef[] = [
  { key: "doorsLocked", label: "Doors Locked", optionalImage: true },
  {
    key: "houseLightsOff",
    label: "House Lights Off",
    subtitle: "Excludes outside lights",
    optionalImage: true,
  },
  {
    key: "electronicsUnplugged",
    label: "Electronics Unplugged",
    subtitle: "Nothing left plugged in or charging",
    optionalImage: true,
  },
  { key: "wellBreakerOff", label: "Well Breaker Off", optionalImage: true },
  { key: "windmillValveClosed", label: "Windmill Water Valve Closed", optionalImage: true },
  { key: "trashcanLidsClosed", label: "Trashcan Lids Closed", optionalImage: true },
  { key: "trashOut", label: "All Trash Out of House", optionalImage: true },
  { key: "gasCansFilled", label: "Gas Cans Filled", optionalImage: true },
] as const;

export const CHECKLIST_MEDIA_FIELDS: readonly ChecklistMediaFieldDef[] = [
  { key: "firewoodPile", label: "Firewood Pile", optionalImage: true },
] as const;

export type ChecklistHistoryRow = {
  key: ChecklistImageFieldKey;
  label: string;
  value: string;
  imageUrl?: string;
};

const SLIDER_LABELS = Object.fromEntries(
  CHECKLIST_SLIDER_FIELDS.map((f) => [f.key, f.label])
) as Record<ChecklistSliderFieldKey, string>;

const TOGGLE_LABELS = Object.fromEntries(
  CHECKLIST_TOGGLE_FIELDS.map((f) => [f.key, f.label])
) as Record<ChecklistToggleFieldKey, string>;

const MEDIA_LABELS = Object.fromEntries(
  CHECKLIST_MEDIA_FIELDS.map((f) => [f.key, f.label])
) as Record<ChecklistMediaOnlyFieldKey, string>;

/** Default form values for a new Last Man Out walkthrough. */
export function createEmptyChecklistFormValues(): Pick<
  ChecklistSubmission,
  | ChecklistSliderFieldKey
  | ChecklistToggleFieldKey
> {
  return {
    propaneLevel: 0,
    deerFeederLevel: 0,
    fishFeederLevel: 0,
    doorsLocked: false,
    houseLightsOff: false,
    electronicsUnplugged: false,
    wellBreakerOff: false,
    windmillValveClosed: false,
    trashcanLidsClosed: false,
    trashOut: false,
    gasCansFilled: false,
  };
}

export function formatChecklistPercent(level: number): string {
  return `${Math.round(Math.max(0, Math.min(100, level)))}%`;
}

export function formatChecklistYesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/** Rows for the current status card — sliders, toggles, then media-only fields. */
export function checklistSubmissionToHistoryRows(
  submission: ChecklistSubmission
): ChecklistHistoryRow[] {
  const rows: ChecklistHistoryRow[] = [];

  for (const field of CHECKLIST_SLIDER_FIELDS) {
    rows.push({
      key: field.key,
      label: SLIDER_LABELS[field.key],
      value: formatChecklistPercent(submission[field.key]),
      imageUrl: submission.imageUrls[field.key],
    });
  }

  for (const field of CHECKLIST_TOGGLE_FIELDS) {
    rows.push({
      key: field.key,
      label: TOGGLE_LABELS[field.key],
      value: formatChecklistYesNo(submission[field.key]),
      imageUrl: submission.imageUrls[field.key],
    });
  }

  for (const field of CHECKLIST_MEDIA_FIELDS) {
    rows.push({
      key: field.key,
      label: MEDIA_LABELS[field.key],
      value: submission.imageUrls[field.key] ? "Photo attached" : "No photo",
      imageUrl: submission.imageUrls[field.key],
    });
  }

  return rows;
}

export function getChecklistFieldLabel(key: ChecklistImageFieldKey): string {
  if (key in SLIDER_LABELS) return SLIDER_LABELS[key as ChecklistSliderFieldKey];
  if (key in TOGGLE_LABELS) return TOGGLE_LABELS[key as ChecklistToggleFieldKey];
  return MEDIA_LABELS[key as ChecklistMediaOnlyFieldKey];
}
