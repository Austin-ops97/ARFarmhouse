import { describe, expect, it } from "vitest";

import { pickTopHomeTasks } from "@/lib/home-tasks";
import type { HouseTask } from "@/lib/property-operations";

function task(partial: Partial<HouseTask> & Pick<HouseTask, "id" | "title">): HouseTask {
  return {
    listSection: "active",
    boardColumn: "todo",
    boardOrder: 0,
    priority: "medium",
    dueLabel: "",
    done: false,
    assignee: { name: "House", avatar: "" },
    commentsPreview: [],
    ...partial,
  };
}

describe("pickTopHomeTasks", () => {
  it("prioritizes emergency and excludes completed", () => {
    const picked = pickTopHomeTasks(
      [
        task({ id: "1", title: "Low", priority: "low" }),
        task({ id: "2", title: "Urgent", priority: "emergency" }),
        task({ id: "3", title: "Done", done: true }),
        task({ id: "4", title: "High", priority: "high" }),
      ],
      2
    );
    expect(picked.map((t) => t.id)).toEqual(["2", "4"]);
  });
});
