# our-cp-sugar

English | [中文](README.zh.md)

`our-cp-sugar` is a DSH Web GUI plugin that applies a bundled wallpaper with theme-aware readability scrims, translucent application surfaces, and two animated desktop pets.

## What it does

- Loads through the standard DSH browser-plugin channel declared by `dsh.client.platform: web`.
- Covers the viewport with a fixed, centered wallpaper from `assets/wallpaper.png`, embedded into `lib/client.js` during build.
- Adds a persisted 0-100% lightening slider: 0% keeps the artwork unchanged and higher values make it lighter.
- Adds a persisted 100-300% saturation slider: 100% keeps the current artwork appearance and higher values make it more vivid.
- Adds custom wallpaper upload: after choosing an image, users can drag to pan and use a zoom slider to compose the 16:9 crop before it is rendered at a display-scaled resolution (up to about 3840×2160), persisted locally, and reset back to the bundled wallpaper.
- Displays the transparent animations from `assets/desk-pet.png` (哥伦比娅) and `assets/desk-pet-2.gif` (桑多涅) in the lower-right corner; each pet can be dragged and persists its position locally.
- Clicking 哥伦比娅 shows “早上好，桑多涅～”; clicking 桑多涅 shows “你要干嘛，哥伦比娅 ? !”.
- The settings panel provides an independent show/hide switch and 100-360px size slider for each pet. Both settings persist locally.
- Each pet has an editable personality prompt persisted locally and used as the base role prompt for its interaction session.
- Hovering over a pet shows an “Interact” button; clicking it starts a conversation led by that pet. The two pets take turns in independent sessions using their personality prompts for at most ten rounds; the completed transcript is saved locally and can be expanded or deleted from settings.
- Switches between light and dark readability scrims when `data-ds-dark-theme` changes.
- Honors the Skin Center `--dsw-skin-scrim` variable when that plugin is installed.
- Restores the previous body background and removes its scoped theme attribute when unloaded.

## Install

### Build and install locally

```sh
cd our-cp-sugar
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

Restart or refresh the DSH Web GUI after installation.

## Config

Wallpaper lightening defaults to 0%. Saturation defaults to 100% and can be increased to 300%. The DSH settings panel includes independent show/hide switches and size sliders for 哥伦比娅 and 桑多涅. To replace the image, overwrite `assets/wallpaper.png` and rebuild. Skin Center background opacity continues to work through `--dsw-skin-scrim`.

## Known limitations

- Custom wallpapers are resized in-browser and stored in `localStorage`, so the browser may limit how large a single image can be stored.
- The transparency layer relies on the current DSH theme-token names.
- The bundled image was supplied for private use and is not licensed for redistribution by this package.
- Pet interaction uses the browser DSH session runtime; if the runtime connection is unavailable, the interaction is skipped without affecting the main chat.

## License

UNLICENSED. This is a private local-use package.
