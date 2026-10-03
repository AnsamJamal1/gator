import { db } from "..";
import { feedFollows, feeds, users } from "../schema";
import { eq, and } from "drizzle-orm";

export type FeedFollow = typeof feedFollows.$inferSelect;

export type FeedFollowWithNames = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  feedId: string;
  userName: string;
  feedName: string;
};

export async function createFeedFollow(
  userId: string,
  feedId: string,
): Promise<FeedFollowWithNames> {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({ userId, feedId })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.id, newFeedFollow.id));

  return result;
}

export async function deleteFeedFollow(
  userId: string,
  feedId: string,
): Promise<void> {
  await db
    .delete(feedFollows)
    .where(
      and(
        eq(feedFollows.userId, userId),
        eq(feedFollows.feedId, feedId),
      ),
    );
}

export async function getFeedFollowsForUser(
  userId: string,
): Promise<FeedFollowWithNames[]> {
  const results = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId));

  return results;
}
