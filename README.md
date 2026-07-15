# LazyScroll

Scroll between social media posts with your keyboard. Start with **Space** on X (Twitter).

## Features

- **Space** → Scroll to next post (top of viewport)
- **Shift + Space** → Scroll to previous post
- Configurable hotkey via popup
- Extensible architecture — add new platforms easily

## Install (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select this `lazyscroll` folder

## How to Use

1. Go to [x.com](https://x.com) or [twitter.com](https://twitter.com)
2. Press **Space** to jump to the next top-level tweet
3. Press **Shift + Space** to go back
4. Click the LazyScroll extension icon to change your hotkey or disable the extension

## Architecture

```
src/
├── content/
│   ├── base.js          # Shared scroll engine & key listener
│   ├── platforms.js     # Platform registry (domain → module)
│   ├── index.js         # Site router
│   └── sites/
│       └── x.js         # X (Twitter) post detector
├── popup/
│   ├── popup.html       # Settings UI
│   ├── popup.css
│   └── popup.js
└── background.js        # Service worker
```

## Adding a New Social Media Platform

1. Create `src/content/sites/<name>.js` implementing the Platform interface:
   - `getPosts()` → `Element[]`
   - `isValidPost(el)` → `boolean`
   - `getPostTop(el)` → `number`
2. Register it in `src/content/sites/<name>.js`:
   ```js
   global.LazyScroll.register('<domain.com>', MyPlatform);
   ```
3. Add `matches` to `manifest.json` `content_scripts`
4. Add the script to `manifest.json` `content_scripts[].js` array

No changes needed to `base.js`, `popup/`, or the scroll engine.

## X (Twitter) Behavior

- Detects **top-level tweets only** in the main timeline
- Skips promoted tweets and reply threads nested under other tweets
- Works across Home, Profile, and Search pages
