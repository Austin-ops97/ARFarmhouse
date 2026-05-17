/**
 * Sharp-backed Storage finalize pipeline — generates thumb / feed / full WebP variants,
 * publishes tokenized download URLs into Firestore, then deletes the lightweight raw upload.
 */
import { randomUUID } from "crypto";

import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import sharp from "sharp";

initializeApp();

const db = getFirestore();

const POST_RAW =
  /^uploads\/raw\/([^/]+)\/posts\/([^/]+)\/(\d+)\/original\.(jpe?g|webp|png|gif|heic|heif)$/i;
const ALBUM_RAW =
  /^uploads\/raw\/([^/]+)\/albumMedia\/([^/]+)\/original\.(jpe?g|webp|png|gif|heic|heif)$/i;

const THUMB_EDGE = 300;
const FEED_EDGE = 1560;
const FULL_EDGE = 2100;

const THUMB_Q = 72;
const FEED_Q = 82;
const FULL_Q = 86;

function buildFirebaseDownloadURL(bucketName: string, objectPath: string, token: string): string {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

async function uploadWebpVariant(bucketName: string, destinationPath: string, bytes: Buffer): Promise<string> {
  const bucket = getStorage().bucket(bucketName);
  const file = bucket.file(destinationPath);
  const token = randomUUID();
  await file.save(bytes, {
    resumable: false,
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });
  return buildFirebaseDownloadURL(bucketName, destinationPath, token);
}

async function renderWebpVariant(
  input: Buffer,
  maxEdge: number,
  quality: number
): Promise<{ bytes: Buffer; width?: number; height?: number }> {
  const { data, info } = await sharp(input)
    .rotate()
    .withMetadata({ exif: undefined, icc: undefined })
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height };
}

async function mergeFeedSlot(opts: {
  postId: string;
  slot: number;
  thumbUrl: string;
  feedUrl: string;
  fullUrl: string;
  feedWidth?: number;
  feedHeight?: number;
}) {
  const { postId, slot, thumbUrl, feedUrl, fullUrl, feedWidth, feedHeight } = opts;
  const ref = db.collection("posts").doc(postId);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists) {
      logger.warn("posts doc missing — variant URLs generated but Firestore merge skipped", { postId, slot });
      return;
    }
    const data = snap.data() ?? {};
    const urls = [...((data.mediaUrls as string[]) ?? [])];
    const meta = [...((data.mediaMeta as Record<string, unknown>[]) ?? [])];
    while (urls.length <= slot) urls.push("");
    while (meta.length <= slot) meta.push({});
    urls[slot] = feedUrl;
    const prev = (meta[slot] as Record<string, unknown>) ?? {};
    meta[slot] = {
      ...prev,
      processingStatus: "ready",
      thumbnailUrl: thumbUrl,
      feedUrl,
      fullUrl,
      ...(feedWidth && feedHeight ? { width: feedWidth, height: feedHeight } : {}),
    };
    txn.update(ref, {
      mediaUrls: urls,
      mediaMeta: meta,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function mergeAlbumDoc(opts: {
  mediaId: string;
  thumbUrl: string;
  feedUrl: string;
  fullUrl: string;
  feedWidth?: number;
  feedHeight?: number;
}) {
  const { mediaId, thumbUrl, feedUrl, fullUrl, feedWidth, feedHeight } = opts;
  const ref = db.collection("albumMedia").doc(mediaId);
  const snap = await ref.get();
  if (!snap.exists) {
    logger.warn("albumMedia doc missing — variants uploaded but merge skipped", { mediaId });
    return;
  }
  const payload: Record<string, unknown> = {
    storageUrl: feedUrl,
    thumbnailUrl: thumbUrl,
    fullScreenUrl: fullUrl,
    processingStatus: "ready",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (feedWidth && feedHeight) {
    payload.width = feedWidth;
    payload.height = feedHeight;
  }
  await ref.update(payload);
}

async function markPostFailed(postId: string, slot: number) {
  const ref = db.collection("posts").doc(postId);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists) return;
    const data = snap.data() ?? {};
    const meta = [...((data.mediaMeta as Record<string, unknown>[]) ?? [])];
    while (meta.length <= slot) meta.push({});
    const prev = (meta[slot] as Record<string, unknown>) ?? {};
    meta[slot] = { ...prev, processingStatus: "failed" };
    txn.update(ref, {
      mediaMeta: meta,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function markAlbumFailed(mediaId: string) {
  const ref = db.collection("albumMedia").doc(mediaId);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.update({ processingStatus: "failed", updatedAt: FieldValue.serverTimestamp() });
}

export { validateInviteCode } from "./invite/validate-invite-callable";
export { onUserProfileCreatedMarkInvite } from "./invite/on-user-profile-created";
export {
  onBookingCreatedNotify,
  onBookingUpdatedNotify,
  onBookingDeletedNotify,
  onFeedPostCreatedNotify,
  onHouseTaskCreatedNotify,
  onNotificationTokenCreated,
  onNotificationTokenDeleted,
  onFeedCommentCreatedNotify,
  onFeedReactionCreatedNotify,
} from "./notifications";

export const processUploadedRawMedia = onObjectFinalized(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const object = event.data;
    if (!object?.name || !object.bucket) return;

    const name = object.name;
    const bucketName = object.bucket;

    logger.info("[storage] finalize trigger", { bucket: bucketName, path: name });

    const postMatch = name.match(POST_RAW);
    const albumMatch = name.match(ALBUM_RAW);

    if (!postMatch && !albumMatch) return;

    const bucket = getStorage().bucket(bucketName);
    const [raw] = await bucket.file(name).download();

    try {
      const thumb = await renderWebpVariant(raw, THUMB_EDGE, THUMB_Q);
      const feed = await renderWebpVariant(raw, FEED_EDGE, FEED_Q);
      const full = await renderWebpVariant(raw, FULL_EDGE, FULL_Q);

      if (postMatch) {
        const postId = postMatch[2]!;
        const slot = Number.parseInt(postMatch[3]!, 10);
        if (!Number.isFinite(slot) || slot < 0) {
          logger.error("bad post slot segment", { name, slot: postMatch[3] });
          return;
        }
        const base = `media/processed/posts/${postId}/${slot}`;
        const thumbUrl = await uploadWebpVariant(bucketName, `${base}/thumb.webp`, thumb.bytes);
        const feedUrl = await uploadWebpVariant(bucketName, `${base}/feed.webp`, feed.bytes);
        const fullUrl = await uploadWebpVariant(bucketName, `${base}/full.webp`, full.bytes);

        await mergeFeedSlot({
          postId,
          slot,
          thumbUrl,
          feedUrl,
          fullUrl,
          feedWidth: feed.width,
          feedHeight: feed.height,
        });
      } else if (albumMatch) {
        const mediaId = albumMatch[2]!;
        const base = `media/processed/albumMedia/${mediaId}`;
        const thumbUrl = await uploadWebpVariant(bucketName, `${base}/thumb.webp`, thumb.bytes);
        const feedUrl = await uploadWebpVariant(bucketName, `${base}/feed.webp`, feed.bytes);
        const fullUrl = await uploadWebpVariant(bucketName, `${base}/full.webp`, full.bytes);

        await mergeAlbumDoc({
          mediaId,
          thumbUrl,
          feedUrl,
          fullUrl,
          feedWidth: feed.width,
          feedHeight: feed.height,
        });
      }

      await bucket
        .file(name)
        .delete()
        .catch((e: unknown) => logger.warn("raw delete failed", { name, err: String(e) }));

      logger.info("media pipeline complete", { name });
    } catch (err) {
      logger.error("media pipeline error", { name, err });
      try {
        if (postMatch) {
          const postId = postMatch[2]!;
          const slot = Number.parseInt(postMatch[3]!, 10);
          if (Number.isFinite(slot) && slot >= 0) await markPostFailed(postId, slot);
        } else if (albumMatch) {
          await markAlbumFailed(albumMatch[2]!);
        }
      } catch (inner) {
        logger.error("failed to mark processing failure", { inner });
      }
      throw err;
    }
  }
);
