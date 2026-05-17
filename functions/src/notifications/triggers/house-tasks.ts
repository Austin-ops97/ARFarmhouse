import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { HOUSE_TASKS_COLLECTION } from "../constants";
import { dispatchTopicBroadcast } from "../dispatch";

type HouseTaskData = {
  title?: string;
  createdBy?: string;
  createdByName?: string;
  listSection?: string;
};

export const onHouseTaskCreatedNotify = onDocumentCreated(
  { document: `${HOUSE_TASKS_COLLECTION}/{taskId}`, region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as HouseTaskData;
    const taskId = event.params.taskId;
    const actorId = data.createdBy ?? "";
    const actorName = (data.createdByName as string | undefined)?.trim() || "A family member";
    const isMaintenance = data.listSection === "maintenance";

    const title = isMaintenance ? "New Maintenance Alert" : "New Task Assigned";
    const taskTitle = (data.title as string | undefined)?.trim() || "Household task";
    const body = isMaintenance
      ? `${actorName} added a maintenance item: ${taskTitle}`
      : `${actorName} assigned a task: ${taskTitle}`;

    await dispatchTopicBroadcast({
      title,
      body,
      type: "task_created",
      actorId,
      actorDisplayName: actorName,
      routeNav: "tasks",
      entityKind: "task",
      entityId: taskId,
      fanOutInbox: true,
    });
  }
);
