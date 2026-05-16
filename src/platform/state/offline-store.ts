"use client";

import { create } from "zustand";

import { getPendingMutationCount } from "@/platform/offline/mutation-queue";

type OfflineStoreState = {
  online: boolean;
  pendingMutations: number;
  firestorePersistence: boolean;
  setOnline: (online: boolean) => void;
  setFirestorePersistence: (enabled: boolean) => void;
  refreshPendingCount: () => void;
};

export const useOfflineStore = create<OfflineStoreState>((set) => ({
  online: true,
  pendingMutations: 0,
  firestorePersistence: false,
  setOnline: (online) => {
    set({ online });
    if (online) {
      set({ pendingMutations: getPendingMutationCount() });
    }
  },
  setFirestorePersistence: (firestorePersistence) => set({ firestorePersistence }),
  refreshPendingCount: () => set({ pendingMutations: getPendingMutationCount() }),
}));
