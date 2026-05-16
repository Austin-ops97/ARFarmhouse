"use client";

import type { ComponentProps } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarColorIdForUid, avatarColorPreset, type AvatarColorId } from "@/lib/avatar-colors";
import { userInitials } from "@/lib/user-initials";
import { cn } from "@/lib/utils";

export type UserAvatarProps = {
  name: string;
  colorId?: string | null;
  /** When set, used to pick a stable color if `colorId` is missing. */
  uid?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: ComponentProps<typeof Avatar>["size"];
};

export function UserAvatar({
  name,
  colorId,
  uid,
  className,
  fallbackClassName,
  size,
}: UserAvatarProps) {
  const resolvedId: AvatarColorId =
    colorId != null && colorId !== ""
      ? avatarColorPreset(colorId).id
      : uid
        ? avatarColorIdForUid(uid)
        : avatarColorPreset(null).id;
  const preset = avatarColorPreset(resolvedId);

  return (
    <Avatar size={size} className={className}>
      <AvatarFallback
        className={cn(
          "font-semibold tracking-tight",
          preset.bg,
          preset.text,
          fallbackClassName
        )}
      >
        {userInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
