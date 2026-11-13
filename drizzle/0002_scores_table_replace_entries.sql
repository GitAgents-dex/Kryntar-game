DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  pearls INTEGER NOT NULL,
  wallet TEXT,
  season TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
