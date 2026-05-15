import type { AlbumUploadProgress } from "@/services/album-media";

export type AlbumOptimisticOverlay = {
  phase: string;
  progress: number;
  error?: string;
};

export function overlayFromAlbumProgress(p: AlbumUploadProgress): AlbumOptimisticOverlay {
  const total = Math.max(1, p.total);

  if (p.phase === "uploading") {
    const mix = (p.done + (p.percent ?? 0) / 100) / total;
    const uploadPct = Math.round(Math.min(100, mix * 100));
    const progress = Math.round(52 + Math.min(1, mix) * 48);
    return {
      phase: `Uploading… ${uploadPct}%`,
      progress,
    };
  }

  if (p.phase === "optimizing") {
    const progress = Math.min(51, Math.round(8 + (p.done / total) * 44));
    return {
      phase: total > 1 ? `Optimizing ${Math.min(p.done + 1, total)} of ${total}` : "Optimizing…",
      progress,
    };
  }

  const prepProgress = Math.min(42, Math.round(4 + (p.done / total) * 38));
  return {
    phase: total > 1 ? `Preparing ${p.done + 1}/${total}` : "Preparing…",
    progress: prepProgress,
  };
}
