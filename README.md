# Gator 

A multi-user CLI RSS feed aggregator written in TypeScript. Gator fetches RSS feeds from across the internet, stores the posts in a PostgreSQL database, and lets you browse the latest content right in your terminal.

## What is Gator?

Gator is a command-line tool that:
-  Adds RSS feeds from across the internet
-  Manages multiple users on a single machine
-  Follows/unfollows feeds (many-to-many relationships)
-  Fetches posts from feeds in a continuous loop
-  Browses the latest posts from feeds you follow
-  Stores everything in a PostgreSQL database

## Prerequisites

Before you can run gator, you will need:

- **Node.js** (v22.15.0 or later) - install via NVM
- **PostgreSQL** (v14 or later) - running locally on port 5432
- **npm** (comes with Node.js)
- **TypeScript** (installed as a dev dependency)

### On Windows

You must use WSL 2 (Windows Subsystem for Linux). Gator uses Unix-style paths and processes that do not work well with native Windows.

## Installation

1. Clone the repository:

   git clone https://github.com/AnsamJamal1/gator.git
   cd gator

2. Install dependencies:

   npm install

3. Set up the database:

   sudo service postgresql start
   sudo -u postgres psql
   -- In psql:
   CREATE DATABASE gator;
   ALTER USER postgres PASSWORD 'postgres';
   \q

4. Run the migrations:

   npm run migrate

5. Set up the config file:

   Create ~/.gatorconfig.json in your home directory:

   {
     "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
   }

## Usage

Gator is a multi-user CLI. All commands start with:

   npm run start <command> [args...]

### User Management

| Command | Description |
|---------|-------------|
| register <name> | Create a new user and log in as them |
| login <name> | Log in as an existing user |
| users | List all users (current user marked with (current)) |
| reset | Delete all users (useful for testing) |

Example:

   npm run start register ansam
   npm run start login ansam
   npm run start users

### Feed Management

| Command | Description |
|---------|-------------|
| addfeed <name> <url> | Add an RSS feed and auto-follow it |
| feeds | List all feeds in the database |
| follow <url> | Follow an existing feed |
| following | List feeds you are following |
| unfollow <url> | Unfollow a feed |

Example:

   npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"
   npm run start feeds
   npm run start following

### Posts

| Command | Description |
|---------|-------------|
| browse [limit] | Show latest posts from feeds you follow (default: 2) |

Example:

   npm run start browse        # Show 2 latest posts
   npm run start browse 10     # Show 10 latest posts

### Aggregator

| Command | Description |
|---------|-------------|
| agg <duration> | Fetch feeds continuously |

Duration format: 30s, 1m, 1h, 500ms, etc.

Example:

   npm run start agg 1m        # Fetch every 1 minute
   # Press Ctrl+C to stop

Warning: Do NOT use short durations (like 1s). Be respectful to the servers hosting the RSS feeds.

## How It Works

1. addfeed adds a feed to the database and creates a feed_follows record for you
2. agg runs in a loop, fetching the oldest feed (by last_fetched_at), parsing its RSS, and saving new posts
3. browse queries posts from feeds you follow, ordered by published_at (newest first)
4. follow creates a many-to-many relationship between users and feeds

## Database Schema

- users - User accounts (id, name, timestamps)
- feeds - RSS feeds (id, name, url, user_id, last_fetched_at, timestamps)
- feed_follows - Many-to-many user-feed relationships
- posts - Individual posts (id, title, url, description, published_at, feed_id, timestamps)

## Recommended RSS Feeds

Try adding some of these:
- Hacker News: https://news.ycombinator.com/rss
- Lane's Blog: https://www.wagslane.dev/index.xml
- TechCrunch: https://techcrunch.com/feed/
- Ars Technica: https://feeds.arstechnica.com/arstechnica/index

## Tech Stack

- TypeScript - Programming language
- Node.js - Runtime
- PostgreSQL - Database
- Drizzle ORM - Type-safe SQL query builder
- fast-xml-parser - RSS/XML parsing
- tsx - TypeScript execution

## Troubleshooting

### "No user is logged in"
Run npm run start register <name> or npm run start login <name> first.

### "Feed <url> does not exist"
The feed must be added by someone before you can follow it. Run addfeed first.

### ETIMEDOUT errors
Network issues or rate limiting. Try a longer agg duration (like 5m).

### "password authentication failed"
Update your .gatorconfig.json with the correct PostgreSQL credentials.

## License

MIT - feel free to use and modify.
