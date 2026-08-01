# 问情播客 AskingLove — website

Static site for [askinglove.com](https://askinglove.com), built with [Astro](https://astro.build).

## Stack

- Astro 5 + Preact islands
- Tailwind CSS v4
- Episode catalog fetched from the RSS feed at **build time**
- Deployed via GitHub Pages (`askinglove.github.io`)

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # production build (requires network for RSS)
npm run preview  # preview dist/
```

## Episodes (RSS sync)

Source of truth:

`https://media.rss.com/askinglove/feed.xml`

On every `npm run build`, `src/lib/rss.ts` fetches and parses the feed, merges `src/data/episode-overrides.json`, and generates static routes under `/episodes/{rssId}/`.

No separate commit of generated episode files is required — CI/build regenerates the catalog.

### Fully automatic when you publish on RSS.com

The site is static (no live poll in the browser). **GitHub Actions is the RSS reader + content worker:**

| Cadence | What happens |
|---|---|
| **Every 2 hours** | Fingerprint feed. If unchanged → skip. If new/changed → full pipeline. |
| **Feed changed** | 1) Sync Spotify/Apple deep links 2) Whisper-transcribe **missing** episodes → 正文 + `.srt` 3) Commit to `main` 4) Build + deploy |
| **Push to main** | Rebuild + deploy; refresh store links (skip Whisper unless manual run) |
| **Actions → Run workflow** | Force full enrich + deploy |

After you hit publish on RSS.com, within ~**0–2 hours** the site should show the new episode, deep links, 阅读全文, and captions in the repo.

**Still manual (by design):** uploading the `.srt` to YouTube Studio, and pasting the short YT description (`npm run transcript:youtube -- {id}`). YouTube has no unattended upload API in this pipeline.

Optional secrets (improve Spotify matching):

- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `PUBLIC_GA_ID`

### Overrides

Edit `src/data/episode-overrides.json` keyed by RSS episode id:

```json
{
  "2664929": {
    "slug": "dark-crush",
    "tags": ["暗恋", "单相思", "放不下"],
    "featured": true,
    "hook": "optional custom summary",
    "transcript": "optional full text",
    "setup": "optional 2–4 sentence story setup",
    "concept": "沉没成本",
    "takeaways": ["要点一", "要点二", "要点三"],
    "reflection": "想一想的问题？"
  }
}
```

- `slug` aliases redirect to the canonical numeric URL (see `astro.config.mjs` redirects).
- Without override tags, keywords in `src/data/episode-tags.ts` auto-tag episodes.
- Show notes are built for **every** episode (`src/lib/show-notes.ts`): feed setup + concept detection + reflection by tag; override fields polish individual eps.
- Share UI: copy episode link, copy full notes text, share show, submit.
- Feed text is normalized to **简体中文** at parse time (`src/lib/zh.ts` / OpenCC) so mixed 繁体 forms (隱瞞、願意、該…) do not appear on the site.

### Start Here pack

Curated homepage pack: `src/data/start-here.ts` (list of RSS ids).

## Show config

`src/data/show.ts` — name, host (小问), feed, cover, Substack.

## 正文 / YouTube（one source of truth）

Full reading text (~1,200+ 字) lives in:

`src/data/transcripts/{rssId}.md`

| Surface | URL / output |
|---|---|
| Episode page | `/episodes/{id}/` → **阅读全文** |
| 正文 page | `/episodes/{id}/transcript/` |
| YT description | short + link (`npm run transcript:youtube -- {id}`) |
| YT captions | `.srt` / `.vtt` (`npm run transcript:srt -- {id}`) |

```bash
npm run transcript:new -- 2664929   # scaffold
# edit the .md to 1200+ 字简体
npm run transcript:srt -- 2664929   # exports/youtube/2664929.srt
npm run transcript:youtube -- 2664929
```

Do **not** paste the full 正文 into the YouTube description box.

## Platforms / social

`src/data/platforms.ts` — Spotify, Apple Podcasts, YouTube, RSS.com + Instagram/Threads/YouTube footer links.

### Per-episode store deep links

`src/data/episode-store-links.json` maps RSS episode id → Apple / Spotify episode URLs.

```bash
npm run sync:store-links
```

- **Apple:** always via public iTunes Lookup API.
- **Spotify:** best with `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` (client credentials). Without them, the script uses an embed token + search (rate-limited).

Episode pages prefer deep links (“打开本集”); if missing, they fall back to the show page.

## Analytics

GA4 loads **only** when `PUBLIC_GA_ID` is set to a real id (`G-…`) in the build environment. Placeholder IDs are never shipped.

## Submit form

`src/components/SubmitForm.tsx` posts to Formspree (`https://formspree.io/f/mjgpynwd`). Optional email for “成片后通知”. Stories are never rendered publicly.

## Notes

- Canonical episode URLs use the RSS.com numeric id (stable, already indexed).
- `/episodes/dark-crush` → redirect to `/episodes/2664929`.
- AI disclosure is show-level only (About + show description), not per-episode walls of text.
- Do not invent 小宇宙 / 喜马拉雅 links until real show pages exist.
