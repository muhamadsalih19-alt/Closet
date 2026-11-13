# Drape

A free AI wardrobe app that runs as an installable web app (PWA). Photograph your clothes, and an AI stylist
powered by Claude dresses you from your own closet every day. There's no paywall and no account. Your photos and
data stay on your phone.

## Features

- **Digital closet:** snap or upload many photos at once. Claude names and tags each piece (category, colours,
  pattern, material, seasons, formality, style). Search, filter, favourites, a laundry mode that hides dirty
  pieces from suggestions, a wishlist, and an archive for things you've donated or sold.
- **Outfit of the day:** picks matched to the live forecast (Open-Meteo, no key needed), your occasion, what you
  wore recently and your 👍/👎 taste feedback. Includes styling tips, "show me more", save, share as an image, and
  log as worn.
- **Style this piece:** complete looks built around any item.
- **Outfits and planner:** saved looks, an outfit builder, a monthly calendar of what you wore and what's planned,
  and **Plan my week**, which plans seven days around the forecast.
- **Stylist chat:** ask anything and attach photos. Answers show your actual pieces and full outfits.
- **Glow Up:** upload an outfit photo to get a score, what works, fixes, swaps from your closet and finishing
  touches.
- **Outfit Finder:** upload any inspiration photo. See each piece, what you already own that matches, shopping
  searches, and add the rest to your wishlist.
- **Pack for a trip:** a capsule packing list using the destination's forecast, outfits day by day, and a
  checklist.
- **Insights:** usage %, most worn, cost per wear, never-worn pieces, category and colour breakdowns, and an AI
  **closet audit** (gaps to fill, pieces to let go, new ways to wear neglected items).
- **Style profile:** a quiz on first launch, editable later.
- **Backup and restore:** a single JSON file with your photos, which never includes your API key.

With no API key, a simple offline picker still suggests outfits so the app is usable from day one.

## The AI

Add a Claude API key in **Me → Settings** (create one at platform.claude.com). You pay Anthropic per use, usually
cents a day. The key is stored only on the device. The default model is Claude Opus 5.5; Sonnet 5.5 and Haiku 5.5
are cheaper options. Opus and Sonnet requests turn on server-side fallback, so a request one model declines is
retried on another.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/closet/
npm run build      # outputs dist/
npm run icons      # regenerate app icons
```

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. It takes effect once
this folder is the root of its own repo; the base path follows the repo name automatically. In the repo, enable
**Settings → Pages → Source: GitHub Actions**.
