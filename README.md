# Lazy Scroll

Scroll between social media posts with your keyboard. Press **Space** on X, Reddit, Hacker News, Bluesky, Facebook, or Instagram.

## Features

- **Space** → Scroll to next post (top of viewport)
- **Shift + Space** → Scroll to previous post
- Works on **X (Twitter)**, **Reddit** (new + old UI), **Hacker News**, **Bluesky**, **Facebook**, and **Instagram**
- Configurable hotkey and scroll speed via popup (dark mode supported)
- Survives virtualized feeds — tracks the current post by ID, not position
- Extensible architecture — add new platforms easily

## Install (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select this `lazyscroll` folder

## How to Use

1. Go to [x.com](https://x.com), [reddit.com](https://reddit.com), [news.ycombinator.com](https://news.ycombinator.com), [bsky.app](https://bsky.app), [facebook.com](https://facebook.com), or [instagram.com](https://instagram.com)
2. Press **Space** to jump to the next post
3. Press **Shift + Space** to go back
4. Click the Lazy Scroll extension icon to change your hotkey, scroll speed, or disable the extension

## Architecture

```
icons/                   # Toolbar/store icons (icon.svg is the source)
src/
├── content/
│   ├── platforms.js     # Platform registry + shared sticky-header auto-detect
│   ├── base.js          # Shared scroll engine & key listener
│   ├── index.js         # Site router
│   └── sites/
│       ├── x.js         # X (Twitter)
│       ├── reddit.js    # Reddit (new shreddit UI + old.reddit.com)
│       ├── hackernews.js
│       ├── bluesky.js
│       ├── facebook.js
│       └── instagram.js
└── popup/
    ├── popup.html       # Settings UI
    ├── popup.css
    └── popup.js
```

## Adding a New Social Media Platform

1. Create `src/content/sites/<name>.js` implementing the Platform interface:
   - `getPosts()` → `Element[]`
   - `isValidPost(el)` → `boolean`
   - `getPostTop(el)` → `number`
   - `getPostId(el)` → `string|null` *(optional — makes navigation stable on virtualized feeds)*
   - `getHeaderOffset()` → `number` *(return `LazyScroll.detectHeaderOffset()` for sites with sticky headers, or `0`)*
2. Register it in the same file:
   ```js
   global.LazyScroll.register('<domain.com>', MyPlatform);
   ```
3. Add `matches` to `manifest.json` `content_scripts` and `host_permissions`
4. Add the script to `manifest.json` `content_scripts[].js` array (before `base.js`)

No changes needed to `base.js`, `popup/`, or the scroll engine.

## Per-Site Behavior

- **X**: top-level tweets only; skips promoted tweets and nested replies. Works on Home, Profile, and Search.
- **Reddit**: `shreddit-post` elements on the new UI (ads excluded), `.thing.link` rows on old.reddit.com (promoted skipped).
- **Hacker News**: steps through story rows on list pages and comments on item pages.
- **Bluesky**: feed and thread items; virtualization handled via post-ID tracking.
- **Facebook**: top-level news feed posts; skips sponsored posts and nested shared/quoted posts.
- **Instagram**: top-level feed posts; skips sponsored posts and nested overlay content.

## Regenerating Icons

`icons/icon.svg` is the source. To regenerate the PNGs (one-shot, no build step):

```sh
cd icons
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --screenshot=icon128.png --window-size=128,128 --default-background-color=00000000 \
  --hide-scrollbars "file://$PWD/icon.svg"
sips -z 48 48 icon128.png --out icon48.png
sips -z 32 32 icon128.png --out icon32.png
sips -z 16 16 icon128.png --out icon16.png
```
