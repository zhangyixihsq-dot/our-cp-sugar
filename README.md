# our-cp-sugar

English | [中文](README.zh.md)

A DSH Web GUI plugin that makes your two favorite characters ship themselves.

You just watch; they do the acting. Customize the backdrop, the character looks, and their personalities, then hit **Interact** and let them flirt, bicker, or write the scene themselves.

> Pure browser plugin: the host entry is a no-op and all the magic lives in the client bundle.

## What it does

### Set the stage (wallpaper)

- Covers the viewport with the bundled `assets/wallpaper.png` as their stage.
- Adds a persisted **Lighten** slider (0–100%, default 0%) so the text stays readable while the drama stays pretty.
- Adds a persisted **Saturation** slider (100–300%, default 100%) to go from "soft filter" to "full technicolor".
- Supports **custom wallpaper upload** with an interactive crop: drag to pan, zoom to frame the shot, then confirm. Output is rendered at display-scaled resolution (up to about 3840×2160) and persisted locally, with a one-click reset.
- Switches between light and dark scrims with `data-ds-dark-theme`.
- Honors the Skin Center `--dsw-skin-scrim` variable when that plugin is installed.

### The two leads (desktop pets)

- Keeps two draggable characters parked in the lower-right corner:
  - 哥伦比娅 (`assets/desk-pet.png`) — the cool, mysterious one
  - 桑多涅 (`assets/desk-pet-2.gif`) — the blunt, lazy, secretly caring one
- They peek at host model activity through `/api/yixi-custom-pet/state`: 哥伦比娅 reacts to turn starts and 桑多涅 to turn ends.
- Click a character and it says a short in-character line.
- The **Desktop pet** settings section gives each character:
  - Show/hide toggle
  - Size slider (100–360px)
  - Inline **name** editing via a pencil icon
  - **Image/GIF** replacement (stored as a Blob in IndexedDB, up to 30MB, with preview and reset)
  - Editable **personality prompt**
- Visibility, size, position, name, and personality all persist locally.

### Auto shipping (interaction)

- Hovering a character reveals an **Interact** button.
- Click it and that character opens the conversation.
- Each character gets its own session and uses its personality prompt as the base persona.
- They alternate for at most **10 short, dialogue-only turns**, with a pause so you can actually read the scene.
- Finished transcripts are saved locally and can be expanded, deleted, or cleared from settings.

## Install

### Install from npm (recommended)

```sh
dsh plugin --profile web add @zyixi/our-cp-sugar
```

Then restart or hard-refresh the DSH Web GUI:

- macOS: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

### Build from source (for development)

```sh
cd our-cp-sugar
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

## Usage

```sh
# Start the web UI
dsh web
```

Then open DSH settings:

- **Wallpaper** — upload or adjust the background, lightening, and saturation.
- **Desktop pet** — edit each character's name, image/GIF, personality, visibility, and size.

Hover over a pet and click **Interact** to start the auto-shipping conversation.

## Uninstall

```sh
dsh plugin --profile web remove @zyixi/our-cp-sugar
```

Then restart or hard-refresh the DSH Web GUI.

> Uninstalling removes the plugin but does not clear browser-side data already stored for the DSH site (wallpaper, pet names, images, and interaction records). Clear the site data in your browser if you want a full reset.

## Development

```sh
pnpm typecheck
pnpm test
pnpm build
# edit and watch
pnpm watch
```

## Where the props are stored

- Wallpaper lightening, saturation, and custom wallpaper data URL: `localStorage`
- Pet visibility, size, position, name, and personality: `localStorage`
- Interaction transcripts: `localStorage`
- Pet image/GIF files: `IndexedDB` (`our-cp-sugar` / `pet-images`)

## Replacing bundled assets

To swap the default artwork, replace the files in `assets/` and rebuild:

- `assets/wallpaper.png`
- `assets/desk-pet.png`
- `assets/desk-pet-2.gif`

The build embeds them into `lib/client.js`.

## Project structure

```text
src/index.ts                           host-side no-op entry
src/client/index.ts                     browser entry point
src/client/background-controller.ts     stage layers and persistence
src/client/BackgroundSettingsSection.tsx
src/client/wallpaper-upload.ts          crop/resize logic
src/client/desk-pet-controller.ts       pet rendering, drag, settings, image storage
src/client/pet-interaction.ts           the auto-shipping conversation engine
src/client/PetSettingsSection.tsx
src/pet-state.ts                        activity-state helper
assets/
tests/
```

## Known limitations

- Custom wallpaper is stored as a data URL in `localStorage`, so very large outputs may hit browser quota limits.
- Pet images are stored in IndexedDB and are limited to 30MB per upload — larger than that is a feature film, not an avatar.
- The translucent UI relies on the current DSH theme-token names.
- Pet interaction requires the browser DSH session runtime; if it is unavailable, the scene is skipped without affecting the main chat.
- Bundled images are supplied for private use and are not licensed for redistribution.

## License

UNLICENSED. Your private shipping warehouse, for local use only.
