# Drape

A free AI wardrobe app that runs as an installable web app (PWA). Photograph your clothes, and an AI stylist
powered by Claude dresses you from your own closet every day. There's no paywall and no account. Your photos and
data stay on your phone.

## Features

- **Digital closet:** snap or upload many photos at once. Claude names and tags each piece (category, colours,
  pattern, material, seasons, formality, style). Search, filter, favourites, a laundry mode that hides dirty
  pieces from suggestions, a wishlist, and an archive for things you've donated or sold.
- **Outfit of the day:** pick where you're going in plain words (Normal day, A bit nicer, Food out, Outdoors...).
  Picks use what you wore recently, your 👍/👎 and, if you add a city, the forecast. Weather is judged by
  **how it feels to you**: you set where jacket-and-long-pants weather starts and when it's hot, and there's a
  one-tap "used to the heat (Dubai, Gulf)" preset and a strong-AC option. Includes styling tips, "show me more",
  save, share as an image, and log as worn.
- **Stylist memory:** tell it what you like in the "Tell your stylist" box, in the chat (it saves lasting
  preferences itself and shows "📌 Remembered"), or from Today with "Remember this for next time". See and delete
  everything it remembers in the Stylist tab.
- **Notes for your stylist:** standing notes in your style profile ("no shorts to family visits"), plus tips on any
  piece ("can be worn open over a t-shirt like a light jacket"). The stylist follows both.
- **Laundry schedule:** set how often you do laundry (e.g. every 3 days) and when you last did. Tops, dresses and
  gym clothes you wear wait for laundry day; jeans, jackets and shoes can be re-worn but are spread out. Works in
  daily picks, planning, chat and the offline picker; "Laundry done" or "I did laundry today" resets it.
- **Style this piece:** complete looks built around any item.
- **Outfits and planner:** saved looks, an outfit builder, a monthly calendar of what you wore and what's planned,
  and **Plan my week**, which plans seven days around the forecast as it feels to you.
- **Stylist chat:** ask anything and attach photos. Answers show your actual pieces and full outfits.
- **Glow Up:** upload an outfit photo to get a score, what works, fixes, swaps from your closet and finishing
  touches.
- **Outfit Finder:** upload any inspiration photo. See each piece, what you already own that matches, shopping
  searches, and add the rest to your wishlist.
- **Song for my fit:** take a photo of your outfit (or use today's) and get 5 songs that match its vibe for your
  Instagram post, with which part to use, Spotify/YouTube preview links and caption ideas. Remembers your music
  taste.
- **Pack for a trip:** a capsule packing list using the destination's forecast (Open-Meteo, no key needed; the only place weather is used), outfits day by day, and a
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
