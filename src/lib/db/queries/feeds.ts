import { db } from "..";
import { feeds, users } from "../schema";
import { eq, sql } from "drizzle-orm";

export type Feed = typeof feeds.$inferSelect;
export type User = typeof users.$inferSelect;

export type FeedWithUser = {
  feed: Feed;
  user: User;
};

export async function createFeed(
  name: string,
  url: string,
  userId: string,
): Promise<Feed> {
  const [result] = await db
    .insert(feeds)
    .values({ name, url, userId })
    .returning();
  return result;
}

export async function getFeedByURL(url: string): Promise<Feed | undefined> {
  const [result] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, url));
  return result;
}

export async function getFeedsWithUsers(): Promise<FeedWithUser[]> {
  const results = await db
    .select({
      feed: feeds,
      user: users,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));

  return results;
}

export async function markFeedFetched(feedId: string): Promise<void> {
  await db
    .update(feeds)
    .set({
      lastFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, feedId));
}

export async function getNextFeedToFetch(): Promise<Feed | undefined> {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`last_fetched_at ASC NULLS FIRST`)
    .limit(1);
  return result;
}
