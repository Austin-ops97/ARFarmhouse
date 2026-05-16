"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";

type AppStoreState = {
  activeNavId: NavId;
  mobileMenuOpen: boolean;
  highlightPostId: string | null;
  setActiveNavId: (id: NavId) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setHighlightPostId: (id: string | null) => void;
  toggleMobileMenu: () => void;
};

export const useAppStore = create<AppStoreState>()(
  subscribeWithSelector((set) => ({
    activeNavId: "home",
    mobileMenuOpen: false,
    highlightPostId: null,
    setActiveNavId: (activeNavId) => set({ activeNavId, mobileMenuOpen: false }),
    setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
    setHighlightPostId: (highlightPostId) => set({ highlightPostId }),
    toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  }))
);
