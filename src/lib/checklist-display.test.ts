import { describe, expect, it } from "vitest";

import {
  checklistSubmissionToHistoryRows,
  createEmptyChecklistFormValues,
  formatChecklistPercent,
  formatChecklistYesNo,
} from "@/lib/checklist-fields";
import type { ChecklistSubmission } from "@/models/checklist";

function sampleSubmission(overrides: Partial<ChecklistSubmission> = {}): ChecklistSubmission {
  return {
    updatedAt: new Date("2026-05-16T12:00:00Z"),
    submittedBy: "uid-1",
    submittedByName: "Alex",
    ...createEmptyChecklistFormValues(),
    propaneLevel: 85,
    doorsLocked: true,
    imageUrls: { propaneLevel: "https://example.com/p.jpg" },
    ...overrides,
  };
}

describe("checklist display helpers", () => {
  it("formats percent and yes/no", () => {
    expect(formatChecklistPercent(85.4)).toBe("85%");
    expect(formatChecklistPercent(150)).toBe("100%");
    expect(formatChecklistYesNo(true)).toBe("Yes");
    expect(formatChecklistYesNo(false)).toBe("No");
  });

  it("maps submission to ordered status rows", () => {
    const rows = checklistSubmissionToHistoryRows(sampleSubmission());
    expect(rows[0]).toMatchObject({ key: "propaneLevel", value: "85%", imageUrl: "https://example.com/p.jpg" });
    const doors = rows.find((r) => r.key === "doorsLocked");
    expect(doors?.value).toBe("Yes");
    expect(rows.some((r) => r.key === "firewoodPile")).toBe(true);
  });
});
