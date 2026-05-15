/** Next/Image should skip optimization for transient local object URLs. */
export function isEphemeralLocalImageUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("blob:") || url?.startsWith("data:"));
}
