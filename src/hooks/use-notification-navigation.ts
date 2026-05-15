"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { navigationTargetFromNotification } from "@/lib/notification-routes";
import type { FamilyNotification } from "@/models/notification";

export function useNotificationNavigation() {
  const router = useRouter();
  const { goTo } = useEcosystem();

  return useCallback(
    (notification: FamilyNotification) => {
      const target = navigationTargetFromNotification(notification);
      goTo(target.nav);
      if (target.postId) {
        router.replace(`/?post=${encodeURIComponent(target.postId)}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("post");
        router.replace(url.pathname + url.search);
      }
    },
    [goTo, router]
  );
}
