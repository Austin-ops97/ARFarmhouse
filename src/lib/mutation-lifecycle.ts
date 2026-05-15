import { actionDebug } from "@/lib/action-debug";

export type MutationLifecycleHooks<T> = {
  onStart?: () => void;
  onSuccess?: (result: T) => void;
  onError?: (error: unknown) => void;
  onFinally?: () => void;
};

/**
 * Runs an async mutation with guaranteed finally cleanup and dev lifecycle logs.
 */
export async function runMutation<T>(
  scope: string,
  label: string,
  fn: () => Promise<T>,
  hooks?: MutationLifecycleHooks<T>
): Promise<T> {
  actionDebug(scope, `${label} start`);
  hooks?.onStart?.();
  try {
    const result = await fn();
    actionDebug(scope, `${label} success`);
    hooks?.onSuccess?.(result);
    return result;
  } catch (error) {
    actionDebug(scope, `${label} error`, error);
    hooks?.onError?.(error);
    throw error;
  } finally {
    actionDebug(scope, `${label} finally`);
    hooks?.onFinally?.();
  }
}

export function postsSignature(posts: readonly { id: string }[]): string {
  return posts.map((p) => p.id).join("|");
}
