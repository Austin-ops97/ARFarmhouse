import type { Timestamp } from "firebase/firestore";

import type { MediaProcessingStatus } from "@/models/media-processing";

/** Firestore `albumMedia/{id}` — standalone family archive items (not feed duplicates). */
export type FirestoreAlbumMedia = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  storageUrl: string;
  storagePath: string;
  caption: string;
  albumKey: string;
  linkedEvent?: string | null;
  /** Present on uploads after optimizer pipeline rollout. */
  width?: number;
  height?: number;
  originalMimeType?: string;
  optimizedSizeBytes?: number;
  processingStatus?: MediaProcessingStatus;
  rawStoragePath?: string | null;
  thumbnailUrl?: string | null;
  fullScreenUrl?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
};

export type CreateAlbumMediaInput = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  caption: string;
  albumKey: string;
  linkedEvent?: string | null;
  files: File[];
};
