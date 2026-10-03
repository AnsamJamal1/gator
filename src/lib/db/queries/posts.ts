import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../index.js";
import { posts, feedFollows } from "../schema.js";

export type Post = typeof posts.$inferSelect;

export type NewPost = {
  title: string;
  url: string;
  description: string | null;
  publishedAt: Date | null;
  feedId: string;
};

export async function createPost(post: NewPost): Promise<Post | undefined> {
  const [result] = await db.insert(posts).values(post).returning();
  return result;
}

export async function getPostsForUser(
  userId: string,
  limit: number = 2,
): Promise<Post[]> {
  const follows = await db
    .select({ feedId: feedFollows.feedId })
    .from(feedFollows)
    .where(eq(feedFollows.userId, userId));

  if (follows.length === 0) {
    return [];
  }

  const feedIds = follows.map((f) => f.feedId);

  const results = await db
    .select()
    .from(posts)
    .where(inArray(posts.feedId, feedIds))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return results;
}
