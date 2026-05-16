import { ref } from "firebase/storage";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type DocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { stripUndefinedDeep } from "@/lib/datetime/firestore-write";
import { tryGetFirestoreDb, tryGetFirebaseStorage } from "@/lib/firebase";
import { processImageFile } from "@/lib/image-process";
import { validateRawImageFile } from "@/lib/image-input";
import { enqueueCpuBoundMediaTask } from "@/lib/media-upload-queue";
import {
  CHECKLIST_CURRENT_DOC_ID,
  COLLECTIONS,
} from "@/platform/constants/collections";
import type {
  ChecklistImageFieldKey,
  ChecklistSubmission,
  ChecklistSubmitInput,
} from "@/models/checklist";
import {
  deleteStoragePath,
  uploadStorageImageResumable,
  waitForStorageDownloadURL,
} from "@/services/storage-upload";

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

function parseImageUrls(raw: unknown): ChecklistSubmission["imageUrls"] {
  const imageUrls: ChecklistSubmission["imageUrls"] = {};
  if (!raw || typeof raw !== "object") return imageUrls;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) {
      imageUrls[k as ChecklistImageFieldKey] = v;
    }
  }
  return imageUrls;
}

function mapChecklistDoc(snap: DocumentSnapshot<DocumentData>): ChecklistSubmission | null {
  if (!snap.exists()) return null;
  const d = snap.data();

  return {
    updatedAt: timestampToDate(d.updatedAt ?? d.createdAt),
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
    imageUrls: parseImageUrls(d.imageUrls),
    metadata:
      d.metadata && typeof d.metadata === "object"
        ? (d.metadata as ChecklistSubmission["metadata"])
        : undefined,
  };
}

/** Realtime listener for the single current checklist document. */
export function subscribeChecklistCurrent(
  onCurrent: (checklist: ChecklistSubmission | null) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onCurrent(null);
    return () => {};
  }

  const docRef = doc(db, COLLECTIONS.checklists, CHECKLIST_CURRENT_DOC_ID);

  return onSnapshot(
    docRef,
    (snap) => {
      onCurrent(mapChecklistDoc(snap));
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

async function uploadChecklistFieldImage(
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
  const storagePath = `checklists/${CHECKLIST_CURRENT_DOC_ID}/${field}/photo.${ext}`;
  const objectRef = ref(storage, storagePath);

  await uploadStorageImageResumable(objectRef, processed.file, {
    signal,
    label: storagePath,
    onProgress,
  });

  return waitForStorageDownloadURL(objectRef, storagePath);
}

function storagePathFromDownloadUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("firebasestorage.googleapis.com")) return null;
    const encoded = parsed.pathname.split("/o/")[1];
    if (!encoded) return null;
    return decodeURIComponent(encoded.split("?")[0] ?? encoded);
  } catch {
    return null;
  }
}

async function deleteChecklistImageUrl(url: string): Promise<void> {
  const path = storagePathFromDownloadUrl(url);
  if (!path) return;
  await deleteStoragePath(path);
}

function collectReplacedImageUrls(
  previous: Partial<Record<ChecklistImageFieldKey, string>> | undefined,
  next: Partial<Record<ChecklistImageFieldKey, string>>
): string[] {
  if (!previous) return [];
  const nextUrls = new Set(Object.values(next).filter(Boolean));
  const stale: string[] = [];
  for (const url of Object.values(previous)) {
    if (url && !nextUrls.has(url)) stale.push(url);
  }
  return stale;
}

export type SubmitChecklistOptions = {
  input: ChecklistSubmitInput;
  images: Partial<Record<ChecklistImageFieldKey, File>>;
  signal?: AbortSignal;
  onUploadProgress?: (progress: ChecklistUploadProgress) => void;
};

/** Overwrites checklists/current with the latest walkthrough state. */
export async function submitChecklistCurrent({
  input,
  images,
  signal,
  onUploadProgress,
}: SubmitChecklistOptions): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const docRef = doc(db, COLLECTIONS.checklists, CHECKLIST_CURRENT_DOC_ID);
  const existingSnap = await getDoc(docRef);
  const previous = existingSnap.exists() ? mapChecklistDoc(existingSnap) : null;

  const imageUrls: Partial<Record<ChecklistImageFieldKey, string>> = {};

  const entries = Object.entries(images) as [ChecklistImageFieldKey, File][];
  for (const [field, file] of entries) {
    if (!file) continue;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = await uploadChecklistFieldImage(
      field,
      file,
      (percent) => onUploadProgress?.({ field, percent }),
      signal
    );
    imageUrls[field] = url;
  }

  const staleUrls = collectReplacedImageUrls(previous?.imageUrls, imageUrls);

  const payload = stripUndefinedDeep({
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
      clientVersion: "checklists-v2-current",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    },
    updatedAt: serverTimestamp(),
  });

  await setDoc(docRef, payload);

  await Promise.all(staleUrls.map((url) => deleteChecklistImageUrl(url)));
}
