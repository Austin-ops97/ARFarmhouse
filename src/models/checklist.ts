/**
 * Last Man Out property checklist — live current-state document shape.
 */

export type ChecklistSliderFieldKey =
  | "propaneLevel"
  | "deerFeederLevel"
  | "fishFeederLevel";

export type ChecklistToggleFieldKey =
  | "doorsLocked"
  | "houseLightsOff"
  | "electronicsUnplugged"
  | "wellBreakerOff"
  | "windmillValveClosed"
  | "trashcanLidsClosed"
  | "trashOut"
  | "gasCansFilled";

export type ChecklistMediaOnlyFieldKey = "firewoodPile";

export type ChecklistImageFieldKey =
  | ChecklistSliderFieldKey
  | ChecklistToggleFieldKey
  | ChecklistMediaOnlyFieldKey;

/** Latest checklist state stored at checklists/current. */
export type ChecklistSubmission = {
  updatedAt: Date | null;
  submittedBy: string;
  submittedByName: string;
  propaneLevel: number;
  deerFeederLevel: number;
  fishFeederLevel: number;
  doorsLocked: boolean;
  houseLightsOff: boolean;
  electronicsUnplugged: boolean;
  wellBreakerOff: boolean;
  windmillValveClosed: boolean;
  trashcanLidsClosed: boolean;
  trashOut: boolean;
  gasCansFilled: boolean;
  imageUrls: Partial<Record<ChecklistImageFieldKey, string>>;
  metadata?: ChecklistSubmissionMetadata;
};

export type ChecklistSubmissionMetadata = {
  clientVersion?: string;
  userAgent?: string;
};

export type ChecklistSubmitInput = Omit<
  ChecklistSubmission,
  "updatedAt" | "imageUrls" | "metadata"
> & {
  imageUrls?: Partial<Record<ChecklistImageFieldKey, string>>;
};
