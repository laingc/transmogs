# Afterglow: WoW weapon illusion gallery

## [Open the gallery at wow-afterglow.github.io/transmogs](https://wow-afterglow.github.io/transmogs/)

A searchable World of Warcraft gallery with **90 weapon illusions**, **271 pictures**, and **68 legacy recipe references**.

Find a weapon illusion by color, effect, or acquisition source. Compare pictures. Save your favorites in your browser.

## Use the gallery

- Search by name, tag, or acquisition source.
- Select color and effect tags, such as `gold`, `lightning`, `frost`, or `smoke`.
- Select **All tags** for an intersection or **Any tag** for a union.
- Sort by name, color tag, effect tag, visual strength, or acquisition source.
- Click a picture to open the viewer.
- Use the arrow keys to change pictures. Press **Esc** to close the viewer.
- Click the heart to save an illusion in this browser.
- Bookmark the URL to preserve filters and the current picture.
- Expand **Legacy recipe index** to search older enchant names and documented glow descriptions.

## Coverage and sources

The main gallery covers all 90 visible illusions in Warcraft Wiki's list, collected on September 29, 2026.
It excludes **Hide Weapon Enchant** and includes subtle coatings for comparison.

Each illusion has at least three pictures. Pictures include reference screenshots and distinct frames from preview videos.
Several frames can come from the same video. Historical previews can differ from current game effects.

The legacy index lists older recipes from the Weapon glow chart. It contains text references, without a separate picture collection.
This gallery does not claim complete coverage of every stat enchant or temporary imbue across all WoW editions.

Primary references:

- [Warcraft Wiki: Illusion](https://warcraft.wiki.gg/wiki/Illusion)
- [Warcraft Wiki: Weapon glow](https://warcraft.wiki.gg/wiki/Weapon_glow)

Each picture includes its creator credit and a source link. Video links include the frame timestamp.
Color, effect, and visual-strength tags are editorial descriptions.
Acquisition restrictions come from the reference list. They do not represent live availability checks.

Game imagery belongs to Blizzard Entertainment. Warcraft Wiki text uses the [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/).
This is an unofficial gallery for personal use.

## Run locally

Open `index.html` in a modern browser. The gallery works offline without installation.

For a local web address, run:

```sh
npm start
```

Then open **http://localhost:4173**. Node.js is the only server requirement.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Gallery interface |
| `data.js` | Catalogue, tags, picture credits, and source links |
| `assets/images/` | Local WebP pictures |
| `research/catalogue-source.json` | Source catalogue before visual tags |
| `research/tags.txt` | Editable visual tags |
| `research/video-selections.json` | Reviewed video timestamps |
| `scripts/` | Collection, extraction, and catalogue generation |

## Run checks

```sh
npm install
npx playwright install chromium
npm test
```

The browser checks cover image decoding, filters, sorting, saved entries, picture navigation, mobile layout, and direct offline use.

## Rebuild the data

The research scripts need Python, Pillow, Beautiful Soup, Requests, FFmpeg, and yt-dlp.
The gallery itself needs none of these tools.

With the source videos available in `research/`, run:

```sh
python3 scripts/collect.py
python3 scripts/curate_videos.py
python3 scripts/extract_frames.py
python3 scripts/build_data.py
```

Source videos use the filename `research/video-VIDEO_ID.mp4`, `.webm`, or `.mkv`.
The matching metadata file uses `research/video-VIDEO_ID.info.json`.
The selected video IDs appear in `research/video-selections.json`.

If the source list changes, review new entries and add their tags and pictures before regeneration.
If you change a timestamp, remove that entry's generated video picture before extraction.
