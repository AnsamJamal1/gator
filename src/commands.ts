import { getPostsForUser } from "./lib/db/queries/posts.js";
import { createPost } from "./lib/db/queries/posts.js";
import { readConfig, setUser } from "./config.js";
import {
  createUser,
  getUserByName,
  deleteUsers,
  getUsers,
} from "./lib/db/queries/users.js";
import {
  createFeed,
  getFeedByURL,
  getFeedsWithUsers,
  markFeedFetched,
  getNextFeedToFetch,
} from "./lib/db/queries/feeds.js";
import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "./lib/db/queries/feedFollows.js";
import { fetchFeed } from "./lib/rss.js";
import type { Feed } from "./lib/db/queries/feeds.js";
import type { User } from "./lib/db/schema.js";

// ==================== TYPES ====================

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

// ==================== HELPERS ====================

function printFeed(feed: Feed, user: User): void {
  console.log(`* ${feed.name}`);
  console.log(`  URL: ${feed.url}`);
  console.log(`  User: ${user.name}`);
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) {
    throw new Error("Invalid duration format");
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("Invalid duration unit");
  }
}

// ==================== MIDDLEWARE ====================

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const cfg = readConfig();
    if (!cfg.currentUserName) {
      throw new Error("No user is logged in");
    }
    const user = await getUserByName(cfg.currentUserName);
    if (!user) {
      throw new Error(`User ${cfg.currentUserName} not found`);
    }
    await handler(cmdName, user, ...args);
  };
}

// ==================== REGISTRY ====================

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

// ==================== BASIC HANDLERS ====================

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("Username is required");
  }
  const userName = args[0];
  const existingUser = await getUserByName(userName);
  if (!existingUser) {
    throw new Error(`User ${userName} does not exist`);
  }
  const cfg = readConfig();
  setUser(cfg, userName);
  console.log(`User set to ${userName}`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("Username is required");
  }
  const userName = args[0];
  const existingUser = await getUserByName(userName);
  if (existingUser) {
    throw new Error(`User ${userName} already exists`);
  }
  const newUser = await createUser(userName);
  const cfg = readConfig();
  setUser(cfg, userName);
  console.log(`User ${userName} created successfully`);
  console.log(newUser);
}

export async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteUsers();
  console.log("Database reset successfully");
}

export async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const allUsers = await getUsers();
  const cfg = readConfig();
  const currentUserName = cfg.currentUserName;

  for (const user of allUsers) {
    if (user.name === currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

// ==================== AGG HANDLERS ====================

async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds to fetch");
    return;
  }

  console.log(`Fetching feed: ${feed.name}`);
  const rssFeed = await fetchFeed(feed.url);
  await markFeedFetched(feed.id);

  let saved = 0;
  let skipped = 0;

  for (const item of rssFeed.channel.item) {
    let publishedAt: Date | null = null;
    if (item.pubDate) {
      const parsed = new Date(item.pubDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    try {
      await createPost({
        title: item.title,
        url: item.link,
        description: item.description || null,
        publishedAt,
        feedId: feed.id,
      });
      saved++;
    } catch (err) {
      skipped++;
    }
  }

  console.log(`  Saved ${saved} new posts (${skipped} skipped)`);
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("Time between requests is required");
  }

  const timeBetweenRequests = parseDuration(args[0]);
  console.log(`Collecting feeds every ${args[0]}`);

  scrapeFeeds().catch((err) => console.error(err));

  const interval = setInterval(() => {
    scrapeFeeds().catch((err) => console.error(err));
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

// ==================== FEED HANDLERS ====================

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("Name and URL are required");
  }
  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);
  const follow = await createFeedFollow(user.id, feed.id);

  printFeed(feed, user);
  console.log(`Feed ${follow.feedName} followed by ${follow.userName}`);
}

export async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const feedsWithUsers = await getFeedsWithUsers();

  for (const { feed, user } of feedsWithUsers) {
    console.log(`* ${feed.name}`);
    console.log(`  URL: ${feed.url}`);
    console.log(`  User: ${user.name}`);
    console.log();
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("URL is required");
  }
  const url = args[0];

  const feed = await getFeedByURL(url);
  if (!feed) {
    throw new Error(`Feed ${url} does not exist`);
  }

  const follow = await createFeedFollow(user.id, feed.id);
  console.log(`Feed: ${follow.feedName}`);
  console.log(`User: ${follow.userName}`);
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("URL is required");
  }
  const url = args[0];

  const feed = await getFeedByURL(url);
  if (!feed) {
    throw new Error(`Feed ${url} does not exist`);
  }

  await deleteFeedFollow(user.id, feed.id);
  console.log(`Unfollowed ${feed.name}`);
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 2;

  if (args.length > 0) {
    const parsed = parseInt(args[0], 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error("Limit must be a positive integer");
    }
    limit = parsed;
  }

  const userPosts = await getPostsForUser(user.id, limit);

  if (userPosts.length === 0) {
    console.log("No posts found. Try following a feed first!");
    return;
  }

  for (const post of userPosts) {
    console.log(`* ${post.title}`);
    console.log(`  URL: ${post.url}`);
    if (post.description) {
      console.log(`  ${post.description.substring(0, 100)}...`);
    }
    if (post.publishedAt) {
      console.log(`  Published: ${post.publishedAt.toISOString()}`);
    }
    console.log();
  }
}
