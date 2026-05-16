/**
 * Last Man Out property checklist — submission document shape.
 * Structured for future template / inspection extensions.
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

export type ChecklistSubmission = {
  submissionId: string;
  createdAt: Date | null;
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
  "submissionId" | "createdAt" | "imageUrls" | "metadata"
> & {
  imageUrls?: Partial<Record<ChecklistImageFieldKey, string>>;
};
