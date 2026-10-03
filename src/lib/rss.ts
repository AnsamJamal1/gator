import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  // 1. Fetch
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const xmlString = await response.text();

  // 2. Parse
  const parser = new XMLParser({
    processEntities: false,
  });
  const parsed = parser.parse(xmlString);

  // 3. Verify channel
  const channel = parsed?.rss?.channel;
  if (!channel) {
    throw new Error("Invalid RSS feed: no channel");
  }

  // 4. Extract metadata
  const title = channel.title;
  const link = channel.link;
  const description = channel.description;

  if (
    typeof title !== "string" ||
    typeof link !== "string" ||
    typeof description !== "string"
  ) {
    throw new Error("Invalid RSS feed: missing channel metadata");
  }

  // 5. Extract items
  let items: any[] = [];
  if (channel.item) {
    if (Array.isArray(channel.item)) {
      items = channel.item;
    } else {
      items = [channel.item];
    }
  }

  // 6. Filter and map items
  const rssItems: RSSItem[] = [];
  for (const item of items) {
    if (
      typeof item.title !== "string" ||
      typeof item.link !== "string" ||
      typeof item.description !== "string" ||
      typeof item.pubDate !== "string"
    ) {
      continue;
    }
    rssItems.push({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
    });
  }

  // 7. Return
  return {
    channel: {
      title,
      link,
      description,
      item: rssItems,
    },
  };
}
