/**
 * Feed domain — posts, social, publish pipeline.
 */

export { FeedPostsProvider, useFeedPosts } from "@/contexts/feed-posts-context";
export { SavedPostsProvider, useSavedPosts } from "@/contexts/saved-posts-context";
export type { UiFeedPost, FirestorePost, OptimisticFeedUpload } from "@/models/feed-post";
export {
  subscribeFeedPosts,
  createFeedPostWithMedia,
  deleteFeedPost,
} from "@/services/feed-posts";
export { validateFeedImageFiles } from "@/lib/feed-publish";
export { usePostSocial } from "@/hooks/use-post-social";
