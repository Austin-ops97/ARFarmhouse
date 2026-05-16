import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { ref } from "firebase/storage";

import { stripUndefinedDeep } from "@/lib/datetime/firestore-write";
import { tryGetFirestoreDb, tryGetFirebaseStorage } from "@/lib/firebase";
import { processImageFile } from "@/lib/image-process";
import { validateRawImageFile } from "@/lib/image-input";
import { enqueueCpuBoundMediaTask } from "@/lib/media-upload-queue";
import { COLLECTIONS } from "@/platform/constants/collections";
import type {
  ChecklistImageFieldKey,
  ChecklistSubmission,
  ChecklistSubmitInput,
} from "@/models/checklist";
import { uploadStorageImageResumable, waitForStorageDownloadURL } from "@/services/storage-upload";

const CHECKLIST_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;

export type ChecklistUploadProgress = {
  field: ChecklistImageFieldKey;
  percent: number;
};

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime.startsWith("image/")) return "jpg";
  return "jpg";
}

function timestampToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}

function mapChecklistDoc(snap: QueryDocumentSnapshot<DocumentData>): ChecklistSubmission {
  const d = snap.data();
  const imageUrlsRaw = d.imageUrls;
  const imageUrls: ChecklistSubmission["imageUrls"] = {};
  if (imageUrlsRaw && typeof imageUrlsRaw === "object") {
    for (const [k, v] of Object.entries(imageUrlsRaw)) {
      if (typeof v === "string" && v.length > 0) {
        imageUrls[k as ChecklistImageFieldKey] = v;
      }
    }
  }

  return {
    submissionId: snap.id,
    createdAt: timestampToDate(d.createdAt),
    submittedBy: (d.submittedBy as string) ?? "",
    submittedByName: (d.submittedByName as string) ?? "",
    propaneLevel: typeof d.propaneLevel === "number" ? d.propaneLevel : 0,
    deerFeederLevel: typeof d.deerFeederLevel === "number" ? d.deerFeederLevel : 0,
    fishFeederLevel: typeof d.fishFeederLevel === "number" ? d.fishFeederLevel : 0,
    doorsLocked: Boolean(d.doorsLocked),
    houseLightsOff: Boolean(d.houseLightsOff),
    electronicsUnplugged: Boolean(d.electronicsUnplugged),
    wellBreakerOff: Boolean(d.wellBreakerOff),
    windmillValveClosed: Boolean(d.windmillValveClosed),
    trashcanLidsClosed: Boolean(d.trashcanLidsClosed),
    trashOut: Boolean(d.trashOut),
    gasCansFilled: Boolean(d.gasCansFilled),
    imageUrls,
    metadata:
      d.metadata && typeof d.metadata === "object"
        ? (d.metadata as ChecklistSubmission["metadata"])
        : undefined,
  };
}

/** Pre-allocate a Firestore document id before uploading images. */
export function allocateChecklistSubmissionId(): string {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  return doc(collection(db, COLLECTIONS.checklists)).id;
}

export function subscribeChecklistSubmissions(
  onSubmissions: (rows: ChecklistSubmission[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onSubmissions([]);
    return () => {};
  }

  const q = query(collection(db, COLLECTIONS.checklists), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map(mapChecklistDoc);
      onSubmissions(rows);
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

async function uploadChecklistFieldImage(
  submissionId: string,
  field: ChecklistImageFieldKey,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const storage = tryGetFirebaseStorage();
  if (!storage) {
    throw new Error("Photo uploads are not available. Check your connection and try again.");
  }

  validateRawImageFile(file);
  if (file.size > CHECKLIST_UPLOAD_MAX_BYTES) {
    throw new Error(`"${file.name}" is too large. Keep checklist photos under 12 MB.`);
  }

  const processed = await enqueueCpuBoundMediaTask(() => processImageFile(file, "family"));

  const ext = extFromMime(processed.file.type || "image/jpeg");
  const storagePath = `checklists/${submissionId}/${field}/photo.${ext}`;
  const objectRef = ref(storage, storagePath);

  await uploadStorageImageResumable(objectRef, processed.file, {
    signal,
    label: storagePath,
    onProgress,
  });

  return waitForStorageDownloadURL(objectRef, storagePath);
}

export type SubmitChecklistOptions = {
  submissionId: string;
  input: ChecklistSubmitInput;
  images: Partial<Record<ChecklistImageFieldKey, File>>;
  signal?: AbortSignal;
  onUploadProgress?: (progress: ChecklistUploadProgress) => void;
};

export async function submitChecklistSubmission({
  submissionId,
  input,
  images,
  signal,
  onUploadProgress,
}: SubmitChecklistOptions): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const imageUrls: Partial<Record<ChecklistImageFieldKey, string>> = {
    ...input.imageUrls,
  };

  const entries = Object.entries(images) as [ChecklistImageFieldKey, File][];
  for (const [field, file] of entries) {
    if (!file) continue;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = await uploadChecklistFieldImage(
      submissionId,
      field,
      file,
      (percent) => onUploadProgress?.({ field, percent }),
      signal
    );
    imageUrls[field] = url;
  }

  const payload = stripUndefinedDeep({
    submissionId,
    submittedBy: input.submittedBy,
    submittedByName: input.submittedByName,
    propaneLevel: Math.round(input.propaneLevel),
    deerFeederLevel: Math.round(input.deerFeederLevel),
    fishFeederLevel: Math.round(input.fishFeederLevel),
    doorsLocked: input.doorsLocked,
    houseLightsOff: input.houseLightsOff,
    electronicsUnplugged: input.electronicsUnplugged,
    wellBreakerOff: input.wellBreakerOff,
    windmillValveClosed: input.windmillValveClosed,
    trashcanLidsClosed: input.trashcanLidsClosed,
    trashOut: input.trashOut,
    gasCansFilled: input.gasCansFilled,
    imageUrls,
    metadata: {
      clientVersion: "checklists-v1",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    },
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, COLLECTIONS.checklists, submissionId), payload);
}
