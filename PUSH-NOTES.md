# Kryntar — source snapshot

Full source of the Kryntar web app (site, Deep Dive game, server, online leaderboard)
pushed from the live project on 2026-11-14.

## Binary assets (pixel art)

GitHub pushes via the Muse connector can only carry text, so every `.webp`
(pixel gems, diver masters, icon) is stored next to its real location as
`<name>.webp.b64`. Restore the real images once after cloning:

```
node scripts/decode-assets.mjs
```

## Not included (regenerable / runtime data)

- `node_modules/`, build output (`dist/`), and caches — reinstall/rebuild instead.
- `app.db` — the live runtime database (leaderboard scores & play quotas). It is
  data, not source, and stays on the server.
