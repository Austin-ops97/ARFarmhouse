"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useEcosystemOptional } from "@/components/ar-farmhouse/ecosystem-context";
import { navigationTargetFromNotification } from "@/lib/notification-routes";
import type { FamilyNotification } from "@/models/notification";
import { useAppStore } from "@/platform/state/app-store";

export function useNotificationNavigation() {
  const router = useRouter();
  const setActiveNavId = useAppStore((s) => s.setActiveNavId);
  const ecosystemGoTo = useEcosystemOptional()?.goTo;
  const goTo = ecosystemGoTo ?? setActiveNavId;

  return useCallback(
    (notification: FamilyNotification) => {
      if (notification.deepLink) {
        try {
          const parsed = new URL(notification.deepLink, window.location.origin);
          if (parsed.origin === window.location.origin) {
            router.replace(parsed.pathname + parsed.search);
            const postId = parsed.searchParams.get("post");
            const bookingId = parsed.searchParams.get("booking");
            if (postId) goTo("feed");
            else if (bookingId) goTo("calendar");
            else goTo(notification.route.nav);
            return;
          }
        } catch {
          /* fall through to route-based navigation */
        }
      }

      const target = navigationTargetFromNotification(notification);
      goTo(target.nav);
      const url = new URL(window.location.href);
      url.searchParams.delete("post");
      url.searchParams.delete("booking");
      if (target.postId) {
        url.searchParams.set("post", target.postId);
      } else if (target.bookingId) {
        url.searchParams.set("booking", target.bookingId);
      }
      router.replace(url.pathname + url.search);
    },
    [goTo, router]
  );
}
