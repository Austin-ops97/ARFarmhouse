import type { Timestamp } from "firebase/firestore";

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
